import { useState, useEffect, useCallback } from 'react';
import { pb } from '@/lib/pocketbase';

export interface ProjectActivity {
  id: string;
  project: string;
  action: string;
  details: Record<string, unknown>;
  created: string;
}

export function useProjectActivity(projectId: string | null) {
  const [activities, setActivities] = useState<ProjectActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await pb.collection('project_activity').getList(1, 50, {
        filter: `project = '${projectId}'`,
        sort: '-created',
      });

      setActivities(data.items.map(item => ({
        id: item.id,
        project: item.project as string,
        action: item.action as string,
        details: (item.details as Record<string, unknown>) || {},
        created: item.created,
      })));
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    if (projectId) {
      pb.collection('project_activity').subscribe('*', (data) => {
        if (data.action === 'create' && data.record.project === projectId) {
          const newActivity: ProjectActivity = {
            id: data.record.id,
            project: data.record.project as string,
            action: data.record.action as string,
            details: (data.record.details as Record<string, unknown>) || {},
            created: data.record.created,
          };
          setActivities(prev => [newActivity, ...prev].slice(0, 50));
        }
      });

      return () => {
        pb.collection('project_activity').unsubscribe('*');
      };
    }
  }, [projectId, fetchActivities]);

  return { activities, isLoading, refetch: fetchActivities };
}

// Helper function to log activity
export async function logActivity(
  projectId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  try {
    await pb.collection('project_activity').create({
      project: projectId,
      action,
      details,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
