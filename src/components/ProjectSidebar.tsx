import { useState } from 'react';
import { Plus, FolderOpen, Trash2, ChevronRight, ChevronDown, Settings, Star, Clock, PanelLeftClose, PanelLeft } from 'lucide-react';
import { PresetType } from '@/types/timeline';
import predictorLogo from '@/assets/predictor-logo.png';

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
}

export function ProjectSidebar({
  projects,
  currentProjectId,
  isCollapsed,
  onToggleCollapse,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  if (isCollapsed) {
    return (
      <div className="w-16 bg-sidebar flex flex-col items-center py-4 min-h-screen">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-xl hover:bg-sidebar-accent transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground mb-6"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onCreateNew}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-4 shadow-md"
          aria-label="New project"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col gap-2 mt-2 overflow-y-auto px-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={`p-2.5 rounded-xl transition-all ${
                currentProjectId === project.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground'
              }`}
              aria-label={project.featureName || 'Untitled project'}
              title={project.featureName || 'Untitled project'}
            >
              <FolderOpen className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-sidebar flex flex-col min-h-screen">
      {/* Logo Header */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <img src={predictorLogo} alt="Predictor" className="w-6 h-6" />
        </div>
        <span className="font-semibold text-sidebar-foreground text-lg tracking-tight">Predictor</span>
      </div>

      {/* New Project Button */}
      <div className="px-4 mb-4">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 overflow-y-auto">
        {/* Quick Links */}
        <div className="space-y-1 mb-4">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
            <Star className="w-4 h-4" />
            <span>Favorites</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </button>
        </div>

        {/* Projects Folder */}
        <div>
          {/* Projects Header */}
          <button
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-4 h-4" />
              <span>Projects</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProjectsExpanded ? 'rotate-0' : '-rotate-90'}`} />
          </button>

          {/* Projects List */}
          {isProjectsExpanded && (
            <div className="mt-1 ml-3 pl-4 border-l border-sidebar-border space-y-0.5">
              {projects.length === 0 ? (
                <p className="text-xs text-sidebar-foreground/50 py-3 px-2">
                  No projects yet
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = currentProjectId === project.id;
                  return (
                    <div
                      key={project.id}
                      className={`group flex items-center justify-between rounded-lg transition-all ${
                        isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <button
                        onClick={() => onSelectProject(project)}
                        className={`flex-1 text-left text-sm py-2 px-2 transition-colors truncate ${
                          isActive
                            ? 'text-primary font-medium'
                            : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                        }`}
                      >
                        {project.featureName || 'Untitled Project'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                        className="p-1.5 mr-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-sidebar-foreground/50 hover:text-destructive transition-all"
                        aria-label={`Delete ${project.featureName || 'project'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <PanelLeftClose className="w-4 h-4" />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  );
}
