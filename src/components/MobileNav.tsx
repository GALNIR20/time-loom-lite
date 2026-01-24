import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Plus, FolderOpen, Calendar, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PredictorLogo } from "@/components/PredictorLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SavedProject } from "@/components/ProjectSidebar";

interface MobileNavProps {
  projects: SavedProject[];
  currentProjectId: string | null;
  onSelectProject: (project: SavedProject) => void;
  onCreateNew: () => void;
}

export function MobileNav({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateNew,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", icon: FolderOpen, label: "Projects" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    navigate("/");
    onCreateNew();
    setIsOpen(false);
  };

  const handleSelectProject = (project: SavedProject) => {
    onSelectProject(project);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <PredictorLogo size="sm" />
          <span className="font-bold text-foreground text-lg">PREDICTOR</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <PredictorLogo size="md" />
                  <span className="font-bold text-foreground text-xl">PREDICTOR</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto">
                  {/* Create Project Button */}
                  <Button
                    onClick={handleCreateNew}
                    className="w-full mb-4 gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>

                  {/* Nav Links */}
                  <div className="space-y-1 mb-4">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavigation(item.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Recent Projects */}
                  {projects.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-2">
                        Recent Projects
                      </h3>
                      <div className="space-y-1">
                        {projects.slice(0, 5).map((project) => {
                          const isActive = currentProjectId === project.id;
                          return (
                            <button
                              key={project.id}
                              onClick={() => handleSelectProject(project)}
                              className={`w-full text-left text-sm py-2.5 px-4 rounded-lg transition-colors truncate ${
                                isActive
                                  ? "text-primary font-medium bg-primary/5"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              }`}
                            >
                              {project.featureName || "Untitled Project"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
