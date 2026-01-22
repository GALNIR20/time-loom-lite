import { Calendar } from '@/components/ui/calendar';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { SavedProject } from '@/components/ProjectSidebar';
import { calculateTimeline, DEFAULT_MILESTONES, createSprintMilestone } from '@/lib/timeline';
import { MilestoneState } from '@/types/timeline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const PROJECTS_STORAGE_KEY = 'timeline-predictor-projects';

interface MilestoneEvent {
  milestone: MilestoneState;
  projectName: string;
  projectId: string;
}

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
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

    savedProjects.forEach((project) => {
      if (!project.isFeatureNameSet) return;

      // Build milestone configs including sprints
      const sprintCount = Object.keys(project.overrides).filter(k => k.startsWith('sprint-')).length;
      const milestoneConfigs = [
        ...DEFAULT_MILESTONES.filter(m => !project.hiddenMilestones.includes(m.id)),
        ...Array.from({ length: sprintCount }, (_, i) => createSprintMilestone(i + 1)),
      ];

      const milestones = calculateTimeline(
        milestoneConfigs,
        project.overrides,
        project.projectStart,
        project.preset
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
    if (!date) return [];

    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

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
  }, [date, allMilestones, selectedProjectId]);

  return (
    <div className="flex-1 p-8 bg-muted/30 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">View your project milestones</p>
          </div>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
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
                className="rounded-md pointer-events-auto"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {date ? format(date, 'MMMM yyyy') : 'Select a month'}
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
                  <div className="space-y-3 pr-4">
                    {monthMilestones.map((event, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-14 h-14 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {format(parseISO(event.milestone.start), 'd')}
                          </span>
                          <span className="text-primary text-[10px]">
                            {format(parseISO(event.milestone.start), 'MMM')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{event.milestone.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {event.projectName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.milestone.start), 'MMM d')} - {format(parseISO(event.milestone.end), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline">
                            {event.milestone.durationDays}d
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {event.milestone.phase}
                          </span>
                        </div>
                      </div>
                    ))}
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
