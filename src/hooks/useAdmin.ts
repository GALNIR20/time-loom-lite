import { useState, useEffect, useCallback } from 'react';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  is_approved: boolean;
  allowed_games: string[];
  created: string;
  project_count: number;
}

export interface AdminProject {
  id: string;
  feature_name: string;
  owner: string;
  user_email: string;
  preset: string;
  created: string;
  updated: string;
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allProjects, setAllProjects] = useState<AdminProject[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Check if current user is admin (role is on the user record)
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(user.role === 'admin');
    setLoading(false);
  }, [user]);

  // Fetch all users (admin only — requires proper PocketBase API rules)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    if (!pb.authStore.isValid) {
      // No valid session, skipping user fetch
      return;
    }

    setLoadingUsers(true);
    try {
      // Fetch all users and all projects to compute counts
      const usersData = await pb.collection('users').getFullList({ requestKey: 'admin-users' });
      const projectsData = await pb.collection('projects').getFullList({ requestKey: 'admin-users-projects' });

      // Count projects per user
      const projectCounts: Record<string, number> = {};
      projectsData.forEach(p => {
        const ownerId = p.owner as string;
        if (ownerId) {
          projectCounts[ownerId] = (projectCounts[ownerId] || 0) + 1;
        }
      });

      setUsers(usersData.map(u => ({
        id: u.id,
        email: u.email as string,
        role: (u.role as 'admin' | 'user') || 'user',
        is_approved: (u.is_approved as boolean) ?? false,
        allowed_games: (u.allowed_games as string[]) || [],
        created: u.created,
        project_count: projectCounts[u.id] || 0,
      })));
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
      // Fetch projects with expanded owner to get email directly
      const data = await pb.collection('projects').getFullList({
        sort: '-updated',
        expand: 'owner',
        requestKey: 'admin-projects',
      });

      const projects: AdminProject[] = data.map(p => {
        const expandedOwner = p.expand?.owner as { email?: string } | undefined;
        return {
          id: p.id,
          feature_name: p.feature_name as string,
          owner: (p.owner as string) || 'unknown',
          user_email: expandedOwner?.email || 'Unknown',
          preset: p.preset as string,
          created: p.created,
          updated: p.updated,
        };
      });

      setAllProjects(projects);
    } catch (error) {
      console.error('Error fetching all projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  }, [isAdmin]);

  // Approve a user
  const approveUser = useCallback(async (userId: string) => {
    try {
      await pb.collection('users').update(userId, { is_approved: true });
      toast.success('User approved');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
      return false;
    }
  }, [fetchUsers]);

  // Revoke approval from a user
  const revokeApproval = useCallback(async (userId: string) => {
    if (userId === user?.id) {
      toast.error("You cannot revoke your own approval");
      return false;
    }

    try {
      await pb.collection('users').update(userId, { is_approved: false });
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
      const targetUser = users.find(u => u.id === userId);
      if (targetUser?.role === 'admin') {
        toast.info('User is already an admin');
        return true;
      }

      await pb.collection('users').update(userId, { role: 'admin' });
      toast.success('User promoted to admin');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
      return false;
    }
  }, [users, fetchUsers]);

  // Demote admin to user
  const demoteFromAdmin = useCallback(async (userId: string) => {
    if (userId === user?.id) {
      toast.error("You cannot demote yourself");
      return false;
    }

    try {
      await pb.collection('users').update(userId, { role: 'user' });
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
      await pb.collection('projects').delete(projectId);
      toast.success('Project deleted');
      fetchAllProjects();
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  }, [fetchAllProjects]);

  // Update allowed games for a user
  const updateUserGames = useCallback(async (userId: string, games: string[]) => {
    try {
      await pb.collection('users').update(userId, { allowed_games: games });
      toast.success('User game access updated');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating user games:', error);
      toast.error('Failed to update game access');
      return false;
    }
  }, [fetchUsers]);

  // Decline a pending user (deletes the user account)
  const declineUser = useCallback(async (userId: string) => {
    try {
      await pb.collection('users').delete(userId);
      toast.success('User declined');
      fetchUsers();
      return true;
    } catch (error) {
      console.error('Error declining user:', error);
      toast.error('Failed to decline user');
      return false;
    }
  }, [fetchUsers]);

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
    deleteProject,
    declineUser,
    updateUserGames,
  };
}
