import { Calendar } from '@/components/ui/calendar';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addMonths, subMonths, isSameDay, eachDayOfInterval } from 'date-fns';
import { SavedProject } from '@/components/ProjectSidebar';
import { calculateTimeline, createSprintMilestone } from '@/lib/timeline';
import { MilestoneState } from '@/types/timeline';
import { getCustomMilestoneConfigs, getCustomPresetConfigs } from '@/hooks/useMilestoneSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayContentProps } from 'react-day-picker';

const PROJECTS_STORAGE_KEY = 'timeline-predictor-projects';

interface MilestoneEvent {
  milestone: MilestoneState;
  projectName: string;
  projectId: string;
}

// Milestone color mapping based on milestone ID
const getMilestoneColor = (milestoneId: string): { bg: string; text: string; border: string } => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'brief': { bg: 'bg-milestone-brief/10', text: 'text-milestone-brief', border: 'border-milestone-brief/30' },
    'pre-concept': { bg: 'bg-milestone-pre-concept/10', text: 'text-milestone-pre-concept', border: 'border-milestone-pre-concept/30' },
    'concept': { bg: 'bg-milestone-concept/10', text: 'text-milestone-concept', border: 'border-milestone-concept/30' },
    'art-sketch': { bg: 'bg-milestone-art-sketch/10', text: 'text-milestone-art-sketch', border: 'border-milestone-art-sketch/30' },
    'sketch': { bg: 'bg-milestone-sketch/10', text: 'text-milestone-sketch', border: 'border-milestone-sketch/30' },
    'i-phase': { bg: 'bg-milestone-i-phase/10', text: 'text-milestone-i-phase', border: 'border-milestone-i-phase/30' },
  };

  // Handle sprints
  if (milestoneId.startsWith('sprint-')) {
    return { bg: 'bg-milestone-sprint/10', text: 'text-milestone-sprint', border: 'border-milestone-sprint/30' };
  }

  return colorMap[milestoneId] || { bg: 'bg-muted/50', text: 'text-foreground', border: 'border-border' };
};

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Load projects from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (stored) {
        const projects = JSON.parse(stored) as SavedProject[];
        setSavedProjects(projects);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }

    // Listen for project updates
    const handleProjectsUpdate = (e: CustomEvent<SavedProject[]>) => {
      setSavedProjects(e.detail);
    };
    window.addEventListener('projectsUpdated', handleProjectsUpdate as EventListener);
    return () => {
      window.removeEventListener('projectsUpdated', handleProjectsUpdate as EventListener);
    };
  }, []);

  // Calculate milestones for all projects
  const allMilestones = useMemo(() => {
    const result: { milestone: MilestoneState; projectName: string; projectId: string }[] = [];
    const customMilestones = getCustomMilestoneConfigs();
    const customPresetConfigs = getCustomPresetConfigs();

    savedProjects.forEach((project) => {
      if (!project.isFeatureNameSet) return;

      // Build milestone configs including sprints
      const sprintCount = Object.keys(project.overrides).filter(k => k.startsWith('sprint-')).length;
      const milestoneConfigs = [
        ...customMilestones.filter(m => !project.hiddenMilestones.includes(m.id)),
        ...Array.from({ length: sprintCount }, (_, i) => createSprintMilestone(i + 1)),
      ];

      const milestones = calculateTimeline(
        milestoneConfigs,
        project.overrides,
        project.projectStart,
        project.preset,
        customPresetConfigs
      );

      milestones.forEach((milestone) => {
        result.push({
          milestone,
          projectName: project.featureName || 'Untitled Project',
          projectId: project.id,
        });
      });
    });

    return result;
  }, [savedProjects]);

  // Filter milestones for the selected month
  const monthMilestones = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const filtered = selectedProjectId === 'all'
      ? allMilestones
      : allMilestones.filter(m => m.projectId === selectedProjectId);

    const events: MilestoneEvent[] = [];

    filtered.forEach(({ milestone, projectName, projectId }) => {
      const startDate = parseISO(milestone.start);
      const endDate = parseISO(milestone.end);

      // Check if milestone overlaps with the current month
      const milestoneOverlapsMonth = 
        isWithinInterval(startDate, { start: monthStart, end: monthEnd }) ||
        isWithinInterval(endDate, { start: monthStart, end: monthEnd }) ||
        (startDate <= monthStart && endDate >= monthEnd);

      if (milestoneOverlapsMonth) {
        events.push({ milestone, projectName, projectId });
      }
    });

    // Sort by start date
    return events.sort((a, b) => 
      parseISO(a.milestone.start).getTime() - parseISO(b.milestone.start).getTime()
    );
  }, [month, allMilestones, selectedProjectId]);

  // Build a map of dates to milestone colors for the calendar dots
  const dateMilestoneMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    
    const filtered = selectedProjectId === 'all'
      ? allMilestones
      : allMilestones.filter(m => m.projectId === selectedProjectId);

    filtered.forEach(({ milestone }) => {
      const startDate = parseISO(milestone.start);
      const endDate = parseISO(milestone.end);
      
      // Get all days in the milestone range
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, new Set());
        }
        map.get(dateKey)!.add(milestone.id);
      });
    });

    return map;
  }, [allMilestones, selectedProjectId]);

  // Custom day content renderer with milestone dots
  const renderDayContent = useCallback((props: DayContentProps) => {
    const dateKey = format(props.date, 'yyyy-MM-dd');
    const milestoneIds = dateMilestoneMap.get(dateKey);
    
    // Get unique colors for this day (max 4 dots)
    const dots: string[] = [];
    if (milestoneIds) {
      const uniqueColors = new Set<string>();
      milestoneIds.forEach(id => {
        const colors = getMilestoneColor(id);
        if (!uniqueColors.has(colors.text) && dots.length < 4) {
          uniqueColors.add(colors.text);
          dots.push(colors.text);
        }
      });
    }

    return (
      <div className="relative flex flex-col items-center">
        <span>{props.date.getDate()}</span>
        {dots.length > 0 && (
          <div className="absolute -bottom-1 flex gap-0.5">
            {dots.map((color, idx) => (
              <div 
                key={idx} 
                className={`w-1 h-1 rounded-full ${color.replace('text-', 'bg-')}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [dateMilestoneMap]);

  const handlePrevMonth = () => {
    setMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setMonth(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setMonth(new Date());
    setDate(new Date());
  };

  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header with month navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {format(month, 'MMMM yyyy')}
            </h1>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">All Projects</SelectItem>
              {savedProjects.filter(p => p.isFeatureNameSet).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.featureName || 'Untitled Project'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-[350px_1fr] gap-6">
          <Card>
            <CardContent className="pt-6">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                month={month}
                onMonthChange={setMonth}
                className="rounded-md pointer-events-auto"
                components={{
                  DayContent: renderDayContent
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Milestones in {format(month, 'MMMM')}</span>
                <Badge variant="secondary">{monthMilestones.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {savedProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No projects yet</p>
                  <p className="text-sm mt-1">Create a project to see milestones here</p>
                </div>
              ) : monthMilestones.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="pr-4">
                    {(() => {
                      // Group milestones by month
                      const groupedByMonth: Record<string, MilestoneEvent[]> = {};
                      monthMilestones.forEach(event => {
                        const monthKey = format(parseISO(event.milestone.start), 'MMMM yyyy');
                        if (!groupedByMonth[monthKey]) {
                          groupedByMonth[monthKey] = [];
                        }
                        groupedByMonth[monthKey].push(event);
                      });

                      return Object.entries(groupedByMonth).map(([monthKey, events]) => (
                        <div key={monthKey} className="mb-4">
                          <div className="sticky top-0 bg-card z-10 py-2 mb-2 border-b border-border">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                              {monthKey}
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {events.map((event, idx) => {
                              const colors = getMilestoneColor(event.milestone.id);
                              return (
                                <div 
                                  key={idx} 
                                  className={`flex items-center gap-4 p-4 rounded-xl border ${colors.bg} ${colors.border}`}
                                >
                                  <div className={`w-14 h-14 rounded-lg ${colors.bg} flex flex-col items-center justify-center border ${colors.border}`}>
                                    <span className={`font-bold text-sm ${colors.text}`}>
                                      {format(parseISO(event.milestone.start), 'd')}
                                    </span>
                                    <span className={`text-[10px] ${colors.text}`}>
                                      {format(parseISO(event.milestone.start), 'MMM')}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-semibold truncate ${colors.text}`}>{event.milestone.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {event.projectName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(parseISO(event.milestone.start), 'MMM d')} → {format(parseISO(event.milestone.end), 'MMM d')}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={`${colors.text} border-current`}>
                                      {event.milestone.durationDays}d
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {event.milestone.phase}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No milestones this month</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
