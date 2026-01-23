import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { PresetType } from '@/types/timeline';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface DbProject {
  id: string;
  owner_id: string;
  feature_name: string;
  project_start: string;
  preset: string;
  show_detailed: boolean;
  overrides: Record<string, number | null>;
  hidden_milestones: string[];
  locked_dev_start: string | null;
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  email?: string;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Fetch projects the user has access to
  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectsWithOwnership = (data || []).map(p => ({
        ...p,
        overrides: (p.overrides as Record<string, number | null>) || {},
        hidden_milestones: (p.hidden_milestones as string[]) || [],
        is_owner: p.owner_id === user.id
      }));

      setProjects(projectsWithOwnership);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user) return;

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
              // Check if we already have this project
              if (prev.some(p => p.id === newProject.id)) return prev;
              return [{
                ...newProject,
                overrides: (newProject.overrides as Record<string, number | null>) || {},
                hidden_milestones: (newProject.hidden_milestones as string[]) || [],
                is_owner: newProject.owner_id === user.id
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
                      is_owner: updatedProject.owner_id === user.id
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
  }, [user, fetchProjects]);

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
    if (!user) {
      toast.error('You must be signed in to create projects');
      return null;
    }

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
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
        is_owner: true
      } as DbProject;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, [user]);

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
    if (!user) return false;

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
  }, [user]);

  // Delete a project
  const deleteProject = useCallback(async (id: string) => {
    if (!user) return false;

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
  }, [user]);

  // Get project members
  const getProjectMembers = useCallback(async (projectId: string): Promise<ProjectMember[]> => {
    if (!user) return [];

    try {
      // First get memberships
      const { data: memberships, error: memberError } = await supabase
        .from('project_memberships')
        .select('id, project_id, user_id, role')
        .eq('project_id', projectId);

      if (memberError) throw memberError;
      if (!memberships || memberships.length === 0) return [];

      // Then get profile emails for those users
      const userIds = memberships.map(m => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profileError) throw profileError;

      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));

      return memberships.map(m => ({
        id: m.id,
        project_id: m.project_id,
        user_id: m.user_id,
        role: m.role,
        email: emailMap.get(m.user_id)
      }));
    } catch (error) {
      console.error('Failed to get members:', error);
      return [];
    }
  }, [user]);

  // Share project with user by email
  const shareProject = useCallback(async (projectId: string, email: string) => {
    if (!user) {
      toast.error('You must be signed in');
      return false;
    }

    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase().trim())
        .limit(1);

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        toast.error('No user found with that email. They need to sign up first.');
        return false;
      }

      const targetUserId = profiles[0].id;

      // Check if already shared
      const { data: existing } = await supabase
        .from('project_memberships')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', targetUserId)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('Project is already shared with this user');
        return false;
      }

      // Get project name for email
      const project = projects.find(p => p.id === projectId);
      const projectName = project?.feature_name || 'Untitled Project';

      // Create membership
      const { error: insertError } = await supabase
        .from('project_memberships')
        .insert({
          project_id: projectId,
          user_id: targetUserId,
          role: 'editor'
        });

      if (insertError) throw insertError;

      // Send email notification (don't block on this)
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.access_token) {
          await supabase.functions.invoke('send-share-notification', {
            body: {
              recipientEmail: email.toLowerCase().trim(),
              projectName: projectName,
              sharedByEmail: user.email || 'Someone'
            }
          });
        }
      } catch (emailError) {
        console.warn('Failed to send share notification email:', emailError);
        // Don't fail the share operation if email fails
      }

      toast.success(`Project shared with ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to share project:', error);
      toast.error('Failed to share project');
      return false;
    }
  }, [user, projects]);

  // Remove member from project
  const removeMember = useCallback(async (membershipId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('project_memberships')
        .delete()
        .eq('id', membershipId);

      if (error) throw error;
      toast.success('Member removed');
      return true;
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
      return false;
    }
  }, [user]);

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectMembers,
    shareProject,
    removeMember
  };
}
