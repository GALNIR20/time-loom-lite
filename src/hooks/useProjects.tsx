import { useState, useEffect, useCallback, useRef } from 'react';
import { pb } from '@/lib/pocketbase';
import { toast } from 'sonner';
import { PresetType } from '@/types/timeline';
import { logActivity } from '@/hooks/useProjectActivity';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';

export interface DbProject {
  id: string;
  feature_name: string;
  project_start: string;
  preset: string;
  show_detailed: boolean;
  overrides: Record<string, number | null>;
  hidden_milestones: string[];
  locked_dev_start: string | null;
  milestone_checklists: Record<string, string[]>;
  game: string;
  created: string;
  updated: string;
  owner: string;
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
  let lastErrorMessage = 'Unknown error';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (!isOnline()) {
      // Browser offline, waiting 2s...
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (!isOnline()) {
        throw new Error('No internet connection');
      }
    }

    try {
      return await fn();
    } catch (error) {
      lastErrorMessage = error instanceof Error ? error.message : String(error);
      // Retry attempt failed

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        // Retrying after delay
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(lastErrorMessage);
}

function recordToProject(record: Record<string, unknown>): DbProject {
  return {
    id: record.id as string,
    feature_name: record.feature_name as string,
    project_start: record.project_start as string,
    preset: record.preset as string,
    show_detailed: record.show_detailed as boolean,
    overrides: (record.overrides as Record<string, number | null>) || {},
    hidden_milestones: (record.hidden_milestones as string[]) || [],
    locked_dev_start: (record.locked_dev_start as string) || null,
    milestone_checklists: (record.milestone_checklists as Record<string, string[]>) || {},
    game: (record.game as string) || '',
    created: record.created as string,
    updated: record.updated as string,
    owner: record.owner as string,
  };
}

export function useProjects() {
  const { user } = useAuth();
  const { selectedGame } = useGame();
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);
  const retryCount = useRef(0);

  // Fetch all projects with retry logic, filtered by selected game
  const fetchProjects = useCallback(async () => {
    try {
      const data = await retryWithBackoff(async () => {
        return await pb.collection('projects').getFullList({
          sort: '-updated',
          requestKey: null, // disable auto-cancellation
          ...(selectedGame ? { filter: `game = "${selectedGame}"` } : {}),
        });
      });

      const projectsData = (data || []).map(p => recordToProject(p as unknown as Record<string, unknown>));
      setProjects(projectsData);
      retryCount.current = 0;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      if (errorMsg.includes('internet') || errorMsg.includes('offline')) {
        toast.error('No internet connection. Please check your network.');
      } else if (retryCount.current === 0) {
        toast.error('Failed to load projects. Retrying...');
      }

      retryCount.current++;

      if (retryCount.current < 3) {
        setTimeout(() => fetchProjects(), 5000);
      } else {
        setProjects([]);
        toast.error('Connection failed. Click refresh to try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedGame]);

  // Set up realtime subscription
  useEffect(() => {
    fetchProjects();

    // Subscribe to realtime changes on projects
    pb.collection('projects').subscribe('*', (data) => {
      // Realtime update received

      if (data.action === 'create') {
        const newProject = recordToProject(data.record as unknown as Record<string, unknown>);
        // Only add if it matches the current game filter
        if (selectedGame && newProject.game !== selectedGame) return;
        setProjects(prev => {
          if (prev.some(p => p.id === newProject.id)) return prev;
          return [newProject, ...prev];
        });
      } else if (data.action === 'update') {
        const updatedProject = recordToProject(data.record as unknown as Record<string, unknown>);
        setProjects(prev =>
          prev.map(p => p.id === updatedProject.id ? updatedProject : p)
        );
      } else if (data.action === 'delete') {
        setProjects(prev => prev.filter(p => p.id !== data.record.id));
      }
    });

    // Also listen for manual refetch events (for cross-component sync)
    const handleRefetch = () => {
      fetchProjects();
    };
    window.addEventListener('refetchProjects', handleRefetch);

    return () => {
      pb.collection('projects').unsubscribe('*');
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
    milestone_checklists?: Record<string, string[]>;
  }) => {
    try {
      if (!user) {
        toast.error('You must be logged in to create a project');
        return null;
      }

      const project = await pb.collection('projects').create({
        feature_name: data.feature_name,
        project_start: data.project_start,
        preset: data.preset,
        show_detailed: data.show_detailed ?? true,
        overrides: data.overrides || {},
        hidden_milestones: data.hidden_milestones || [],
        locked_dev_start: data.locked_dev_start || null,
        milestone_checklists: data.milestone_checklists || {},
        game: selectedGame || '',
        owner: user.id,
      });

      // Log activity
      logActivity(project.id, 'created', { description: `Created "${data.feature_name}"` });

      return recordToProject(project as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project');
      return null;
    }
  }, [user, selectedGame]);

  // Update an existing project
  const updateProject = useCallback(async (id: string, data: Partial<{
    feature_name: string;
    project_start: string;
    preset: string;
    show_detailed: boolean;
    overrides: Record<string, number | null>;
    hidden_milestones: string[];
    locked_dev_start: string | null;
    milestone_checklists: Record<string, string[]>;
  }>) => {
    try {
      await pb.collection('projects').update(id, data);

      // Log activity with change details
      const changes: string[] = [];
      if (data.preset) changes.push(`preset → ${data.preset}`);
      if (data.project_start) changes.push(`start date changed`);
      if (data.overrides) changes.push(`milestone durations adjusted`);

      logActivity(id, 'updated', {
        description: changes.length ? changes.join(', ') : 'Project settings updated'
      });

      return true;
    } catch (error) {
      console.error('Failed to update project:', error);
      toast.error('Failed to save changes');
      return false;
    }
  }, []);

  // Duplicate a project
  const duplicateProject = useCallback(async (id: string) => {
    try {
      if (!user) {
        toast.error('You must be logged in to duplicate a project');
        return null;
      }

      // Fetch the source project
      const source = await pb.collection('projects').getOne(id);

      // Create a copy with the current user as owner
      const project = await pb.collection('projects').create({
        feature_name: `${source.feature_name || 'Untitled'} (Copy)`,
        project_start: source.project_start,
        preset: source.preset,
        show_detailed: source.show_detailed,
        overrides: source.overrides || {},
        hidden_milestones: source.hidden_milestones || [],
        locked_dev_start: source.locked_dev_start || null,
        milestone_checklists: source.milestone_checklists || {},
        game: selectedGame || source.game || '',
        owner: user.id,
      });

      logActivity(project.id, 'created', { description: `Duplicated from "${source.feature_name}"` });
      toast.success(`Project duplicated as "${source.feature_name} (Copy)"`);

      return recordToProject(project as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      toast.error('Failed to duplicate project');
      return null;
    }
  }, [user, selectedGame]);

  // Delete a project
  const deleteProject = useCallback(async (id: string) => {
    try {
      await pb.collection('projects').delete(id);
      toast.success('Project deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project');
      return false;
    }
  }, []);

  const isProjectOwner = useCallback((projectId: string) => {
    if (!user) return false;
    const project = projects.find(p => p.id === projectId);
    return project?.owner === user.id;
  }, [user, projects]);

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    updateProject,
    duplicateProject,
    deleteProject,
    isProjectOwner,
    userId: user?.id || null,
  };
}
