import { useState, useCallback, useEffect } from 'react';
import { ProjectSidebar, SavedProject } from './ProjectSidebar';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { projects, loading, createProject, updateProject, deleteProject } = useProjects();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Convert DbProject to SavedProject format for sidebar compatibility
  const savedProjects: SavedProject[] = projects.map(p => ({
    id: p.id,
    featureName: p.feature_name,
    isFeatureNameSet: true,
    projectStart: p.project_start,
    preset: p.preset as SavedProject['preset'],
    showDetailed: p.show_detailed,
    overrides: p.overrides,
    hiddenMilestones: p.hidden_milestones,
    lockedDevStart: p.locked_dev_start,
    savedAt: p.updated_at
  }));

  const handleSelectProject = useCallback((project: SavedProject) => {
    setCurrentProjectId(project.id);
    navigate('/');
    window.dispatchEvent(new CustomEvent('loadProject', { detail: project }));
  }, [navigate]);

  const handleCreateNewProject = useCallback(() => {
    setCurrentProjectId(null);
    navigate('/');
    window.dispatchEvent(new CustomEvent('createNewProject'));
  }, [navigate]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
    if (currentProjectId === id) {
      setCurrentProjectId(null);
    }
  }, [currentProjectId, deleteProject]);

  // Listen for project updates from Index page
  useEffect(() => {
    const handleCurrentProjectUpdate = (e: CustomEvent<string | null>) => {
      setCurrentProjectId(e.detail);
    };
    
    window.addEventListener('currentProjectUpdated', handleCurrentProjectUpdate as EventListener);
    
    return () => {
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
