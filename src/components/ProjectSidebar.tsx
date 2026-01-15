import { useState } from 'react';
import { Plus, FolderOpen, Trash2, ChevronLeft, ChevronRight, ChevronDown, LogOut } from 'lucide-react';
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
      <div className="w-14 bg-card border-r border-border flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mb-4"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onCreateNew}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mb-2"
          aria-label="New project"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col gap-1 mt-2 overflow-y-auto px-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={`p-2 rounded-lg transition-colors ${
                currentProjectId === project.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
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
    <div className="w-56 bg-card border-r border-border flex flex-col h-full">
      {/* Logo Header */}
      <div className="p-4 flex items-center gap-2.5">
        <img src={predictorLogo} alt="Predictor" className="w-8 h-8 rounded-lg" />
        <span className="font-semibold text-foreground text-lg">Predictor</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* New Project Button */}
        <button
          onClick={onCreateNew}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>

        {/* Projects Folder */}
        <div>
          {/* Projects Header */}
          <button
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-full text-sm transition-all ${
              projects.length > 0 && currentProjectId
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderOpen className="w-4 h-4" />
              <span>Projects</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isProjectsExpanded ? 'rotate-0' : '-rotate-90'}`} />
          </button>

          {/* Projects List */}
          {isProjectsExpanded && (
            <div className="mt-1 ml-4 border-l-2 border-border pl-3 space-y-0.5">
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No projects yet
                </p>
              ) : (
                projects.map((project) => {
                  const isActive = currentProjectId === project.id;
                  return (
                    <div
                      key={project.id}
                      className="group flex items-center justify-between"
                    >
                      <button
                        onClick={() => onSelectProject(project)}
                        className={`flex-1 text-left text-sm py-1.5 transition-colors truncate ${
                          isActive
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {project.featureName || 'Untitled Project'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        aria-label={`Delete ${project.featureName || 'project'}`}
                      >
                        <Trash2 className="w-3 h-3" />
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
      <div className="border-t border-border p-3">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  );
}
