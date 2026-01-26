import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface ProjectActivity {
  id: string;
  project_id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
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
      const { data, error } = await supabase
        .from('project_activity')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities((data as ProjectActivity[]) || []);
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
      const channel = supabase
        .channel(`activity-${projectId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'project_activity',
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            setActivities((prev) => [payload.new as ProjectActivity, ...prev].slice(0, 50));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
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
    const { error } = await supabase.from('project_activity').insert([{
      project_id: projectId,
      action,
      details: details as Json,
    }]);
    if (error) console.error('Failed to log activity:', error);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
