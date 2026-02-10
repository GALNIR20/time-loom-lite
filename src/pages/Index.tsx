import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { parseISO, format, addDays, differenceInDays } from 'date-fns';
import { ControlsPanel } from '@/components/ControlsPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { MilestoneTable } from '@/components/MilestoneTable';
import { JsonExportModal } from '@/components/JsonExportModal';
import { TimelineView } from '@/components/TimelineView';
import { ProjectCompareView } from '@/components/ProjectCompareView';
import { MondayExportModal } from '@/components/MondayExportModal';
import { SavedProject } from '@/components/ProjectSidebar';
import { SprintManager } from '@/components/SprintManager';
import { ProjectActivityLog } from '@/components/ProjectActivityLog';
import { calculateTimeline, getPresetDuration, getTodayISO, createSprintMilestone, getSprintDuration } from '@/lib/timeline';
import { TimelineExport, PresetType, MilestoneConfig } from '@/types/timeline';
import { PredictorLogo } from '@/components/PredictorLogo';
import { MilestoneChecklistDialog } from '@/components/MilestoneChecklistDialog';
import { getItemIdsForMilestone } from '@/hooks/useChecklistSettings';
import { useProjects } from '@/hooks/useProjects';
import { logActivity } from '@/hooks/useProjectActivity';
import { useMilestoneSettings } from '@/hooks/useMilestoneSettings';

// Calculate days before a given milestone for a given preset and overrides
function calculateDaysBeforeMilestone(milestoneId: string, presetType: PresetType, overrides: Record<string, number | null>, milestoneConfigs: MilestoneConfig[], customPresetConfigs?: Record<PresetType, Record<string, number>>): number {
  const targetIndex = milestoneConfigs.findIndex(m => m.id === milestoneId);
  if (targetIndex === -1) return 0;
  return milestoneConfigs.slice(0, targetIndex).reduce((sum, config) => {
    const overrideDays = overrides[config.id] ?? null;
    const duration = getPresetDuration(config.id, presetType, overrideDays, customPresetConfigs);
    return sum + duration;
  }, 0);
}

// Encode multiple locked milestones for persistence (backward compatible)
// Format: "id1|date1;id2|date2;..." or null if empty
function encodeLocks(locks: Record<string, string>): string | null {
  const entries = Object.entries(locks);
  if (entries.length === 0) return null;
  return entries.map(([id, date]) => `${id}|${date}`).join(';');
}

// Decode locked milestones from persistence
// Handles: null, old single "date" format, old single "id|date" format, new multi "id|date;id|date" format
function decodeLocks(value: string | null): Record<string, string> {
  if (!value) return {};
  // New multi-lock format: "id1|date1;id2|date2"
  if (value.includes(';')) {
    const result: Record<string, string> = {};
    value.split(';').forEach(part => {
      const pipeIdx = part.indexOf('|');
      if (pipeIdx > 0) {
        result[part.slice(0, pipeIdx)] = part.slice(pipeIdx + 1);
      }
    });
    return result;
  }
  // Old single lock format: "id|date"
  if (value.includes('|')) {
    const pipeIdx = value.indexOf('|');
    return { [value.slice(0, pipeIdx)]: value.slice(pipeIdx + 1) };
  }
  // Backward compat: old format was just a date string for I-Phase
  return { 'i-phase': value };
}

// Adjust overrides so that locked milestone dates are maintained.
// Instead of moving project start, this adjusts the duration of the nearest
// preceding unlocked milestone to absorb the difference.
// changedMilestoneId: if provided, this milestone's duration won't be adjusted
//   (because the user just changed it — adjust an earlier one instead).
function enforceLockedDates(
  locks: Record<string, string>,
  configs: MilestoneConfig[],
  overrides: Record<string, number | null>,
  projectStart: string,
  presetType: PresetType,
  customPresetConfigs?: Record<PresetType, Record<string, number>>,
  changedMilestoneId?: string
): Record<string, number | null> {
  if (Object.keys(locks).length === 0) return overrides;
  const adjusted = { ...overrides };

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const lockedDate = locks[config.id];
    if (!lockedDate) continue;
    if (i === 0) continue; // first milestone starts at project start, can't adjust

    // Calculate current start date of this milestone with (possibly already adjusted) overrides
    let totalDays = 0;
    for (let j = 0; j < i; j++) {
      totalDays += getPresetDuration(configs[j].id, presetType, adjusted[configs[j].id] ?? null, customPresetConfigs);
    }
    const expectedDays = differenceInDays(parseISO(lockedDate), parseISO(projectStart));
    let diff = totalDays - expectedDays; // positive = milestone is too late, negative = too early
    if (diff === 0) continue;

    // Walk backward from immediately preceding milestone to find one to adjust
    for (let j = i - 1; j >= 0 && diff !== 0; j--) {
      // Skip the milestone the user just changed
      if (changedMilestoneId && configs[j].id === changedMilestoneId) continue;
      // Skip locked milestones (their dates are sacred too)
      if (locks[configs[j].id]) continue;

      const curDuration = getPresetDuration(configs[j].id, presetType, adjusted[configs[j].id] ?? null, customPresetConfigs);
      const newDuration = Math.max(0, curDuration - diff);
      const actualAdjustment = curDuration - newDuration;
      adjusted[configs[j].id] = newDuration;
      diff -= actualAdjustment;
    }
  }
  return adjusted;
}

const Index = () => {
  const { projects, createProject, updateProject, isProjectOwner } = useProjects();
  const { getMilestoneConfigs, getPresetConfigs } = useMilestoneSettings();
  const milestoneDefaults = useMemo(() => getMilestoneConfigs(), [getMilestoneConfigs]);
  const presetConfigs = useMemo(() => getPresetConfigs(), [getPresetConfigs]);
  
  const [featureName, setFeatureName] = useState('');
  const [isFeatureNameSet, setIsFeatureNameSet] = useState(false);
  const [projectStart, setProjectStart] = useState(getTodayISO);
  const [preset, setPreset] = useState<PresetType>('Big');
  const [showDetailed, setShowDetailed] = useState(true);
  const [useWorkDays, setUseWorkDays] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  // Custom milestones (starts with settings defaults, can add sprints)
  const [customMilestones, setCustomMilestones] = useState<MilestoneConfig[]>(milestoneDefaults);
  const [hiddenMilestones, setHiddenMilestones] = useState<Set<string>>(new Set());
  // Track merged milestones: key = target milestone id, value = array of merged source milestone names
  const [mergedMilestones, setMergedMilestones] = useState<Record<string, string[]>>({});

  // Helper: rebuild customMilestones from base milestones + sprint overrides
  const rebuildMilestones = useCallback((projectOverrides: Record<string, number | null>) => {
    // Detect sprints from overrides (keys like 'sprint-1', 'sprint-2', ...)
    const sprintIds = Object.keys(projectOverrides)
      .filter(k => k.startsWith('sprint-'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('sprint-', ''), 10);
        const numB = parseInt(b.replace('sprint-', ''), 10);
        return numA - numB;
      });
    const sprintMilestones = sprintIds.map(id => {
      const num = parseInt(id.replace('sprint-', ''), 10);
      return createSprintMilestone(num);
    });
    setCustomMilestones([...milestoneDefaults, ...sprintMilestones]);
  }, [milestoneDefaults]);

  // Keep customMilestones base (non-sprint) milestones in sync with settings
  useEffect(() => {
    setCustomMilestones(prev => {
      const sprints = prev.filter(m => m.id.startsWith('sprint-'));
      return [...milestoneDefaults, ...sprints];
    });
  }, [milestoneDefaults]);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isTimelineViewOpen, setIsTimelineViewOpen] = useState(false);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  const [isMondayModalOpen, setIsMondayModalOpen] = useState(false);

  // Track which milestones' dates are locked (milestone id → locked date)
  const [lockedMilestones, setLockedMilestones] = useState<Record<string, string>>({});

  // Milestone checklists: milestoneId → array of checked item ids
  const [milestoneChecklists, setMilestoneChecklists] = useState<Record<string, string[]>>({});

  // Multi-project management
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  
  // Track if we're currently saving to avoid loops
  const isSaving = useRef(false);

  // Ownership check: if viewing someone else's project, it's read-only
  const isOwner = useMemo(() => {
    if (!currentProjectId) return true; // New project = user is the owner
    return isProjectOwner(currentProjectId);
  }, [currentProjectId, isProjectOwner]);

  // Encoded lock for persistence
  const encodedLock = useMemo(() => encodeLocks(lockedMilestones), [lockedMilestones]);

  // Ref to track latest state for immediate save before project switch
  // This prevents data loss when switching projects within the auto-save debounce window
  const latestSaveState = useRef({
    currentProjectId: null as string | null,
    isFeatureNameSet: false,
    isOwner: true,
    featureName: '',
    projectStart: '',
    preset: 'Big' as PresetType,
    showDetailed: true,
    overrides: {} as Record<string, number | null>,
    hiddenMilestones: new Set<string>(),
    encodedLock: null as string | null,
    milestoneChecklists: {} as Record<string, string[]>,
  });

  // Keep ref in sync with state (runs after every render)
  useEffect(() => {
    latestSaveState.current = {
      currentProjectId, isFeatureNameSet, isOwner, featureName, projectStart, preset, showDetailed, overrides, hiddenMilestones, encodedLock, milestoneChecklists,
    };
  });

  // Save current project immediately (fire-and-forget, uses ref for latest state)
  // Called before switching projects to prevent data loss from debounced auto-save
  const saveCurrentProjectNow = useCallback(() => {
    const s = latestSaveState.current;
    if (!s.currentProjectId || !s.isFeatureNameSet || !s.isOwner) return;
    updateProject(s.currentProjectId, {
      feature_name: s.featureName,
      project_start: s.projectStart,
      preset: s.preset,
      show_detailed: s.showDetailed,
      overrides: s.overrides,
      hidden_milestones: Array.from(s.hiddenMilestones),
      locked_dev_start: s.encodedLock,
      milestone_checklists: s.milestoneChecklists,
    });
  }, [updateProject]);

  // Auto-save project to database whenever state changes (debounced)
  useEffect(() => {
    // Only auto-save if we have a feature name set (user has started working)
    // Don't auto-save if we're viewing someone else's project
    if (!isFeatureNameSet || isSaving.current || !isOwner) return;

    const timeoutId = setTimeout(async () => {
      isSaving.current = true;
      
      if (currentProjectId) {
        // Update existing project
        await updateProject(currentProjectId, {
          feature_name: featureName,
          project_start: projectStart,
          preset,
          show_detailed: showDetailed,
          overrides,
          hidden_milestones: Array.from(hiddenMilestones),
          locked_dev_start: encodedLock,
          milestone_checklists: milestoneChecklists,
        });
      } else {
        // Create new project
        const newProject = await createProject({
          feature_name: featureName || 'Untitled Project',
          project_start: projectStart,
          preset,
          show_detailed: showDetailed,
          overrides,
          hidden_milestones: Array.from(hiddenMilestones),
          locked_dev_start: encodedLock,
          milestone_checklists: milestoneChecklists,
        });
        if (newProject) {
          setCurrentProjectId(newProject.id);
          // Notify other components to refetch projects
          window.dispatchEvent(new CustomEvent('refetchProjects'));
        }
      }
      
      isSaving.current = false;
    }, 1000); // 1s debounce for database saves

    return () => clearTimeout(timeoutId);
  }, [featureName, isFeatureNameSet, projectStart, preset, showDetailed, overrides, hiddenMilestones, encodedLock, milestoneChecklists, currentProjectId, createProject, updateProject, isOwner]);

  // Save current project when component unmounts (navigating away from page)
  useEffect(() => {
    return () => {
      saveCurrentProjectNow();
    };
  }, [saveCurrentProjectNow]);

  // Sync currentProjectId with Layout
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('currentProjectUpdated', { detail: currentProjectId }));
  }, [currentProjectId]);

  // Listen for events from Layout sidebar
  useEffect(() => {
    const handleLoadProject = (e: CustomEvent<SavedProject>) => {
      // Save current project immediately before switching to prevent data loss
      saveCurrentProjectNow();
      const project = e.detail;
      const locks = decodeLocks(project.lockedDevStart);
      setCurrentProjectId(project.id);
      setFeatureName(project.featureName || '');
      setIsFeatureNameSet(true);
      setProjectStart(project.projectStart || getTodayISO());
      setPreset(project.preset || 'Big');
      setShowDetailed(project.showDetailed ?? true);
      setOverrides(project.overrides || {});
      setHiddenMilestones(new Set(project.hiddenMilestones || []));
      setLockedMilestones(locks);
      setMergedMilestones({});
      setMilestoneChecklists(project.milestoneChecklists || {});
      rebuildMilestones(project.overrides || {});
    };

    const handleCreateNew = () => {
      // Save current project immediately before creating new
      saveCurrentProjectNow();
      setCurrentProjectId(null);
      setFeatureName('');
      setIsFeatureNameSet(false);
      setProjectStart(getTodayISO());
      setPreset('Big');
      setShowDetailed(true);
      setOverrides({});
      setHiddenMilestones(new Set());
      setLockedMilestones({});
      setMergedMilestones({});
      setMilestoneChecklists({});
      setCustomMilestones(milestoneDefaults);
    };

    window.addEventListener('loadProject', handleLoadProject as EventListener);
    window.addEventListener('createNewProject', handleCreateNew as EventListener);

    return () => {
      window.removeEventListener('loadProject', handleLoadProject as EventListener);
      window.removeEventListener('createNewProject', handleCreateNew as EventListener);
    };
  }, [rebuildMilestones, milestoneDefaults, saveCurrentProjectNow]);

  // Get the current project from database projects
  const currentSavedProject = useMemo(() => {
    if (!currentProjectId) return null;
    const dbProject = projects.find(p => p.id === currentProjectId);
    if (!dbProject) return null;
    // Convert to SavedProject format
    return {
      id: dbProject.id,
      featureName: dbProject.feature_name,
      isFeatureNameSet: true,
      projectStart: dbProject.project_start,
      preset: dbProject.preset as PresetType,
      showDetailed: dbProject.show_detailed,
      overrides: dbProject.overrides,
      hiddenMilestones: dbProject.hidden_milestones,
      lockedDevStart: dbProject.locked_dev_start,
      milestoneChecklists: dbProject.milestone_checklists || {},
      savedAt: dbProject.updated
    } as SavedProject;
  }, [projects, currentProjectId]);

  // Check if current state differs from saved project
  const hasUnsavedChanges = useMemo(() => {
    if (!currentSavedProject) return false;
    return featureName !== currentSavedProject.featureName || projectStart !== currentSavedProject.projectStart || preset !== currentSavedProject.preset || showDetailed !== currentSavedProject.showDetailed || JSON.stringify(overrides) !== JSON.stringify(currentSavedProject.overrides) || JSON.stringify(Array.from(hiddenMilestones).sort()) !== JSON.stringify([...currentSavedProject.hiddenMilestones].sort()) || encodedLock !== currentSavedProject.lockedDevStart;
  }, [currentSavedProject, featureName, projectStart, preset, showDetailed, overrides, hiddenMilestones, encodedLock]);
  
  const handleSave = useCallback(async () => {
    if (isSaving.current || !isOwner) return;
    isSaving.current = true;
    try {
      if (currentProjectId) {
        await updateProject(currentProjectId, {
          feature_name: featureName,
          project_start: projectStart,
          preset,
          show_detailed: showDetailed,
          overrides,
          hidden_milestones: Array.from(hiddenMilestones),
          locked_dev_start: encodedLock,
          milestone_checklists: milestoneChecklists,
        });
        toast.success('Project saved!');
      } else {
        const newProject = await createProject({
          feature_name: featureName || 'Untitled Project',
          project_start: projectStart,
          preset,
          show_detailed: showDetailed,
          overrides,
          hidden_milestones: Array.from(hiddenMilestones),
          locked_dev_start: encodedLock,
          milestone_checklists: milestoneChecklists,
        });
        if (newProject) {
          setCurrentProjectId(newProject.id);
          // Notify other components to refetch projects
          window.dispatchEvent(new CustomEvent('refetchProjects'));
          toast.success('Project created!');
        }
      }
    } finally {
      isSaving.current = false;
    }
  }, [currentProjectId, featureName, projectStart, preset, showDetailed, overrides, hiddenMilestones, encodedLock, milestoneChecklists, createProject, updateProject, isOwner]);
  const handleRestore = useCallback(() => {
    if (!currentSavedProject) return;
    const locks = decodeLocks(currentSavedProject.lockedDevStart);
    setFeatureName(currentSavedProject.featureName || '');
    setIsFeatureNameSet(currentSavedProject.isFeatureNameSet || false);
    setProjectStart(currentSavedProject.projectStart || getTodayISO());
    setPreset(currentSavedProject.preset || 'Big');
    setShowDetailed(currentSavedProject.showDetailed ?? true);
    setOverrides(currentSavedProject.overrides || {});
    setHiddenMilestones(new Set(currentSavedProject.hiddenMilestones || []));
    setLockedMilestones(locks);
    setMergedMilestones({});
    setMilestoneChecklists(currentSavedProject.milestoneChecklists || {});
    rebuildMilestones(currentSavedProject.overrides || {});
    toast.success('Project restored!');
  }, [currentSavedProject, rebuildMilestones]);
  const handleSelectProject = useCallback((project: SavedProject) => {
    // Save current project immediately before switching
    saveCurrentProjectNow();
    const locks = decodeLocks(project.lockedDevStart);
    setCurrentProjectId(project.id);
    setFeatureName(project.featureName || '');
    // When selecting a saved project, always show full content (project was previously set up)
    setIsFeatureNameSet(true);
    setProjectStart(project.projectStart || getTodayISO());
    setPreset(project.preset || 'Big');
    setShowDetailed(project.showDetailed ?? true);
    setOverrides(project.overrides || {});
    setHiddenMilestones(new Set(project.hiddenMilestones || []));
    setLockedMilestones(locks);
    setMergedMilestones({});
    setMilestoneChecklists(project.milestoneChecklists || {});
    rebuildMilestones(project.overrides || {});
  }, [rebuildMilestones, saveCurrentProjectNow]);
  const handleCreateNewProject = useCallback(() => {
    // Save current project immediately before creating new
    saveCurrentProjectNow();
    setCurrentProjectId(null);
    setFeatureName('');
    setIsFeatureNameSet(false);
    setProjectStart(getTodayISO());
    setPreset('Big');
    setShowDetailed(true);
    setOverrides({});
    setHiddenMilestones(new Set());
    setLockedMilestones({});
    setMergedMilestones({});
    setMilestoneChecklists({});
    setCustomMilestones(milestoneDefaults);
  }, [milestoneDefaults, saveCurrentProjectNow]);
  // handleDeleteProject is now handled by Layout via useProjects hook

  // Filter out hidden milestones from the config before calculating
  const activeMilestoneConfigs = useMemo(() => customMilestones.filter(m => !hiddenMilestones.has(m.id)), [customMilestones, hiddenMilestones]);
  const milestones = useMemo(() => calculateTimeline(activeMilestoneConfigs, overrides, projectStart, preset, presetConfigs), [activeMilestoneConfigs, overrides, projectStart, preset, presetConfigs]);

  // Total days until I-Phase (not entire project)
  const totalDays = useMemo(() => {
    const iPhase = milestones.find(m => m.id === 'i-phase');
    if (!iPhase) return milestones.reduce((sum, m) => sum + m.durationDays, 0);
    const iPhaseIndex = milestones.indexOf(iPhase);
    return milestones.slice(0, iPhaseIndex + 1).reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);
  // RFC is always 2 weeks after the last day of the last sprint/milestone
  const projectedEnd = useMemo(() => {
    const lastMilestoneEnd = milestones[milestones.length - 1]?.end ?? projectStart;
    return format(addDays(parseISO(lastMilestoneEnd), 14), 'yyyy-MM-dd');
  }, [milestones, projectStart]);
  const iPhaseStart = useMemo(() => {
    const iPhase = milestones.find(m => m.id === 'i-phase');
    return iPhase?.start ?? null;
  }, [milestones]);
  const daysToIPhase = useMemo(() => {
    const iPhase = milestones.find(m => m.id === 'i-phase');
    if (!iPhase) return null;
    return milestones.filter(m => milestones.indexOf(m) < milestones.indexOf(iPhase)).reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);

  // Total development time (I-Phase + all sprints)
  const devDays = useMemo(() => {
    return milestones.filter(m => m.phase === 'Development').reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);
  const daysBeforeIPhase = useMemo(() => calculateDaysBeforeMilestone('i-phase', preset, overrides, activeMilestoneConfigs, presetConfigs), [overrides, preset, activeMilestoneConfigs, presetConfigs]);

  // Ref to skip the next enforce cycle (used by handleDaysChange which enforces inline)
  const skipNextEnforce = useRef(false);

  // Enforce locked dates by adjusting preceding milestone durations.
  // Runs whenever anything that affects dates changes. Project start is NEVER touched.
  useEffect(() => {
    if (skipNextEnforce.current) {
      skipNextEnforce.current = false;
      return;
    }
    if (Object.keys(lockedMilestones).length === 0) return;
    const enforced = enforceLockedDates(lockedMilestones, activeMilestoneConfigs, overrides, projectStart, preset, presetConfigs);
    if (JSON.stringify(enforced) !== JSON.stringify(overrides)) {
      setOverrides(enforced);
    }
  }, [lockedMilestones, activeMilestoneConfigs, overrides, projectStart, preset, presetConfigs]);

  const handleDevStartChange = useCallback((devStartDate: string) => {
    // Calculate how many days all milestones before I-Phase take
    const totalDaysBefore = calculateDaysBeforeMilestone('i-phase', preset, overrides, activeMilestoneConfigs, presetConfigs);
    // Move project start so that I-Phase lands on the chosen date
    const newProjectStart = format(addDays(parseISO(devStartDate), -totalDaysBefore), 'yyyy-MM-dd');
    setProjectStart(newProjectStart);
    // The enforce effect will handle any locked milestones afterward
  }, [preset, overrides, activeMilestoneConfigs, presetConfigs]);

  const handlePresetChange = useCallback((newPreset: PresetType) => {
    setPreset(newPreset);
    // Effect will enforce locked dates with the new preset
  }, []);

  // Toggle lock on a milestone's date
  const handleToggleLock = useCallback((milestoneId: string) => {
    setLockedMilestones(prev => {
      if (prev[milestoneId]) {
        // Unlock this milestone
        const { [milestoneId]: _, ...rest } = prev;
        return rest;
      } else {
        // Lock this milestone at its current date
        const milestone = milestones.find(m => m.id === milestoneId);
        if (milestone) {
          return { ...prev, [milestoneId]: milestone.start };
        }
        return prev;
      }
    });
  }, [milestones]);

  // Checklist dialog state
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistMilestoneId, setChecklistMilestoneId] = useState<string | null>(null);
  const checklistMilestone = milestones.find(m => m.id === checklistMilestoneId);

  const handleOpenChecklist = useCallback((milestoneId: string) => {
    setChecklistMilestoneId(milestoneId);
    setChecklistDialogOpen(true);
  }, []);

  const handleToggleChecklistItem = useCallback((milestoneId: string, itemId: string) => {
    setMilestoneChecklists(prev => {
      // Default: all items checked when no data exists yet
      const current = prev[milestoneId] ?? [...getItemIdsForMilestone(milestoneId)];
      const isChecked = current.includes(itemId);
      return {
        ...prev,
        [milestoneId]: isChecked
          ? current.filter(id => id !== itemId)
          : [...current, itemId],
      };
    });
  }, []);

  const exportData: TimelineExport = useMemo(() => ({
    featureName: featureName || undefined,
    projectStart,
    devStart: iPhaseStart ?? projectStart,
    preset,
    totalDays,
    projectedEnd,
    milestones: milestones.map(m => ({
      id: m.id,
      phase: m.phase,
      name: m.name,
      durationDays: m.durationDays,
      date: m.start
    }))
  }), [featureName, projectStart, iPhaseStart, preset, totalDays, projectedEnd, milestones]);
  const handleDaysChange = useCallback((id: string, value: number | null) => {
    const newOverrides = { ...overrides, [id]: value };
    if (Object.keys(lockedMilestones).length > 0) {
      // Enforce locked dates, but don't adjust the milestone the user just changed
      const enforced = enforceLockedDates(lockedMilestones, activeMilestoneConfigs, newOverrides, projectStart, preset, presetConfigs, id);
      skipNextEnforce.current = true;
      setOverrides(enforced);
    } else {
      setOverrides(newOverrides);
    }
  }, [overrides, lockedMilestones, activeMilestoneConfigs, projectStart, preset, presetConfigs]);

  // Handle direct date change from the milestone table
  const handleDateChange = useCallback((milestoneId: string, newDate: string) => {
    const milestoneIndex = milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex < 0) return;

    const newDateParsed = parseISO(newDate);

    if (milestoneIndex === 0) {
      // First milestone — change the project start date
      setProjectStart(newDate);
    } else {
      // For other milestones, adjust the duration of the previous milestone
      const prevMilestone = milestones[milestoneIndex - 1];
      const prevStart = parseISO(prevMilestone.start);
      const newDuration = differenceInDays(newDateParsed, prevStart);
      if (newDuration >= 0) {
        handleDaysChange(prevMilestone.id, newDuration);
      }
    }
  }, [milestones, handleDaysChange]);

  const handleRemoveMilestone = useCallback((id: string) => {
    const milestone = milestoneDefaults.find(m => m.id === id);
    setHiddenMilestones(prev => new Set([...prev, id]));
    toast.success(`${milestone?.name || 'Milestone'} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setHiddenMilestones(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
    });
  }, [milestoneDefaults]);
  const handleRestoreMilestone = useCallback((id: string) => {
    setHiddenMilestones(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success('Milestone restored');
  }, []);
  const handleMergeMilestones = useCallback((sourceId: string, targetId: string) => {
    // Hide the source milestone (merge it into target)
    const sourceMilestone = customMilestones.find(m => m.id === sourceId);
    const sourceName = sourceMilestone?.name || 'Unknown';
    setHiddenMilestones(prev => new Set([...prev, sourceId]));

    // Add source name to merged list for target
    setMergedMilestones(prev => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), sourceName]
    }));
    toast.success(`${sourceName} merged with ${customMilestones.find(m => m.id === targetId)?.name}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setHiddenMilestones(prev => {
            const next = new Set(prev);
            next.delete(sourceId);
            return next;
          });
          // Remove from merged list
          setMergedMilestones(prev => {
            const newList = [...(prev[targetId] || [])];
            const idx = newList.indexOf(sourceName);
            if (idx > -1) newList.splice(idx, 1);
            if (newList.length === 0) {
              const {
                [targetId]: _,
                ...rest
              } = prev;
              return rest;
            }
            return {
              ...prev,
              [targetId]: newList
            };
          });
        }
      }
    });
  }, [customMilestones]);
  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast.success('JSON copied to clipboard!');
      if (currentProjectId) {
        logActivity(currentProjectId, 'exported_json', { description: 'Exported to JSON' });
      }
    } catch {
      toast.error('Failed to copy to clipboard');
      setIsJsonModalOpen(true);
    }
  }, [exportData, currentProjectId]);
  const handleReset = useCallback(() => {
    // Save current project before resetting
    saveCurrentProjectNow();
    setFeatureName('');
    setIsFeatureNameSet(false);
    setProjectStart(getTodayISO());
    setPreset('Big');
    setShowDetailed(true);
    setOverrides({});
    setCustomMilestones(milestoneDefaults);
    setHiddenMilestones(new Set());
    setMergedMilestones({});
    setLockedMilestones({});
    setMilestoneChecklists({});
    setIsTimelineViewOpen(false);
    toast.success('Timeline reset to defaults');
  }, [milestoneDefaults, saveCurrentProjectNow]);

  // Sprint management handlers
  const handleAddSprint = useCallback(() => {
    const currentSprints = customMilestones.filter(m => m.id.startsWith('sprint-'));
    const nextSprintNumber = currentSprints.length + 1;
    const newSprint = createSprintMilestone(nextSprintNumber);
    setCustomMilestones(prev => [...prev, newSprint]);
    // Set default duration for the new sprint
    setOverrides(prev => ({
      ...prev,
      [newSprint.id]: getSprintDuration()
    }));
    toast.success(`Sprint ${nextSprintNumber} added`);
    if (currentProjectId) {
      logActivity(currentProjectId, 'sprint_added', { description: `Sprint ${nextSprintNumber} added` });
    }
  }, [customMilestones, currentProjectId]);
  const handleRemoveSprint = useCallback(() => {
    const sprints = customMilestones.filter(m => m.id.startsWith('sprint-'));
    if (sprints.length <= 1) return;
    const lastSprint = sprints[sprints.length - 1];
    setCustomMilestones(prev => prev.filter(m => m.id !== lastSprint.id));
    // Remove override for removed sprint
    setOverrides(prev => {
      const {
        [lastSprint.id]: _,
        ...rest
      } = prev;
      return rest;
    });
    toast.success(`${lastSprint.name} removed`);
    if (currentProjectId) {
      logActivity(currentProjectId, 'sprint_removed', { description: `${lastSprint.name} removed` });
    }
  }, [customMilestones, currentProjectId]);
  return (
    <div className="flex-1 min-h-screen overflow-auto">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <PredictorLogo size="lg" />
            <span className="font-bold text-foreground text-xl sm:text-2xl tracking-tight">PREDICTOR</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Plan your product lifecycle with flexible milestone durations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 bg-muted/30">
        <ControlsPanel
          featureName={featureName}
          onFeatureNameChange={setFeatureName}
          isFeatureNameSet={isFeatureNameSet}
          onSetFeatureName={() => {
            setIsFeatureNameSet(true);
            setTimeout(() => handleSave(), 0);
          }}
          onEditFeatureName={() => setIsFeatureNameSet(false)}
          projectStart={projectStart}
          onProjectStartChange={date => {
            setProjectStart(date);
            // Locked dates are preserved by the enforce effect adjusting durations
          }}
          devStart={iPhaseStart ?? projectStart}
          onDevStartChange={handleDevStartChange}
          preset={preset}
          onPresetChange={handlePresetChange}
          showDetailed={showDetailed}
          onShowDetailedChange={setShowDetailed}
          useWorkDays={useWorkDays}
          onUseWorkDaysChange={setUseWorkDays}
          onCopyJson={handleCopyJson}
          onSave={handleSave}
          onRestore={handleRestore}
          hasUnsavedChanges={hasUnsavedChanges}
          onReset={handleReset}
          onShowTimeline={() => setIsTimelineViewOpen(true)}
          onShowCompare={() => setIsCompareViewOpen(true)}
          onExportMonday={() => setIsMondayModalOpen(true)}
          readOnly={!isOwner}
        />

        {isFeatureNameSet && (
          <>
            <SummaryCards
              totalDays={totalDays}
              projectedEnd={projectedEnd}
              iPhaseStart={iPhaseStart}
              daysToIPhase={daysToIPhase}
              showDetailed={showDetailed}
              devDays={devDays}
              projectStart={projectStart}
            />

            <MilestoneTable
              milestones={milestones}
              showDetailed={showDetailed}
              useWorkDays={useWorkDays}
              onDaysChange={handleDaysChange}
              onRemoveMilestone={handleRemoveMilestone}
              onMergeMilestones={handleMergeMilestones}
              hiddenMilestones={hiddenMilestones}
              allMilestones={customMilestones}
              onRestoreMilestone={handleRestoreMilestone}
              mergedMilestones={mergedMilestones}
              readOnly={!isOwner}
              lockedMilestones={lockedMilestones}
              onToggleLock={handleToggleLock}
              milestoneChecklists={milestoneChecklists}
              onMilestoneNameClick={handleOpenChecklist}
              onDateChange={handleDateChange}
              onUnmergeMilestone={(targetId: string, sourceName: string) => {
                const sourceMilestone = customMilestones.find(m => m.name === sourceName);
                if (sourceMilestone) {
                  setHiddenMilestones(prev => {
                    const next = new Set(prev);
                    next.delete(sourceMilestone.id);
                    return next;
                  });
                }
                setMergedMilestones(prev => {
                  const newList = [...(prev[targetId] || [])].filter(n => n !== sourceName);
                  if (newList.length === 0) {
                    const { [targetId]: _, ...rest } = prev;
                    return rest;
                  }
                  return { ...prev, [targetId]: newList };
                });
                toast.success(`${sourceName} unmerged`);
              }}
            />

            <SprintManager
              milestones={customMilestones}
              onAddSprint={handleAddSprint}
              onRemoveSprint={handleRemoveSprint}
              readOnly={!isOwner}
            />

            <ProjectActivityLog 
              projectId={currentProjectId} 
              projectName={featureName}
            />
          </>
        )}
      </main>

      {/* JSON Modal */}
      <JsonExportModal data={exportData} isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} />

      {/* Timeline View Modal */}
      <TimelineView
        milestones={milestones}
        featureName={isFeatureNameSet ? featureName : undefined}
        preset={preset}
        isOpen={isTimelineViewOpen}
        onClose={() => setIsTimelineViewOpen(false)}
        onDaysChange={handleDaysChange}
        onRemoveMilestone={handleRemoveMilestone}
        readOnly={!isOwner}
      />

      {/* Project Compare View Modal */}
      <ProjectCompareView isOpen={isCompareViewOpen} onClose={() => setIsCompareViewOpen(false)} projects={projects.map(p => ({
        id: p.id,
        featureName: p.feature_name,
        isFeatureNameSet: true,
        projectStart: p.project_start,
        preset: p.preset as PresetType,
        showDetailed: p.show_detailed,
        overrides: p.overrides,
        hiddenMilestones: p.hidden_milestones,
        lockedDevStart: p.locked_dev_start,
        milestoneChecklists: p.milestone_checklists || {},
        savedAt: p.updated
      }))} />

      {/* Milestone Checklist Dialog */}
      <MilestoneChecklistDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        milestoneName={checklistMilestone?.name || ''}
        milestoneId={checklistMilestoneId || ''}
        checkedItems={checklistMilestoneId ? (milestoneChecklists[checklistMilestoneId] ?? getItemIdsForMilestone(checklistMilestoneId)) : []}
        onToggleItem={handleToggleChecklistItem}
        readOnly={!isOwner}
      />

      {/* Monday Export Modal */}
      <MondayExportModal
        isOpen={isMondayModalOpen}
        onClose={() => setIsMondayModalOpen(false)}
        milestones={milestones}
        featureName={featureName || 'Project'}
        onExportSuccess={(boardName, count) => {
          if (currentProjectId) {
            logActivity(currentProjectId, 'exported_monday', { 
              description: `Exported ${count} milestones to ${boardName}`,
              boardName,
              count
            });
          }
        }}
      />
    </div>
  );
};
export default Index;