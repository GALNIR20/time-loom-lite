import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PresetType } from '@/types/timeline';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DbProject {
  id: string;
  feature_name: string;
  project_start: string;
  preset: string;
  show_detailed: boolean;
  overrides: Record<string, number | null>;
  hidden_milestones: string[];
  locked_dev_start: string | null;
  created_at: string;
  updated_at: string;
}

// Check if browser is online
function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Retry helper with exponential backoff and online check
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Wait for online status before attempting
    if (!isOnline()) {
      console.log('Browser offline, waiting...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!isOnline()) {
        throw new Error('No internet connection');
      }
    }
    
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export function useProjects() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  const retryCount = useRef(0);

  // Fetch all projects with retry logic
  const fetchProjects = useCallback(async () => {
    try {
      const data = await retryWithBackoff(async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return data;
      });

      const projectsData = (data || []).map(p => ({
        ...p,
        overrides: (p.overrides as Record<string, number | null>) || {},
        hidden_milestones: (p.hidden_milestones as string[]) || [],
      }));

      setProjects(projectsData);
      retryCount.current = 0; // Reset retry count on success
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // Show appropriate error based on type
      if (errorMsg.includes('internet') || errorMsg.includes('offline')) {
        toast.error('No internet connection. Please check your network.');
      } else if (retryCount.current === 0) {
        toast.error('Failed to load projects. Retrying...');
      }
      
      retryCount.current++;
      
      // Auto-retry with longer delays
      if (retryCount.current < 3) {
        setTimeout(() => fetchProjects(), 5000);
      } else {
        setProjects([]); // Clear to show empty state
        toast.error('Connection failed. Click refresh to try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    fetchProjects();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as DbProject;
            setProjects(prev => {
              if (prev.some(p => p.id === newProject.id)) return prev;
              return [{
                ...newProject,
                overrides: (newProject.overrides as Record<string, number | null>) || {},
                hidden_milestones: (newProject.hidden_milestones as string[]) || [],
              }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = payload.new as DbProject;
            setProjects(prev => 
              prev.map(p => 
                p.id === updatedProject.id 
                  ? {
                      ...updatedProject,
                      overrides: (updatedProject.overrides as Record<string, number | null>) || {},
                      hidden_milestones: (updatedProject.hidden_milestones as string[]) || [],
                    }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setProjects(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Also listen for manual refetch events (for cross-component sync)
    const handleRefetch = () => {
      fetchProjects();
    };
    window.addEventListener('refetchProjects', handleRefetch);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('refetchProjects', handleRefetch);
    };
  }, [fetchProjects]);

  // Create a new project
  const createProject = useCallback(async (data: {
    feature_name: string;
    project_start: string;
    preset: PresetType;
    show_detailed?: boolean;
    overrides?: Record<string, number | null>;
    hidden_milestones?: string[];
    locked_dev_start?: string | null;
  }) => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          feature_name: data.feature_name,
          project_start: data.project_start,
          preset: data.preset,
          show_detailed: data.show_detailed ?? true,
          overrides: data.overrides || {},
          hidden_milestones: data.hidden_milestones || [],
          locked_dev_start: data.locked_dev_start || null
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...project,
        overrides: (project.overrides as Record<string, number | null>) || {},
        hidden_milestones: (project.hidden_milestones as string[]) || [],
      } as DbProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, []);

  // Update an existing project
  const updateProject = useCallback(async (id: string, data: Partial<{
    feature_name: string;
    project_start: string;
    preset: string;
    show_detailed: boolean;
    overrides: Record<string, number | null>;
    hidden_milestones: string[];
    locked_dev_start: string | null;
  }>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to save changes');
      return false;
    }
  }, []);

  // Delete a project
  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Project deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  }, []);

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
