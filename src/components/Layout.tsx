import { useState, useCallback, useEffect } from 'react';
import { ProjectSidebar, SavedProject } from './ProjectSidebar';
import { MobileNav } from './MobileNav';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { projects, loading, createProject, updateProject, duplicateProject, deleteProject, isProjectOwner, userId } = useProjects();
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
    milestoneChecklists: p.milestone_checklists || {},
    savedAt: p.updated,
    owner: p.owner,
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

  const handleDuplicateProject = useCallback(async (project: SavedProject) => {
    const newProject = await duplicateProject(project.id);
    if (newProject) {
      // Select the newly created project
      const saved: SavedProject = {
        id: newProject.id,
        featureName: newProject.feature_name,
        isFeatureNameSet: true,
        projectStart: newProject.project_start,
        preset: newProject.preset as SavedProject['preset'],
        showDetailed: newProject.show_detailed,
        overrides: newProject.overrides,
        hiddenMilestones: newProject.hidden_milestones,
        lockedDevStart: newProject.locked_dev_start,
        milestoneChecklists: newProject.milestone_checklists || {},
        savedAt: newProject.updated,
        owner: newProject.owner,
      };
      handleSelectProject(saved);
    }
  }, [duplicateProject, handleSelectProject]);

  const handleDeleteProject = useCallback(async (id: string) => {
    await deleteProject(id);
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      window.dispatchEvent(new CustomEvent('createNewProject'));
    }
    // Notify all components to refetch projects
    window.dispatchEvent(new CustomEvent('refetchProjects'));
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNav
          projects={savedProjects}
          currentProjectId={currentProjectId}
          onSelectProject={handleSelectProject}
          onCreateNew={handleCreateNewProject}
        />
      )}
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ProjectSidebar
          projects={savedProjects}
          currentProjectId={currentProjectId}
          currentUserId={userId}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onSelectProject={handleSelectProject}
          onCreateNew={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          onDuplicateProject={handleDuplicateProject}
        />
      )}
      
      {/* Main Content - add top padding on mobile for fixed nav */}
      <main className={`flex-1 ${isMobile ? 'pt-14' : ''}`}>
        {children}
      </main>
    </div>
  );
}
