import { useState, useEffect, useCallback } from 'react';
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

export function useProjects() {
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectsData = (data || []).map(p => ({
        ...p,
        overrides: (p.overrides as Record<string, number | null>) || {},
        hidden_milestones: (p.hidden_milestones as string[]) || [],
      }));

      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
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
