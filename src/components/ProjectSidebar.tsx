import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, FolderOpen, Trash2, ChevronDown, Calendar, Settings, LogOut, Shield, Eye, Search, X, Copy } from 'lucide-react';
import { PresetType } from '@/types/timeline';
import { PredictorLogo } from '@/components/PredictorLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useGame } from '@/hooks/useGame';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  milestoneChecklists: Record<string, string[]>;
  savedAt: string;
  owner: string;
}

interface ProjectSidebarProps {
  projects: SavedProject[];
  currentProjectId: string | null;
  currentUserId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectProject: (project: SavedProject) => void;
  onCreateNew: () => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: SavedProject) => void;
}

export function ProjectSidebar({
  projects,
  currentProjectId,
  currentUserId,
  isCollapsed,
  onToggleCollapse,
  onSelectProject,
  onCreateNew,
  onDeleteProject,
  onDuplicateProject,
}: ProjectSidebarProps) {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<SavedProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { selectedGame, clearGame } = useGame();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const navItems = [
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    ...(isAdmin ? [{ path: '/admin', icon: Shield, label: 'Admin' }] : []),
  ];

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
        {/* Footer in collapsed mode */}
        <div className="mt-auto pt-4 border-t border-border/50 flex flex-col items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="p-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-background border-r border-border/50 flex flex-col h-full shadow-sm">
      {/* Logo Header */}
      <div className="p-6 pb-3 flex items-center gap-3">
        <PredictorLogo size="md" />
        <span className="font-bold text-foreground text-xl tracking-tight">PREDICTOR</span>
      </div>

      {/* Game Badge */}
      {selectedGame && (
        <div className="px-6 pb-3">
          <button
            onClick={() => {
              clearGame();
              navigate('/select-game');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              selectedGame === 'SGH'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Switch game"
          >
            <span>{selectedGame}</span>
            <span className="text-[10px] font-normal opacity-70">Switch</span>
          </button>
        </div>
      )}

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
              {/* Search input */}
              {projects.length > 0 && (
                <div className="relative mb-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full text-xs py-1.5 pl-7 pr-6 rounded-md bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 pl-2">
                  No projects yet
                </p>
              ) : (() => {
                const filtered = projects.filter((p) =>
                  !searchQuery || p.featureName.toLowerCase().includes(searchQuery.toLowerCase())
                );
                return filtered.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 pl-2">
                    No projects found
                  </p>
                ) : (
                  filtered.map((project) => {
                    const isActive = currentProjectId === project.id;
                    const isOwner = currentUserId ? project.owner === currentUserId : false;
                    return (
                      <div
                        key={project.id}
                        className="group flex items-center justify-between relative"
                      >
                        <button
                          onClick={() => onSelectProject(project)}
                          className={`flex-1 text-left text-sm py-2.5 px-2 rounded-lg transition-colors truncate flex items-center gap-1.5 ${
                            isActive
                              ? 'text-primary font-medium bg-primary/5'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {!isOwner && (
                            <Eye className="w-3 h-3 shrink-0 text-muted-foreground/60" title="View only" />
                          )}
                          <span className="truncate">{project.featureName || 'Untitled Project'}</span>
                        </button>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateProject(project);
                            }}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`Duplicate ${project.featureName || 'project'}`}
                            title="Duplicate project"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {(isOwner || isAdmin) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project);
                              }}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={`Delete ${project.featureName || 'project'}`}
                              title="Delete project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                );
              })()}
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
      <div className="border-t border-border/50 p-4">
        {/* User info */}
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={user?.email || ''}>
            {user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronDown className="w-5 h-5 -rotate-90" />
            <span>Collapse</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.featureName || 'Untitled Project'}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
