import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays, min, max, addDays, startOfWeek, getWeek } from 'date-fns';
import { SavedProject } from './ProjectSidebar';
import { calculateTimeline, DEFAULT_MILESTONES } from '@/lib/timeline';
import { MilestoneState } from '@/types/timeline';

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

const PHASE_COLORS: Record<string, { bg: string; text: string }> = {
  'Concept Phase': { bg: 'bg-phase-concept', text: 'text-white' },
  'Sketch Phase': { bg: 'bg-phase-sketch', text: 'text-white' },
  'Development': { bg: 'bg-phase-dev', text: 'text-white' },
};

export function ProjectCompareView({ isOpen, onClose, projects }: ProjectCompareViewProps) {
  const [selectedProject1, setSelectedProject1] = useState<string | null>(null);
  const [selectedProject2, setSelectedProject2] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Calculate timelines for selected projects
  const projectTimelines = useMemo(() => {
    const timelines: ProjectTimeline[] = [];
    
    [selectedProject1, selectedProject2].forEach((projectId) => {
      if (!projectId) return;
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      const milestones = calculateTimeline(
        DEFAULT_MILESTONES.filter((m) => !project.hiddenMilestones.includes(m.id)),
        project.overrides,
        project.projectStart,
        project.preset
      );

      const totalDays = milestones.reduce((sum, m) => sum + m.durationDays, 0);
      const startDate = project.projectStart;
      const endDate = milestones.length > 0 ? milestones[milestones.length - 1].end : startDate;

      timelines.push({ project, milestones, totalDays, startDate, endDate });
    });

    return timelines;
  }, [selectedProject1, selectedProject2, projects]);

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

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Get column index for a date
  const getColumnIndex = (dateStr: string) => {
    const date = parseISO(dateStr);
    const daysDiff = differenceInDays(date, dateRange.start);
    return Math.floor(daysDiff / 7);
  };

  if (!isOpen) return null;

  const columnWidth = 80; // px per week column

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Timeline View</h2>
            {projectTimelines.length > 0 && (
              <span className="text-muted-foreground">
                — ({projectTimelines[0]?.project.preset || 'Big'} PLC)
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

        {/* Project Selection */}
        <div className="p-4 border-b border-border flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Project 1
            </label>
            <select
              value={selectedProject1 || ''}
              onChange={(e) => {
                setSelectedProject1(e.target.value || null);
                if (e.target.value) setExpandedProjects((prev) => new Set([...prev, e.target.value]));
              }}
              className="input-field w-full"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === selectedProject2}>
                  {p.featureName || 'Untitled Project'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Project 2
            </label>
            <select
              value={selectedProject2 || ''}
              onChange={(e) => {
                setSelectedProject2(e.target.value || null);
                if (e.target.value) setExpandedProjects((prev) => new Set([...prev, e.target.value]));
              }}
              className="input-field w-full"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === selectedProject1}>
                  {p.featureName || 'Untitled Project'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Phase Legend */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-phase-concept" />
            <span className="text-muted-foreground">Concept Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-phase-sketch" />
            <span className="text-muted-foreground">Sketch Phase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-phase-dev" />
            <span className="text-muted-foreground">Development</span>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-auto">
          {projectTimelines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Select at least one project to compare
            </div>
          ) : (
            <div className="min-w-fit">
              {/* Week Headers */}
              <div className="sticky top-0 bg-card z-10 border-b border-border">
                <div className="flex">
                  <div className="w-44 flex-shrink-0 p-3 border-r border-border">
                    <span className="text-xs font-medium text-muted-foreground">Milestone</span>
                  </div>
                  <div className="flex">
                    {weekColumns.map((week, i) => (
                      <div
                        key={i}
                        className="border-r border-border text-center py-2"
                        style={{ width: columnWidth }}
                      >
                        <div className="text-xs font-semibold text-foreground">W{week.weekNum}</div>
                        <div className="text-[10px] text-muted-foreground">{week.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Project Rows */}
              {projectTimelines.map(({ project, milestones }, projectIndex) => {
                const isExpanded = expandedProjects.has(project.id);
                
                return (
                  <div key={project.id} className={projectIndex > 0 ? 'border-t-2 border-primary/20' : ''}>
                    {/* Project Header Row */}
                    <div className="flex bg-muted/30 border-b border-border">
                      <button
                        onClick={() => toggleExpanded(project.id)}
                        className="w-44 flex-shrink-0 p-3 border-r border-border flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-foreground truncate">
                          {project.featureName || 'Untitled Project'}
                        </span>
                      </button>
                      <div className="flex relative">
                        {/* Week grid cells */}
                        {weekColumns.map((_, i) => (
                          <div
                            key={i}
                            className="border-r border-border/50"
                            style={{ width: columnWidth, height: 60 }}
                          />
                        ))}
                        {/* Milestone markers on combined row */}
                        {milestones.map((milestone, milestoneIndex) => {
                          const colIndex = getColumnIndex(milestone.end);
                          const colors = PHASE_COLORS[milestone.phase];
                          return (
                            <div
                              key={milestone.id}
                              className="absolute flex flex-col items-center"
                              style={{
                                left: colIndex * columnWidth + columnWidth / 2 - 16,
                                top: 8,
                              }}
                            >
                              <div
                                className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center shadow-md`}
                                title={`${milestone.name}: ${format(parseISO(milestone.end), 'MMM d, yyyy')}`}
                              >
                                <span className="text-xs font-bold text-white">{milestoneIndex + 1}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expanded Milestone Details */}
                    {isExpanded && milestones.map((milestone, milestoneIndex) => {
                      const colIndex = getColumnIndex(milestone.end);
                      const colors = PHASE_COLORS[milestone.phase];
                      
                      return (
                        <div key={milestone.id} className="flex border-b border-border hover:bg-muted/10 transition-colors">
                          <div className="w-44 flex-shrink-0 p-3 pl-8 border-r border-border">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                              <span className="text-sm text-foreground">{milestone.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 pl-4">
                              {milestone.durationDays} days
                            </div>
                          </div>
                          <div className="flex relative">
                            {/* Week grid cells */}
                            {weekColumns.map((_, i) => (
                              <div
                                key={i}
                                className="border-r border-border/30"
                                style={{ width: columnWidth, height: 64 }}
                              />
                            ))}
                            {/* Milestone marker */}
                            <div
                              className="absolute flex flex-col items-center"
                              style={{
                                left: colIndex * columnWidth + columnWidth / 2 - 16,
                                top: 8,
                              }}
                            >
                              <div
                                className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center shadow-md`}
                              >
                                <span className="text-xs font-bold text-white">{milestoneIndex + 1}</span>
                              </div>
                              <div className="mt-1 text-center">
                                <div className="text-[10px] font-medium text-foreground whitespace-nowrap">
                                  {milestone.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {format(parseISO(milestone.end), 'MMM d, yyyy')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Summary comparison when 2 projects selected */}
              {projectTimelines.length === 2 && (
                <div className="p-4 bg-muted/30 border-t border-border">
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-muted-foreground font-medium">Difference:</span>
                    <span className="text-primary font-semibold">
                      {Math.abs(projectTimelines[0].totalDays - projectTimelines[1].totalDays)} days
                    </span>
                    {projectTimelines[0].totalDays !== projectTimelines[1].totalDays && (
                      <span className="text-muted-foreground">
                        ({projectTimelines[0].totalDays < projectTimelines[1].totalDays 
                          ? `${projectTimelines[0].project.featureName || 'Project 1'} is shorter`
                          : `${projectTimelines[1].project.featureName || 'Project 2'} is shorter`})
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
