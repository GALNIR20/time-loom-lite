import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, differenceInDays, min, max, addDays, startOfWeek, getWeek } from 'date-fns';
import { SavedProject } from './ProjectSidebar';
import { calculateTimeline } from '@/lib/timeline';
import { MilestoneState } from '@/types/timeline';
import { getCustomMilestoneConfigs, getCustomPresetConfigs, getPresetDisplayNames } from '@/hooks/useMilestoneSettings';

interface ProjectCompareViewProps {
  isOpen: boolean;
  onClose: () => void;
  projects: SavedProject[];
}

interface ProjectTimeline {
  project: SavedProject;
  milestones: MilestoneState[];
  totalDays: number;
  startDate: string;
  endDate: string;
}

// Individual milestone colors matching the reference design
const MILESTONE_COLORS: Record<string, string> = {
  'brief': 'bg-milestone-brief',
  'pre-concept': 'bg-milestone-pre-concept',
  'concept': 'bg-milestone-concept',
  'art-sketch': 'bg-milestone-art-sketch',
  'sketch': 'bg-milestone-sketch',
  'i-phase': 'bg-milestone-i-phase',
  'management-pitch': 'bg-milestone-management-pitch',
  'pre-launch': 'bg-milestone-pre-launch',
  'rfc': 'bg-milestone-rfc',
};

// Phase colors are now dynamic - managed via useMilestoneSettings

const getMilestoneColor = (milestoneId: string): string => {
  // Check for sprint milestones
  if (milestoneId.startsWith('sprint-')) {
    return 'bg-milestone-sprint';
  }
  return MILESTONE_COLORS[milestoneId] || 'bg-primary';
};

const COMPARE_STORAGE_KEY = 'predictor-compare-projects';

function loadCompareSelection(): string[] {
  try {
    const game = localStorage.getItem('predictor-selected-game');
    const key = game ? `${COMPARE_STORAGE_KEY}-${game}` : COMPARE_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCompareSelection(ids: string[]) {
  try {
    const game = localStorage.getItem('predictor-selected-game');
    const key = game ? `${COMPARE_STORAGE_KEY}-${game}` : COMPARE_STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {}
}

export function ProjectCompareView({ isOpen, onClose, projects }: ProjectCompareViewProps) {
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() => {
    // Load persisted selection and filter out projects that no longer exist
    return loadCompareSelection();
  });
  const [isSelectionCollapsed, setIsSelectionCollapsed] = useState(false);

  // Filter out stale project IDs when the project list changes
  useEffect(() => {
    if (projects.length === 0) return;
    setSelectedProjects(prev => {
      const valid = prev.filter(id => id === '' || projects.some(p => p.id === id));
      if (valid.length !== prev.length) {
        saveCompareSelection(valid);
        return valid;
      }
      return prev;
    });
  }, [projects]);

  // Persist selection whenever it changes
  useEffect(() => {
    saveCompareSelection(selectedProjects);
  }, [selectedProjects]);

  // Calculate timelines for selected projects
  const projectTimelines = useMemo(() => {
    const timelines: ProjectTimeline[] = [];
    
    selectedProjects.forEach((projectId) => {
      if (!projectId) return;
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      const customMilestones = getCustomMilestoneConfigs();
      const customPresetConfigs = getCustomPresetConfigs();
      const milestones = calculateTimeline(
        customMilestones.filter((m) => !project.hiddenMilestones.includes(m.id)),
        project.overrides,
        project.projectStart,
        project.preset,
        customPresetConfigs
      );

      const totalDays = milestones.reduce((sum, m) => sum + m.durationDays, 0);
      const startDate = project.projectStart;
      const endDate = milestones.length > 0 ? milestones[milestones.length - 1].end : startDate;

      timelines.push({ project, milestones, totalDays, startDate, endDate });
    });

    return timelines;
  }, [selectedProjects, projects]);

  // Collect all unique milestone IDs/names across all project timelines, sorted by PLC config order
  const allMilestoneOptions = useMemo(() => {
    const seen = new Map<string, string>(); // id -> name
    projectTimelines.forEach(({ milestones }) => {
      milestones.forEach((m) => {
        if (!seen.has(m.id)) seen.set(m.id, m.name);
      });
    });
    // Sort by the canonical PLC order from settings
    const configOrder = getCustomMilestoneConfigs().map((c) => c.id);
    const entries = Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
    entries.sort((a, b) => {
      const idxA = configOrder.indexOf(a.id);
      const idxB = configOrder.indexOf(b.id);
      // Unknown milestones (e.g. sprints) go to the end
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });
    return entries;
  }, [projectTimelines]);

  // Which milestones are visible (default: all)
  const [visibleMilestones, setVisibleMilestones] = useState<Set<string>>(() => new Set());
  
  // Keep visibleMilestones in sync: when new milestones appear, include them
  useEffect(() => {
    const allIds = new Set(allMilestoneOptions.map((m) => m.id));
    setVisibleMilestones((prev) => {
      // If nothing was set yet, select all
      if (prev.size === 0 && allIds.size > 0) return allIds;
      // Add any new milestone IDs that weren't in the previous set
      const next = new Set(prev);
      let changed = false;
      allIds.forEach((id) => {
        if (!next.has(id)) { next.add(id); changed = true; }
      });
      // Remove stale IDs
      next.forEach((id) => {
        if (!allIds.has(id)) { next.delete(id); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [allMilestoneOptions]);

  const toggleMilestone = (id: string) => {
    setVisibleMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllMilestones = () => {
    setVisibleMilestones(new Set(allMilestoneOptions.map((m) => m.id)));
  };

  const clearAllMilestones = () => {
    setVisibleMilestones(new Set());
  };

  // Calculate overall date range for the timeline
  const dateRange = useMemo(() => {
    if (projectTimelines.length === 0) return { start: new Date(), end: new Date(), totalDays: 0 };

    const allDates = projectTimelines.flatMap((t) => [parseISO(t.startDate), parseISO(t.endDate)]);
    const start = startOfWeek(min(allDates), { weekStartsOn: 1 });
    const end = addDays(max(allDates), 14); // Add buffer
    const totalDays = Math.max(differenceInDays(end, start), 1);

    return { start, end, totalDays };
  }, [projectTimelines]);

  // Generate week columns
  const weekColumns = useMemo(() => {
    if (dateRange.totalDays === 0) return [];
    const weeks = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      weeks.push({
        date: current,
        weekNum: getWeek(current),
        label: format(current, 'MMM d'),
      });
      current = addDays(current, 7);
    }
    return weeks;
  }, [dateRange]);

  // Group weeks by month for the month header row
  const monthGroups = useMemo(() => {
    if (weekColumns.length === 0) return [];
    const groups: { label: string; span: number }[] = [];
    let currentMonth = format(weekColumns[0].date, 'MMM yyyy');
    let count = 1;
    for (let i = 1; i < weekColumns.length; i++) {
      const month = format(weekColumns[i].date, 'MMM yyyy');
      if (month === currentMonth) {
        count++;
      } else {
        groups.push({ label: currentMonth, span: count });
        currentMonth = month;
        count = 1;
      }
    }
    groups.push({ label: currentMonth, span: count });
    return groups;
  }, [weekColumns]);

  // Indices of weeks that start a new month (for bold dividers)
  const monthBoundaryWeekIndices = useMemo(() => {
    const boundaries = new Set<number>();
    for (let i = 1; i < weekColumns.length; i++) {
      if (format(weekColumns[i].date, 'MMM yyyy') !== format(weekColumns[i - 1].date, 'MMM yyyy')) {
        boundaries.add(i);
      }
    }
    return boundaries;
  }, [weekColumns]);

  const addProjectSlot = () => {
    setSelectedProjects(prev => [...prev, '']);
  };

  const showAllProjects = () => {
    setSelectedProjects(projects.map((p) => p.id));
  };

  const clearAllProjects = () => {
    setSelectedProjects([]);
  };

  const removeProjectSlot = (index: number) => {
    setSelectedProjects(prev => prev.filter((_, i) => i !== index));
  };

  const updateProjectSelection = (index: number, projectId: string) => {
    setSelectedProjects(prev => {
      const next = [...prev];
      next[index] = projectId;
      return next;
    });
  };

  // Get column index for a date
  const getColumnIndex = (dateStr: string) => {
    const date = parseISO(dateStr);
    const daysDiff = differenceInDays(date, dateRange.start);
    return Math.floor(daysDiff / 7);
  };

  // Get exact position within the timeline
  const getExactPosition = (dateStr: string) => {
    const date = parseISO(dateStr);
    const daysDiff = differenceInDays(date, dateRange.start);
    return (daysDiff / 7) * columnWidth;
  };

  // Measure the timeline container to compute dynamic column width
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = timelineContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  if (!isOpen) return null;

  const sidebarWidth = 176; // w-44 = 11rem = 176px
  const availableWidth = containerWidth > 0 ? containerWidth - sidebarWidth : 0;
  const columnWidth = weekColumns.length > 0 && availableWidth > 0
    ? Math.max(Math.floor(availableWidth / weekColumns.length), 36)
    : 80;

  // Today line position (px from left of the grid area, or null if outside range)
  const todayPosition = (() => {
    if (weekColumns.length === 0) return null;
    const today = new Date();
    const daysDiff = differenceInDays(today, dateRange.start);
    const totalDaysInGrid = weekColumns.length * 7;
    if (daysDiff < 0 || daysDiff > totalDaysInGrid) return null;
    return (daysDiff / 7) * columnWidth;
  })();

  // Find shortest and longest projects for comparison
  const sortedByDuration = [...projectTimelines].sort((a, b) => a.totalDays - b.totalDays);
  const shortestProject = sortedByDuration[0];
  const longestProject = sortedByDuration[sortedByDuration.length - 1];
  const daysDifference = projectTimelines.length >= 2 
    ? longestProject.totalDays - shortestProject.totalDays 
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header + Project Selection - Collapsible */}
        <div className="border-b border-border">
          <div className="flex items-center gap-2 px-4 py-2">
            <button
              onClick={() => setIsSelectionCollapsed(prev => !prev)}
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {isSelectionCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              Timeline View
            </button>
            {projectTimelines.length > 0 && (
              <span className="text-xs text-muted-foreground">
                — ({getPresetDisplayNames()[projectTimelines[0]?.project.preset || 'Big']})
              </span>
            )}
            <span className="text-xs text-muted-foreground ml-1">
              · {selectedProjects.filter(Boolean).length} of {projects.length} projects
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={showAllProjects}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-xs font-medium"
              >
                Show All ({projects.length})
              </button>
              {selectedProjects.length > 0 && (
                <button
                  onClick={clearAllProjects}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-xs font-medium"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {!isSelectionCollapsed && (
            <div className="px-4 pb-3">
              <div className="max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-3 items-end">
                  {selectedProjects.map((projectId, index) => (
                    <div key={index} className="flex-shrink-0 w-56">
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                        Project {index + 1}
                      </label>
                      <div className="flex gap-1">
                        <select
                          value={projectId}
                          onChange={(e) => updateProjectSelection(index, e.target.value)}
                          className="input-field flex-1"
                        >
                          <option value="">Select project...</option>
                          {projects.map((p) => (
                            <option 
                              key={p.id} 
                              value={p.id} 
                              disabled={selectedProjects.includes(p.id) && p.id !== projectId}
                            >
                              {p.featureName || 'Untitled Project'}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeProjectSlot(index)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addProjectSlot}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Milestone Filter Checkboxes */}
        {allMilestoneOptions.length > 0 && (
          <div className="px-4 py-2 border-b border-border">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
              {/* Select All / Clear All */}
              <div className="flex items-center gap-2 mr-2 border-r border-border pr-4">
                <button
                  onClick={selectAllMilestones}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-primary font-medium"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  All
                </button>
                <button
                  onClick={clearAllMilestones}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-muted-foreground font-medium"
                >
                  <Square className="w-3.5 h-3.5" />
                  None
                </button>
              </div>
              {/* Individual milestone checkboxes */}
              {allMilestoneOptions.map((m) => {
                const colorClass = getMilestoneColor(m.id);
                const isChecked = visibleMilestones.has(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-1.5 cursor-pointer select-none py-0.5 px-1 rounded hover:bg-muted transition-colors ${
                      isChecked ? '' : 'opacity-40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMilestone(m.id)}
                      className="sr-only"
                    />
                    <div className={`w-3 h-3 rounded-full ${colorClass} flex items-center justify-center`}>
                      {isChecked && (
                        <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>{m.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto" ref={timelineContainerRef}>
          {projectTimelines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Add projects to compare their timelines
            </div>
          ) : (
            <div className="min-w-fit relative">
              {/* Today indicator line spanning full height */}
              {todayPosition !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 z-30 pointer-events-none"
                  style={{ left: sidebarWidth + todayPosition, backgroundColor: 'rgba(11, 100, 244, 0.5)' }}
                >
                  <div className="sticky top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-white text-[9px] font-semibold rounded-b whitespace-nowrap w-fit" style={{ backgroundColor: '#0B64F4' }}>
                    Today
                  </div>
                </div>
              )}
              {/* Month + Week Headers */}
              <div className="sticky top-0 z-20 border-b border-border bg-white dark:bg-[#050E21]">
                {/* Month row */}
                <div className="flex border-b border-border">
                  <div className="w-44 flex-shrink-0 border-r border-border" />
                  <div className="flex">
                    {monthGroups.map((group, i) => (
                      <div
                        key={i}
                        className="border-r border-primary/25 text-center py-1 last:border-r-0 bg-gray-100 dark:bg-[#050E21]"
                        style={{ width: columnWidth * group.span }}
                      >
                        <span className="text-[11px] font-semibold text-primary">
                          {group.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Week row */}
                <div className="flex">
                  <div className="w-44 flex-shrink-0 p-3 border-r border-border">
                    <span className="text-xs font-medium text-muted-foreground">Milestone</span>
                  </div>
                  <div className="flex">
                    {weekColumns.map((week, i) => {
                      const isMonthEnd = monthBoundaryWeekIndices.has(i + 1);
                      return (
                      <div
                        key={i}
                        className={`text-center py-2 overflow-hidden ${isMonthEnd ? 'border-r border-primary/25' : 'border-r border-border'}`}
                        style={{ width: columnWidth }}
                      >
                        <div className="text-[10px] font-semibold text-foreground truncate">W{week.weekNum}</div>
                        {columnWidth >= 50 && (
                          <div className="text-[9px] text-muted-foreground truncate">{week.label}</div>
                        )}
                      </div>
                    );})}
                  </div>
                </div>
              </div>

              {/* Project Rows */}
              {projectTimelines.map(({ project, milestones }, projectIndex) => {
                const filtered = milestones.filter((m) => visibleMilestones.has(m.id));
                return (
                  <div key={project.id} className={projectIndex > 0 ? 'border-t-2 border-primary/20' : ''}>
                    {/* Project Row */}
                    <div className="flex bg-muted/30 border-b border-border">
                      <div className="w-44 flex-shrink-0 p-3 border-r border-border flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {project.featureName || 'Untitled Project'}
                        </span>
                      </div>
                      <div className="flex relative" style={{ minHeight: 80 }}>
                        {/* Week grid cells */}
                        {weekColumns.map((_, i) => {
                          const isMonthEnd = monthBoundaryWeekIndices.has(i + 1);
                          return (
                          <div
                            key={i}
                            className={isMonthEnd ? 'border-r border-primary/25' : 'border-r border-border/30'}
                            style={{ width: columnWidth, height: 80 }}
                          />
                        );})}
                        {/* Connecting line between visible milestones */}
                        {filtered.length > 1 && (
                          <div
                            className="absolute top-[23px] h-[2px] bg-primary/30"
                            style={{
                              left: getExactPosition(filtered[0].start) + 16,
                              width: getExactPosition(filtered[filtered.length - 1].start) - getExactPosition(filtered[0].start),
                            }}
                          />
                        )}
                        {/* Milestone markers with labels (filtered) */}
                        {filtered.map((milestone, milestoneIndex) => {
                          const position = getExactPosition(milestone.start);
                          const colorClass = getMilestoneColor(milestone.id);
                          return (
                            <div
                              key={milestone.id}
                              className="absolute flex flex-col items-center"
                              style={{
                                left: position - 16,
                                top: 8,
                              }}
                            >
                              <div
                                className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center shadow-md z-10`}
                                title={`${milestone.name}: ${format(parseISO(milestone.start), 'MMM d, yyyy')}`}
                              >
                                <span className="text-xs font-bold text-white">{milestoneIndex + 1}</span>
                              </div>
                              <div className="mt-1 text-center" style={{ width: Math.max(columnWidth, 48) }}>
                                <div className="text-[10px] font-medium text-foreground truncate">
                                  {milestone.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {format(parseISO(milestone.start), 'MMM d')}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Summary comparison when 2+ projects selected */}
              {projectTimelines.length >= 2 && (
                <div className="p-4 bg-muted/30 border-t border-border">
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground font-medium">Difference:</span>
                    <span className="text-primary font-semibold">
                      {daysDifference} days
                    </span>
                    {daysDifference > 0 && (
                      <span className="text-muted-foreground">
                        ({shortestProject.project.featureName || 'Project'} is shorter)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
