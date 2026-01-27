import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  user_id: string;
  email: string;
  role: 'admin' | 'user';
  is_approved: boolean;
  role_assigned_at: string;
  project_count: number;
  created_at: string;
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

  // Fetch all users via edge function (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-users');

      if (error) throw error;

      if (data?.users) {
        setUsers(data.users);
      }
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

      // Create email map from users
      const emailMap: Record<string, string> = {};
      users.forEach(u => {
        emailMap[u.user_id] = u.email;
      });

      const projects: AdminProject[] = (data || []).map(p => ({
        id: p.id,
        feature_name: p.feature_name,
        user_id: p.user_id || 'unknown',
        user_email: p.user_id ? (emailMap[p.user_id] || `User ${p.user_id.slice(0, 8)}...`) : 'No owner',
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
  }, [isAdmin, users]);

  // Approve a user
  const approveUser = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_approved: true })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('User approved');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
      return false;
    }
  }, [fetchUsers]);

  // Reject/revoke approval from a user
  const revokeApproval = useCallback(async (userId: string) => {
    // Prevent self-revocation
    if (userId === user?.id) {
      toast.error("You cannot revoke your own approval");
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_approved: false })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('User approval revoked');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error revoking approval:', error);
      toast.error('Failed to revoke approval');
      return false;
    }
  }, [user?.id, fetchUsers]);

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

      // Update to admin role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId);

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
        .update({ role: 'user' })
        .eq('user_id', userId);

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
    approveUser,
    revokeApproval,
    promoteToAdmin,
    demoteFromAdmin,
    deleteProject
  };
}
