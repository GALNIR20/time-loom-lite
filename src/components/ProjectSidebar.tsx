import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, ChevronDown, Calendar, Settings, LogOut, Share2 } from 'lucide-react';
import { PresetType } from '@/types/timeline';
import { PredictorLogo } from '@/components/PredictorLogo';
import { useAuth } from '@/hooks/useAuth';

export interface SavedProject {
  id: string;
  featureName: string;
  isFeatureNameSet: boolean;
  projectStart: string;
  preset: PresetType;
  showDetailed: boolean;
  overrides: Record<string, number | null>;
  hiddenMilestones: string[];
  lockedDevStart: string | null;
  savedAt: string;
}

interface ProjectSidebarProps {
  projects: SavedProject[];
  currentProjectId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectProject: (project: SavedProject) => void;
  onCreateNew: () => void;
  onDeleteProject: (id: string) => void;
  onShareProject?: (id: string) => void;
}

export function ProjectSidebar({
  projects,
  currentProjectId,
  isCollapsed,
  onToggleCollapse,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
  onShareProject,
}: ProjectSidebarProps) {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const isOnDashboard = location.pathname === '/';

  if (isCollapsed) {
    return (
      <div className="w-16 bg-background border-r border-border/50 flex flex-col items-center py-6 shadow-sm">
        <button
          onClick={onToggleCollapse}
          className="mb-8"
          aria-label="Expand sidebar"
        >
          <PredictorLogo size="md" />
        </button>
        <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2">
          <button
            onClick={() => {
              navigate('/');
              onCreateNew();
            }}
            className="p-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Create project"
          >
            <Plus className="w-5 h-5" />
          </button>
          {projects.slice(0, 5).map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={`p-3 rounded-xl transition-colors relative ${
                currentProjectId === project.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
              aria-label={project.featureName || 'Untitled project'}
              title={project.featureName || 'Untitled project'}
            >
              <FolderOpen className="w-5 h-5" />
              {currentProjectId === project.id && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="w-60 bg-background border-r border-border/50 flex flex-col h-full shadow-sm">
      {/* Logo Header */}
      <div className="p-6 flex items-center gap-3">
        <PredictorLogo size="md" />
        <span className="font-bold text-foreground text-xl tracking-tight">PREDICTOR</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto">
        {/* Create Project Button */}
        <button
          onClick={() => {
            navigate('/');
            onCreateNew();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-3"
        >
          <Plus className="w-5 h-5" />
          <span>Create Project</span>
        </button>

        {/* Projects Folder */}
        <div className="mt-2">
          <button
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-5 h-5" />
              <span>Project</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProjectsExpanded ? 'rotate-0' : '-rotate-90'}`} />
          </button>

          {/* Projects List */}
          {isProjectsExpanded && (
            <div className="mt-1 ml-6 pl-4 border-l-2 border-border/50 space-y-1">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 pl-2">
                  No projects yet
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = currentProjectId === project.id;
                  return (
                    <div
                      key={project.id}
                      className="group flex items-center justify-between relative"
                    >
                      <button
                        onClick={() => onSelectProject(project)}
                        className={`flex-1 text-left text-sm py-2.5 px-2 rounded-lg transition-colors truncate ${
                          isActive
                            ? 'text-primary font-medium bg-primary/5'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {project.featureName || 'Untitled Project'}
                      </button>
                      <div className="flex items-center gap-0.5">
                        {onShareProject && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareProject(project.id);
                            }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                            aria-label={`Share ${project.featureName || 'project'}`}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          aria-label={`Delete ${project.featureName || 'project'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Other Nav Items */}
        <div className="mt-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <div key={item.path} className="relative">
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
                {isActive && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-4 space-y-1">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
          <span>Collapse</span>
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}