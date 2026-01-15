import { useState, useMemo } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO, differenceInDays, min, max } from 'date-fns';
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

const PHASE_COLORS: Record<string, string> = {
  'Concept Phase': 'bg-phase-concept',
  'Sketch Phase': 'bg-phase-sketch',
  'Development': 'bg-phase-dev',
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
    const totalDays = differenceInDays(end, start);

    return { start, end, totalDays };
  }, [projectTimelines]);

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

  const getBarPosition = (start: string, end: string) => {
    if (dateRange.totalDays === 0) return { left: '0%', width: '100%' };
    
    const startOffset = differenceInDays(parseISO(start), dateRange.start);
    const duration = differenceInDays(parseISO(end), parseISO(start));
    
    const left = (startOffset / dateRange.totalDays) * 100;
    const width = Math.max((duration / dateRange.totalDays) * 100, 1);
    
    return { left: `${left}%`, width: `${width}%` };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Compare Projects</h2>
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
              onChange={(e) => setSelectedProject1(e.target.value || null)}
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
              onChange={(e) => setSelectedProject2(e.target.value || null)}
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

        {/* Comparison Timeline */}
        <div className="flex-1 overflow-auto p-4">
          {projectTimelines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Select at least one project to compare
            </div>
          ) : (
            <div className="space-y-2">
              {/* Date header */}
              <div className="flex items-center mb-4">
                <div className="w-48 flex-shrink-0" />
                <div className="flex-1 flex justify-between text-xs text-muted-foreground px-1">
                  <span>{format(dateRange.start, 'MMM d, yyyy')}</span>
                  <span>{format(dateRange.end, 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Project rows */}
              {projectTimelines.map(({ project, milestones, totalDays }) => {
                const isExpanded = expandedProjects.has(project.id);
                
                return (
                  <div key={project.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Project header row */}
                    <div className="flex items-center bg-muted/30">
                      <button
                        onClick={() => toggleExpanded(project.id)}
                        className="w-48 flex-shrink-0 p-3 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {project.featureName || 'Untitled Project'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.preset} • {totalDays} days
                          </div>
                        </div>
                      </button>
                      
                      {/* Combined Gantt bar */}
                      <div className="flex-1 h-10 relative mx-2">
                        {milestones.map((milestone) => {
                          const pos = getBarPosition(milestone.start, milestone.end);
                          return (
                            <div
                              key={milestone.id}
                              className={`absolute top-1 bottom-1 rounded ${PHASE_COLORS[milestone.phase]} opacity-80`}
                              style={{ left: pos.left, width: pos.width }}
                              title={`${milestone.name}: ${milestone.durationDays} days`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Expanded milestone rows */}
                    {isExpanded && (
                      <div className="bg-card">
                        {milestones.map((milestone) => {
                          const pos = getBarPosition(milestone.start, milestone.end);
                          return (
                            <div key={milestone.id} className="flex items-center border-t border-border">
                              <div className="w-48 flex-shrink-0 p-2 pl-10">
                                <div className="text-sm text-foreground">{milestone.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {milestone.durationDays} days
                                </div>
                              </div>
                              <div className="flex-1 h-8 relative mx-2">
                                <div
                                  className={`absolute top-1 bottom-1 rounded ${PHASE_COLORS[milestone.phase]}`}
                                  style={{ left: pos.left, width: pos.width }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summary comparison */}
              {projectTimelines.length === 2 && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Comparison Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div />
                    <div className="font-medium text-foreground">
                      {projectTimelines[0].project.featureName || 'Project 1'}
                    </div>
                    <div className="font-medium text-foreground">
                      {projectTimelines[1].project.featureName || 'Project 2'}
                    </div>
                    
                    <div className="text-muted-foreground">Preset</div>
                    <div>{projectTimelines[0].project.preset}</div>
                    <div>{projectTimelines[1].project.preset}</div>
                    
                    <div className="text-muted-foreground">Total Days</div>
                    <div>{projectTimelines[0].totalDays}</div>
                    <div>{projectTimelines[1].totalDays}</div>
                    
                    <div className="text-muted-foreground">Difference</div>
                    <div className="col-span-2 text-primary font-medium">
                      {Math.abs(projectTimelines[0].totalDays - projectTimelines[1].totalDays)} days
                      {projectTimelines[0].totalDays !== projectTimelines[1].totalDays && (
                        <span className="text-muted-foreground font-normal">
                          {' '}({projectTimelines[0].totalDays < projectTimelines[1].totalDays 
                            ? `${projectTimelines[0].project.featureName || 'Project 1'} is shorter`
                            : `${projectTimelines[1].project.featureName || 'Project 2'} is shorter`})
                        </span>
                      )}
                    </div>
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
