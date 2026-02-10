import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
            {projectTimelines.length > 0 && (
              <span className="text-muted-foreground">
                — ({getPresetDisplayNames()[projectTimelines[0]?.project.preset || 'Big']})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project Selection - Unlimited */}
        <div className="p-4 border-b border-border">
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

        {/* Milestone Legend */}
        <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-art-sketch" />
            <span className="text-muted-foreground">Art Sketch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-brief" />
            <span className="text-muted-foreground">Brief</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-concept" />
            <span className="text-muted-foreground">Concept</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-i-phase" />
            <span className="text-muted-foreground">Execution Phase</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-management-pitch" />
            <span className="text-muted-foreground">Management pitch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-pre-concept" />
            <span className="text-muted-foreground">Pre-Concept</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-pre-launch" />
            <span className="text-muted-foreground">Pre-Launch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-rfc" />
            <span className="text-muted-foreground">RFC</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-milestone-sketch" />
            <span className="text-muted-foreground">Sketch</span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto" ref={timelineContainerRef}>
          {projectTimelines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Add projects to compare their timelines
            </div>
          ) : (
            <div className="min-w-fit">
              {/* Month + Week Headers */}
              <div className="sticky top-0 bg-card z-10 border-b border-border">
                {/* Month row */}
                <div className="flex border-b border-border">
                  <div className="w-44 flex-shrink-0 border-r border-border" />
                  <div className="flex">
                    {monthGroups.map((group, i) => (
                      <div
                        key={i}
                        className="border-r border-primary/25 text-center py-1 bg-muted/40 last:border-r-0"
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
                        {/* Connecting line between milestones */}
                        {milestones.length > 1 && (
                          <div
                            className="absolute top-[23px] h-[2px] bg-primary/30"
                            style={{
                              left: getExactPosition(milestones[0].start) + 16,
                              width: getExactPosition(milestones[milestones.length - 1].start) - getExactPosition(milestones[0].start),
                            }}
                          />
                        )}
                        {/* Milestone markers with labels */}
                        {milestones.map((milestone, milestoneIndex) => {
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
