import { formatDistanceToNow, format } from 'date-fns';
import { History, Edit, Save, Download, Plus, Trash2, Settings, Calendar } from 'lucide-react';
import { useProjectActivity, ProjectActivity } from '@/hooks/useProjectActivity';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectActivityLogProps {
  projectId: string | null;
  projectName?: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  updated: Edit,
  saved: Save,
  exported_json: Download,
  exported_monday: Download,
  preset_changed: Settings,
  milestone_added: Plus,
  milestone_removed: Trash2,
  sprint_added: Plus,
  sprint_removed: Trash2,
  dates_changed: Calendar,
};

const ACTION_LABELS: Record<string, string> = {
  created: 'Project created',
  updated: 'Project updated',
  saved: 'Project saved',
  exported_json: 'Exported to JSON',
  exported_monday: 'Exported to Monday.com',
  preset_changed: 'Preset changed',
  milestone_added: 'Milestone added',
  milestone_removed: 'Milestone removed',
  sprint_added: 'Sprint added',
  sprint_removed: 'Sprint removed',
  dates_changed: 'Dates updated',
};

function ActivityItem({ activity }: { activity: ProjectActivity }) {
  const Icon = ACTION_ICONS[activity.action] || Edit;
  const label = ACTION_LABELS[activity.action] || activity.action;
  const details = activity.details as Record<string, unknown>;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {details.description && (
          <p className="text-xs text-muted-foreground truncate">
            {String(details.description)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(activity.created_at), 'HH:mm')}
      </span>
    </div>
  );
}

export function ProjectActivityLog({ projectId, projectName }: ProjectActivityLogProps) {
  const { activities, isLoading } = useProjectActivity(projectId);

  if (!projectId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="w-4 h-4" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a project to view activity
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="w-4 h-4" />
          Activity Log
          {projectName && (
            <span className="text-muted-foreground font-normal">· {projectName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-4">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          ) : (
            <div className="py-2">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
