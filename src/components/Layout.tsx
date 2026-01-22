import { useState, useCallback, useEffect } from 'react';
import { ProjectSidebar, SavedProject } from './ProjectSidebar';
import { PresetType } from '@/types/timeline';
import { useNavigate } from 'react-router-dom';

const PROJECTS_STORAGE_KEY = 'timeline-predictor-projects';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Load projects from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (stored) {
        const projects = JSON.parse(stored) as SavedProject[];
        setSavedProjects(projects);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  const handleSelectProject = useCallback((project: SavedProject) => {
    setCurrentProjectId(project.id);
    // Navigate to dashboard and dispatch event to load project
    navigate('/');
    window.dispatchEvent(new CustomEvent('loadProject', { detail: project }));
  }, [navigate]);

  const handleCreateNewProject = useCallback(() => {
    setCurrentProjectId(null);
    navigate('/');
    window.dispatchEvent(new CustomEvent('createNewProject'));
  }, [navigate]);

  const handleDeleteProject = useCallback((id: string) => {
    setSavedProjects(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
  }, [currentProjectId]);

  // Listen for project updates from Index page
  useEffect(() => {
    const handleProjectsUpdate = (e: CustomEvent<SavedProject[]>) => {
      setSavedProjects(e.detail);
    };
    const handleCurrentProjectUpdate = (e: CustomEvent<string | null>) => {
      setCurrentProjectId(e.detail);
    };
    
    window.addEventListener('projectsUpdated', handleProjectsUpdate as EventListener);
    window.addEventListener('currentProjectUpdated', handleCurrentProjectUpdate as EventListener);
    
    return () => {
      window.removeEventListener('projectsUpdated', handleProjectsUpdate as EventListener);
      window.removeEventListener('currentProjectUpdated', handleCurrentProjectUpdate as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <ProjectSidebar
        projects={savedProjects}
        currentProjectId={currentProjectId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSelectProject={handleSelectProject}
        onCreateNew={handleCreateNewProject}
        onDeleteProject={handleDeleteProject}
      />
      {children}
    </div>
  );
}
