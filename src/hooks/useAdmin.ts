import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  role_assigned_at: string;
  project_count: number;
}

export interface AdminProject {
  id: string;
  feature_name: string;
  user_id: string;
  user_email: string;
  preset: string;
  created_at: string;
  updated_at: string;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allProjects, setAllProjects] = useState<AdminProject[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [user]);

  // Fetch all users (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingUsers(true);
    try {
      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (rolesError) throw rolesError;

      // Get project counts per user
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('user_id');

      if (projectsError) throw projectsError;

      // Count projects per user
      const projectCounts: Record<string, number> = {};
      projectsData?.forEach(p => {
        if (p.user_id) {
          projectCounts[p.user_id] = (projectCounts[p.user_id] || 0) + 1;
        }
      });

      // Build user list with project counts
      const userList: AdminUser[] = (rolesData || []).map(role => ({
        user_id: role.user_id,
        email: `User ${role.user_id.slice(0, 8)}...`, // We don't have access to auth.users, show partial ID
        role: role.role as 'admin' | 'user',
        role_assigned_at: role.created_at,
        project_count: projectCounts[role.user_id] || 0
      }));

      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  // Fetch all projects (admin only)
  const fetchAllProjects = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projects: AdminProject[] = (data || []).map(p => ({
        id: p.id,
        feature_name: p.feature_name,
        user_id: p.user_id || 'unknown',
        user_email: p.user_id ? `User ${p.user_id.slice(0, 8)}...` : 'No owner',
        preset: p.preset,
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      setAllProjects(projects);
    } catch (error) {
      console.error('Error fetching all projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [isAdmin]);

  // Promote user to admin
  const promoteToAdmin = useCallback(async (userId: string) => {
    try {
      // Check if already admin
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (existing) {
        toast.info('User is already an admin');
        return true;
      }

      // Insert admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;
      
      toast.success('User promoted to admin');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
      return false;
    }
  }, [fetchUsers]);

  // Demote admin to user
  const demoteFromAdmin = useCallback(async (userId: string) => {
    // Prevent self-demotion
    if (userId === user?.id) {
      toast.error("You cannot demote yourself");
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
      
      toast.success('Admin privileges removed');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error demoting user:', error);
      toast.error('Failed to demote user');
      return false;
    }
  }, [user?.id, fetchUsers]);

  // Delete a project (admin only)
  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      
      toast.success('Project deleted');
      fetchAllProjects();
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  }, [fetchAllProjects]);

  return {
    isAdmin,
    loading,
    users,
    allProjects,
    loadingUsers,
    loadingProjects,
    fetchUsers,
    fetchAllProjects,
    promoteToAdmin,
    demoteFromAdmin,
    deleteProject
  };
}
