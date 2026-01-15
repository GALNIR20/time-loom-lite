import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays, min, max, addDays } from 'date-fns';
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

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Concept Phase': { bg: 'bg-phase-concept', border: 'border-phase-concept', text: 'text-phase-concept' },
  'Sketch Phase': { bg: 'bg-phase-sketch', border: 'border-phase-sketch', text: 'text-phase-sketch' },
  'Development': { bg: 'bg-phase-dev', border: 'border-phase-dev', text: 'text-phase-dev' },
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

  // Calculate overall date range for the Gantt chart
  const dateRange = useMemo(() => {
    if (projectTimelines.length === 0) return { start: new Date(), end: new Date(), totalDays: 0 };

    const allDates = projectTimelines.flatMap((t) => [parseISO(t.startDate), parseISO(t.endDate)]);
    const start = min(allDates);
    const end = max(allDates);
    const totalDays = Math.max(differenceInDays(end, start), 1);

    return { start, end, totalDays };
  }, [projectTimelines]);

  // Generate week markers
  const weekMarkers = useMemo(() => {
    if (dateRange.totalDays === 0) return [];
    const markers = [];
    let current = dateRange.start;
    while (current <= dateRange.end) {
      markers.push(current);
      current = addDays(current, 7);
    }
    return markers;
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

  const getBarStyle = (start: string, end: string) => {
    if (dateRange.totalDays === 0) return { left: '0%', width: '100%' };
    
    const startOffset = differenceInDays(parseISO(start), dateRange.start);
    const duration = Math.max(differenceInDays(parseISO(end), parseISO(start)), 1);
    
    const left = (startOffset / dateRange.totalDays) * 100;
    const width = (duration / dateRange.totalDays) * 100;
    
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Compare Timelines</h2>
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

        {/* Timeline Comparison */}
        <div className="flex-1 overflow-auto">
          {projectTimelines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Select at least one project to compare
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* Timeline Header with Week Markers */}
              <div className="sticky top-0 bg-card z-10 border-b border-border">
                <div className="flex">
                  <div className="w-56 flex-shrink-0 p-3 border-r border-border">
                    <span className="text-xs font-medium text-muted-foreground">Milestone</span>
                  </div>
                  <div className="w-20 flex-shrink-0 p-3 border-r border-border text-center">
                    <span className="text-xs font-medium text-muted-foreground">Days</span>
                  </div>
                  <div className="flex-1 relative h-10">
                    {/* Week grid lines */}
                    {weekMarkers.map((date, i) => {
                      const offset = (differenceInDays(date, dateRange.start) / dateRange.totalDays) * 100;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-border"
                          style={{ left: `${offset}%` }}
                        >
                          <span className="absolute top-2 left-1 text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(date, 'MMM d')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Project Timelines */}
              {projectTimelines.map(({ project, milestones, totalDays }, projectIndex) => {
                const isExpanded = expandedProjects.has(project.id);
                
                return (
                  <div key={project.id} className={projectIndex > 0 ? 'border-t-4 border-primary/20' : ''}>
                    {/* Project Header Row */}
                    <div className="flex bg-muted/40 border-b border-border">
                      <button
                        onClick={() => toggleExpanded(project.id)}
                        className="w-56 flex-shrink-0 p-3 border-r border-border flex items-center gap-2 hover:bg-muted/60 transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">
                            {project.featureName || 'Untitled Project'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.preset} preset
                          </div>
                        </div>
                      </button>
                      <div className="w-20 flex-shrink-0 p-3 border-r border-border flex items-center justify-center">
                        <span className="text-sm font-semibold text-foreground">{totalDays}</span>
                      </div>
                      <div className="flex-1 relative py-2 px-1">
                        {/* Week grid lines */}
                        {weekMarkers.map((date, i) => {
                          const offset = (differenceInDays(date, dateRange.start) / dateRange.totalDays) * 100;
                          return (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-l border-border/50"
                              style={{ left: `${offset}%` }}
                            />
                          );
                        })}
                        {/* Combined milestone bar */}
                        <div className="relative h-8 flex items-center">
                          {milestones.map((milestone) => {
                            const style = getBarStyle(milestone.start, milestone.end);
                            const colors = PHASE_COLORS[milestone.phase];
                            return (
                              <div
                                key={milestone.id}
                                className={`absolute top-1 bottom-1 ${colors.bg} rounded-sm opacity-90 hover:opacity-100 transition-opacity cursor-pointer`}
                                style={{ left: style.left, width: style.width }}
                                title={`${milestone.name}: ${milestone.durationDays} days (${format(parseISO(milestone.start), 'MMM d')} - ${format(parseISO(milestone.end), 'MMM d')})`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Milestone Rows */}
                    {isExpanded && milestones.map((milestone) => {
                      const style = getBarStyle(milestone.start, milestone.end);
                      const colors = PHASE_COLORS[milestone.phase];
                      
                      return (
                        <div key={milestone.id} className="flex border-b border-border hover:bg-muted/20 transition-colors">
                          <div className="w-56 flex-shrink-0 p-3 pl-10 border-r border-border">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                              <span className="text-sm text-foreground">{milestone.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 pl-4">
                              {format(parseISO(milestone.start), 'MMM d')} → {format(parseISO(milestone.end), 'MMM d')}
                            </div>
                          </div>
                          <div className="w-20 flex-shrink-0 p-3 border-r border-border flex items-center justify-center">
                            <span className="text-sm text-foreground">{milestone.durationDays}</span>
                          </div>
                          <div className="flex-1 relative py-2 px-1">
                            {/* Week grid lines */}
                            {weekMarkers.map((date, i) => {
                              const offset = (differenceInDays(date, dateRange.start) / dateRange.totalDays) * 100;
                              return (
                                <div
                                  key={i}
                                  className="absolute top-0 bottom-0 border-l border-border/30"
                                  style={{ left: `${offset}%` }}
                                />
                              );
                            })}
                            {/* Milestone bar */}
                            <div className="relative h-6 flex items-center">
                              <div
                                className={`absolute top-0.5 bottom-0.5 ${colors.bg} rounded flex items-center justify-center overflow-hidden`}
                                style={{ left: style.left, width: style.width }}
                              >
                                <span className="text-[10px] font-medium text-white truncate px-1">
                                  {milestone.name}
                                </span>
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

        {/* Legend */}
        <div className="p-4 border-t border-border flex items-center gap-6 text-xs">
          <span className="text-muted-foreground">Phases:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-phase-concept" />
            <span className="text-muted-foreground">Concept</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-phase-sketch" />
            <span className="text-muted-foreground">Sketch</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-phase-dev" />
            <span className="text-muted-foreground">Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
