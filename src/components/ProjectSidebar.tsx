import { Plus, FolderOpen, Trash2, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
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
      <div className="p-4 flex items-center gap-2">
        <img src={predictorLogo} alt="Predictor" className="w-8 h-8 rounded-lg" />
        <span className="font-semibold text-foreground">Predictor</span>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* New Project Button */}
        <button
          onClick={onCreateNew}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-3"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>

        {/* Projects List */}
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 px-2">
            No saved projects yet.
            <br />
            Click Save to store your first project.
          </p>
        ) : (
          <div className="space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group relative rounded-full transition-colors ${
                  currentProjectId === project.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <button
                  onClick={() => onSelectProject(project)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">
                    {project.featureName || 'Untitled Project'}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                    currentProjectId === project.id
                      ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                      : 'hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                  }`}
                  aria-label={`Delete ${project.featureName || 'project'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Collapse</span>
        </button>
      </div>
    </div>
  );
}
