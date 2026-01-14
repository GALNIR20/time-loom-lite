import { Plus, FolderOpen, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PresetType } from '@/types/timeline';

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
      <div className="w-12 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onCreateNew}
          className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="New project"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 flex flex-col gap-1 mt-2 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={`p-2 rounded-md transition-colors ${
                currentProjectId === project.id
                  ? 'bg-primary/10 text-primary'
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
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Saved Projects</h3>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Project Button */}
      <div className="p-3 border-b border-border">
        <button
          onClick={onCreateNew}
          className="btn-primary w-full text-sm py-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {projects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No saved projects yet.
            <br />
            Click Save to store your first project.
          </p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`group relative rounded-md transition-colors ${
                currentProjectId === project.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-muted border border-transparent'
              }`}
            >
              <button
                onClick={() => onSelectProject(project)}
                className="w-full text-left p-3 pr-10"
              >
                <span className="text-sm font-medium text-foreground block truncate">
                  {project.featureName || 'Untitled Project'}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {project.preset} • {new Date(project.savedAt).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                aria-label={`Delete ${project.featureName || 'project'}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
