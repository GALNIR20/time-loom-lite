import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { parseISO, subDays, format } from 'date-fns';
import { ControlsPanel } from '@/components/ControlsPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { MilestoneTable } from '@/components/MilestoneTable';
import { JsonExportModal } from '@/components/JsonExportModal';
import { TimelineView } from '@/components/TimelineView';
import { ProjectCompareView } from '@/components/ProjectCompareView';
import { ProjectSidebar, SavedProject } from '@/components/ProjectSidebar';
import { SprintManager } from '@/components/SprintManager';
import {
  DEFAULT_MILESTONES,
  calculateTimeline,
  getPresetDuration,
  PRESET_CONFIGS,
  getTodayISO,
  createSprintMilestone,
  SPRINT_DURATION_DAYS,
} from '@/lib/timeline';
import { TimelineExport, PresetType, MilestoneConfig } from '@/types/timeline';
import predictorLogo from '@/assets/predictor-logo.png';

// Calculate days before I-Phase for a given preset and overrides
function calculateDaysBeforeIPhase(
  presetType: PresetType,
  overrides: Record<string, number | null>,
  milestoneConfigs: MilestoneConfig[]
): number {
  const iPhaseIndex = milestoneConfigs.findIndex((m) => m.id === 'i-phase');
  if (iPhaseIndex === -1) return 0;
  
  return milestoneConfigs.slice(0, iPhaseIndex).reduce((sum, config) => {
    const overrideDays = overrides[config.id] ?? null;
    const duration = getPresetDuration(config.id, presetType, overrideDays);
    return sum + duration;
  }, 0);
}

const PROJECTS_STORAGE_KEY = 'timeline-predictor-projects';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const Index = () => {
  const [featureName, setFeatureName] = useState('');
  const [isFeatureNameSet, setIsFeatureNameSet] = useState(false);
  const [projectStart, setProjectStart] = useState(getTodayISO);
  const [preset, setPreset] = useState<PresetType>('Big');
  const [showDetailed, setShowDetailed] = useState(true);
  const [useWorkDays, setUseWorkDays] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  // Custom milestones (starts with defaults, can add sprints)
  const [customMilestones, setCustomMilestones] = useState<MilestoneConfig[]>(DEFAULT_MILESTONES);
  const [hiddenMilestones, setHiddenMilestones] = useState<Set<string>>(new Set());
  // Track merged milestones: key = target milestone id, value = array of merged source milestone names
  const [mergedMilestones, setMergedMilestones] = useState<Record<string, string[]>>({});
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isTimelineViewOpen, setIsTimelineViewOpen] = useState(false);
  const [isCompareViewOpen, setIsCompareViewOpen] = useState(false);
  
  // Track the user's intended dev start date (null = not manually set)
  const [lockedDevStart, setLockedDevStart] = useState<string | null>(null);
  
  // Multi-project management
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load saved projects on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
        const projects: SavedProject[] = JSON.parse(saved);
        setSavedProjects(projects);
      }
    } catch (e) {
      console.error('Failed to load saved projects:', e);
    }
  }, []);

  // Get the current project from saved projects
  const currentSavedProject = useMemo(() => {
    return savedProjects.find((p) => p.id === currentProjectId) || null;
  }, [savedProjects, currentProjectId]);

  // Check if current state differs from saved project
  const hasUnsavedChanges = useMemo(() => {
    if (!currentSavedProject) return false;
    
    return (
      featureName !== currentSavedProject.featureName ||
      isFeatureNameSet !== currentSavedProject.isFeatureNameSet ||
      projectStart !== currentSavedProject.projectStart ||
      preset !== currentSavedProject.preset ||
      showDetailed !== currentSavedProject.showDetailed ||
      JSON.stringify(overrides) !== JSON.stringify(currentSavedProject.overrides) ||
      JSON.stringify(Array.from(hiddenMilestones).sort()) !== JSON.stringify([...currentSavedProject.hiddenMilestones].sort()) ||
      lockedDevStart !== currentSavedProject.lockedDevStart
    );
  }, [currentSavedProject, featureName, isFeatureNameSet, projectStart, preset, showDetailed, overrides, hiddenMilestones, lockedDevStart]);

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    const projectId = currentProjectId || generateId();
    
    const project: SavedProject = {
      id: projectId,
      featureName,
      isFeatureNameSet,
      projectStart,
      preset,
      showDetailed,
      overrides,
      hiddenMilestones: Array.from(hiddenMilestones),
      lockedDevStart,
      savedAt: now,
    };
    
    setSavedProjects((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === projectId);
      let updated: SavedProject[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = project;
      } else {
        updated = [project, ...prev];
      }
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    
    setCurrentProjectId(projectId);
    toast.success('Project saved!');
  }, [currentProjectId, featureName, isFeatureNameSet, projectStart, preset, showDetailed, overrides, hiddenMilestones, lockedDevStart]);

  const handleRestore = useCallback(() => {
    if (!currentSavedProject) return;
    
    setFeatureName(currentSavedProject.featureName || '');
    setIsFeatureNameSet(currentSavedProject.isFeatureNameSet || false);
    setProjectStart(currentSavedProject.projectStart || getTodayISO());
    setPreset(currentSavedProject.preset || 'Big');
    setShowDetailed(currentSavedProject.showDetailed ?? true);
    setOverrides(currentSavedProject.overrides || {});
    setHiddenMilestones(new Set(currentSavedProject.hiddenMilestones || []));
    setLockedDevStart(currentSavedProject.lockedDevStart || null);
    toast.success('Project restored!');
  }, [currentSavedProject]);

  const handleSelectProject = useCallback((project: SavedProject) => {
    setCurrentProjectId(project.id);
    setFeatureName(project.featureName || '');
    setIsFeatureNameSet(project.isFeatureNameSet || false);
    setProjectStart(project.projectStart || getTodayISO());
    setPreset(project.preset || 'Big');
    setShowDetailed(project.showDetailed ?? true);
    setOverrides(project.overrides || {});
    setHiddenMilestones(new Set(project.hiddenMilestones || []));
    setLockedDevStart(project.lockedDevStart || null);
  }, []);

  const handleCreateNewProject = useCallback(() => {
    setCurrentProjectId(null);
    setFeatureName('');
    setIsFeatureNameSet(false);
    setProjectStart(getTodayISO());
    setPreset('Big');
    setShowDetailed(true);
    setOverrides({});
    setHiddenMilestones(new Set());
    setLockedDevStart(null);
  }, []);

  const handleDeleteProject = useCallback((id: string) => {
    setSavedProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
    toast.success('Project deleted');
  }, [currentProjectId]);

  // Filter out hidden milestones from the config before calculating
  const activeMilestoneConfigs = useMemo(
    () => customMilestones.filter((m) => !hiddenMilestones.has(m.id)),
    [customMilestones, hiddenMilestones]
  );

  const milestones = useMemo(
    () => calculateTimeline(activeMilestoneConfigs, overrides, projectStart, preset),
    [activeMilestoneConfigs, overrides, projectStart, preset]
  );

  // Total days until I-Phase (not entire project)
  const totalDays = useMemo(() => {
    const iPhase = milestones.find((m) => m.id === 'i-phase');
    if (!iPhase) return milestones.reduce((sum, m) => sum + m.durationDays, 0);
    
    const iPhaseIndex = milestones.indexOf(iPhase);
    return milestones.slice(0, iPhaseIndex + 1).reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);

  const projectedEnd = useMemo(
    () => milestones[milestones.length - 1]?.end ?? projectStart,
    [milestones, projectStart]
  );

  const iPhaseStart = useMemo(() => {
    const iPhase = milestones.find((m) => m.id === 'i-phase');
    return iPhase?.start ?? null;
  }, [milestones]);

  const daysToIPhase = useMemo(() => {
    const iPhase = milestones.find((m) => m.id === 'i-phase');
    if (!iPhase) return null;
    
    return milestones
      .filter((m) => milestones.indexOf(m) < milestones.indexOf(iPhase))
      .reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);

  // Total development time (I-Phase + all sprints)
  const devDays = useMemo(() => {
    return milestones
      .filter((m) => m.phase === 'Development')
      .reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);

  const daysBeforeIPhase = useMemo(
    () => calculateDaysBeforeIPhase(preset, overrides, customMilestones),
    [overrides, preset, customMilestones]
  );

  const handleDevStartChange = useCallback((devStartDate: string) => {
    // Lock this dev start date
    setLockedDevStart(devStartDate);
    // Calculate project start by going back from dev start
    const devStart = parseISO(devStartDate);
    const daysBack = calculateDaysBeforeIPhase(preset, overrides, customMilestones);
    const newProjectStart = subDays(devStart, daysBack);
    setProjectStart(format(newProjectStart, 'yyyy-MM-dd'));
  }, [preset, overrides, customMilestones]);

  const handlePresetChange = useCallback((newPreset: PresetType) => {
    setPreset(newPreset);
    
    // If user has locked a dev start date, recalculate project start
    if (lockedDevStart) {
      const devStart = parseISO(lockedDevStart);
      const daysBack = calculateDaysBeforeIPhase(newPreset, overrides, customMilestones);
      const newProjectStart = subDays(devStart, daysBack);
      setProjectStart(format(newProjectStart, 'yyyy-MM-dd'));
    }
  }, [lockedDevStart, overrides, customMilestones]);

  const exportData: TimelineExport = useMemo(
    () => ({
      featureName: featureName || undefined,
      projectStart,
      devStart: iPhaseStart ?? projectStart,
      preset,
      totalDays,
      projectedEnd,
      milestones: milestones.map((m) => ({
        id: m.id,
        phase: m.phase,
        name: m.name,
        durationDays: m.durationDays,
        date: m.start,
      })),
    }),
    [featureName, projectStart, iPhaseStart, preset, totalDays, projectedEnd, milestones]
  );

  const handleDaysChange = useCallback((id: string, value: number | null) => {
    setOverrides((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleRemoveMilestone = useCallback((id: string) => {
    const milestone = DEFAULT_MILESTONES.find((m) => m.id === id);
    setHiddenMilestones((prev) => new Set([...prev, id]));
    toast.success(`${milestone?.name || 'Milestone'} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setHiddenMilestones((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        },
      },
    });
  }, []);

  const handleRestoreMilestone = useCallback((id: string) => {
    setHiddenMilestones((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success('Milestone restored');
  }, []);

  const handleMergeMilestones = useCallback((sourceId: string, targetId: string) => {
    // Hide the source milestone (merge it into target)
    const sourceMilestone = customMilestones.find((m) => m.id === sourceId);
    const sourceName = sourceMilestone?.name || 'Unknown';
    
    setHiddenMilestones((prev) => new Set([...prev, sourceId]));
    
    // Add source name to merged list for target
    setMergedMilestones((prev) => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), sourceName],
    }));
    
    toast.success(`${sourceName} merged with ${customMilestones.find((m) => m.id === targetId)?.name}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          setHiddenMilestones((prev) => {
            const next = new Set(prev);
            next.delete(sourceId);
            return next;
          });
          // Remove from merged list
          setMergedMilestones((prev) => {
            const newList = [...(prev[targetId] || [])];
            const idx = newList.indexOf(sourceName);
            if (idx > -1) newList.splice(idx, 1);
            if (newList.length === 0) {
              const { [targetId]: _, ...rest } = prev;
              return rest;
            }
            return { ...prev, [targetId]: newList };
          });
        },
      },
    });
  }, [customMilestones]);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast.success('JSON copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
      setIsJsonModalOpen(true);
    }
  }, [exportData]);

  const handleReset = useCallback(() => {
    setFeatureName('');
    setIsFeatureNameSet(false);
    setProjectStart(getTodayISO());
    setPreset('Big');
    setShowDetailed(true);
    setOverrides({});
    setCustomMilestones(DEFAULT_MILESTONES);
    setHiddenMilestones(new Set());
    setMergedMilestones({});
    setLockedDevStart(null);
    setIsTimelineViewOpen(false);
    toast.success('Timeline reset to defaults');
  }, []);

  // Sprint management handlers
  const handleAddSprint = useCallback(() => {
    const currentSprints = customMilestones.filter((m) => m.id.startsWith('sprint-'));
    const nextSprintNumber = currentSprints.length + 1;
    const newSprint = createSprintMilestone(nextSprintNumber);
    
    setCustomMilestones((prev) => [...prev, newSprint]);
    // Set default duration for the new sprint
    setOverrides((prev) => ({ ...prev, [newSprint.id]: SPRINT_DURATION_DAYS }));
    toast.success(`Sprint ${nextSprintNumber} added`);
  }, [customMilestones]);

  const handleRemoveSprint = useCallback(() => {
    const sprints = customMilestones.filter((m) => m.id.startsWith('sprint-'));
    if (sprints.length <= 1) return;
    
    const lastSprint = sprints[sprints.length - 1];
    setCustomMilestones((prev) => prev.filter((m) => m.id !== lastSprint.id));
    // Remove override for removed sprint
    setOverrides((prev) => {
      const { [lastSprint.id]: _, ...rest } = prev;
      return rest;
    });
    toast.success(`${lastSprint.name} removed`);
  }, [customMilestones]);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Project Sidebar */}
      <ProjectSidebar
        projects={savedProjects}
        currentProjectId={currentProjectId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectProject={handleSelectProject}
        onCreateNew={handleCreateNewProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Main Area */}
      <div className="flex-1 min-h-screen overflow-auto">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={predictorLogo} alt="Predictor" className="h-[42px] sm:h-[58px]" />
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Plan your product lifecycle with flexible milestone durations
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <ControlsPanel
          featureName={featureName}
          onFeatureNameChange={setFeatureName}
          isFeatureNameSet={isFeatureNameSet}
          onSetFeatureName={() => {
            setIsFeatureNameSet(true);
            // Auto-save after setting feature name
            setTimeout(() => handleSave(), 0);
          }}
          onEditFeatureName={() => setIsFeatureNameSet(false)}
          projectStart={projectStart}
          onProjectStartChange={(date) => {
            setProjectStart(date);
            setLockedDevStart(null); // Clear locked dev start when project start is manually changed
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
            />

            <MilestoneTable
              milestones={milestones.filter(m => !m.id.startsWith('sprint-'))}
              showDetailed={showDetailed}
              useWorkDays={useWorkDays}
              onDaysChange={handleDaysChange}
              onRemoveMilestone={handleRemoveMilestone}
              onMergeMilestones={handleMergeMilestones}
              hiddenMilestones={hiddenMilestones}
              allMilestones={customMilestones.filter(m => !m.id.startsWith('sprint-'))}
              onRestoreMilestone={handleRestoreMilestone}
              mergedMilestones={mergedMilestones}
              onUnmergeMilestone={(targetId: string, sourceName: string) => {
                // Find the source milestone id by name
                const sourceMilestone = customMilestones.find((m) => m.name === sourceName);
                if (sourceMilestone) {
                  // Restore the hidden milestone
                  setHiddenMilestones((prev) => {
                    const next = new Set(prev);
                    next.delete(sourceMilestone.id);
                    return next;
                  });
                }
                // Remove from merged list
                setMergedMilestones((prev) => {
                  const newList = [...(prev[targetId] || [])].filter((n) => n !== sourceName);
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
            />
          </>
        )}
        </main>

        {/* JSON Modal */}
        <JsonExportModal
          data={exportData}
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
        />

        {/* Timeline View Modal */}
        <TimelineView
          milestones={milestones}
          featureName={isFeatureNameSet ? featureName : undefined}
          preset={preset}
          isOpen={isTimelineViewOpen}
          onClose={() => setIsTimelineViewOpen(false)}
          onDaysChange={handleDaysChange}
          onRemoveMilestone={handleRemoveMilestone}
        />

        {/* Project Compare View Modal */}
        <ProjectCompareView
          isOpen={isCompareViewOpen}
          onClose={() => setIsCompareViewOpen(false)}
          projects={savedProjects}
        />
      </div>
    </div>
  );
};

export default Index;
