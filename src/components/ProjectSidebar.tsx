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
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-full text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-4"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </div>
          <ChevronDown className="w-4 h-4" />
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
            {projects.map((project) => {
              const isActive = currentProjectId === project.id;
              return (
                <div key={project.id}>
                  <div
                    className={`group relative rounded-full transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <button
                      onClick={() => onSelectProject(project)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">
                          {project.featureName || 'Untitled Project'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                  </div>
                  
                  {/* Sub-items when active */}
                  {isActive && (
                    <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3">
                      <div className="text-sm text-primary font-medium py-1">
                        {project.preset}
                      </div>
                      <div className="text-xs text-muted-foreground py-1">
                        {new Date(project.savedAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-destructive py-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
