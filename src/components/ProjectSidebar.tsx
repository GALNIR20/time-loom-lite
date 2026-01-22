import { useState } from 'react';
import { LayoutDashboard, Star, Users, Trash2, Sparkles, Settings, ChevronDown, FolderOpen } from 'lucide-react';
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
  onSelectProject,
  onCreateNew,
  onDeleteProject,
}: ProjectSidebarProps) {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  return (
    <div className="w-56 bg-sidebar flex flex-col min-h-screen border-r border-sidebar-border">
      {/* Brand Header */}
      <div className="px-6 pt-8 pb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'hsl(217, 91%, 60%)' }}>
          Predictor
        </h1>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {/* Dashboard - Main action */}
          <li>
            <button
              onClick={onCreateNew}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LayoutDashboard className="w-5 h-5 text-sidebar-muted" />
              <span>Dashboard</span>
            </button>
          </li>

          {/* Favorites */}
          <li>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <Star className="w-5 h-5" />
              <span>Favorites</span>
            </button>
          </li>

          {/* Projects */}
          <li>
            <button
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5" />
                <span>Projects</span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-200 ${
                  isProjectsExpanded ? 'rotate-0' : '-rotate-90'
                }`} 
              />
            </button>
            
            {/* Projects List */}
            {isProjectsExpanded && projects.length > 0 && (
              <ul className="mt-1 ml-8 space-y-0.5">
                {projects.map((project) => {
                  const isActive = currentProjectId === project.id;
                  return (
                    <li key={project.id}>
                      <div
                        className={`group flex items-center justify-between rounded-md transition-colors ${
                          isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/50'
                        }`}
                      >
                        <button
                          onClick={() => onSelectProject(project)}
                          className={`flex-1 text-left text-sm py-1.5 px-2 truncate transition-colors ${
                            isActive
                              ? 'text-sidebar-primary font-medium'
                              : 'text-sidebar-muted hover:text-sidebar-foreground'
                          }`}
                        >
                          {project.featureName || 'Untitled'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                          className="p-1 mr-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-sidebar-muted hover:text-destructive transition-all"
                          aria-label={`Delete ${project.featureName || 'project'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Recycle Bin */}
          <li>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <Trash2 className="w-5 h-5" />
              <span>Recycle Bin</span>
            </button>
          </li>

          {/* Deep Clean */}
          <li>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <Sparkles className="w-5 h-5" />
              <span>Deep Clean</span>
            </button>
          </li>

          {/* Settings */}
          <li>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Upgrade Banner */}
      <div className="px-4 pb-6 mt-auto">
        <div className="flex flex-col items-center text-center">
          {/* Illustration placeholder */}
          <div className="w-24 h-20 mb-3 flex items-center justify-center">
            <svg viewBox="0 0 80 60" className="w-full h-full" fill="none">
              <ellipse cx="40" cy="55" rx="35" ry="4" fill="hsl(220, 14%, 92%)" />
              <rect x="20" y="20" width="40" height="30" rx="4" fill="hsl(217, 91%, 60%)" opacity="0.1" />
              <rect x="25" y="25" width="30" height="20" rx="2" fill="hsl(217, 91%, 60%)" opacity="0.2" />
              <circle cx="55" cy="15" r="8" fill="hsl(217, 91%, 60%)" opacity="0.15" />
              <path d="M35 35 L45 35 M35 40 L42 40" stroke="hsl(217, 91%, 60%)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <p className="text-xs text-sidebar-muted mb-2">
            Upgrade to <span className="font-medium text-sidebar-foreground">Pro</span> for<br />
            unlimited storage
          </p>
          <button 
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: 'hsl(217, 91%, 60%)' }}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
