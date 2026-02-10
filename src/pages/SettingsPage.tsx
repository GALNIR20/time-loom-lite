import { useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileJson, Check, AlertCircle, Sun, Moon, Monitor, RotateCcw, Milestone, GripVertical, Plus, Minus, Trash2, Palette, ShieldAlert, ClipboardList } from 'lucide-react';
import { useProjects, DbProject } from '@/hooks/useProjects';
import { PresetType } from '@/types/timeline';
import { toast } from 'sonner';
import { useTheme } from '@/components/ThemeProvider';
import { useMilestoneSettings, PHASE_COLOR_OPTIONS } from '@/hooks/useMilestoneSettings';
import { useChecklistSettings, SECTION_ICON_COLORS } from '@/hooks/useChecklistSettings';
import { useAdmin } from '@/hooks/useAdmin';

interface ExportedProject {
  feature_name: string;
  project_start: string;
  preset: string;
  show_detailed: boolean;
  overrides: Record<string, number | null>;
  hidden_milestones: string[];
  locked_dev_start: string | null;
  exported_at: string;
}

interface ExportData {
  version: string;
  exported_at: string;
  projects: ExportedProject[];
}

const PRESET_LABELS: PresetType[] = ['Big', 'Medium', 'BLITZ'];

// Tailwind color mapping for phase badges
const COLOR_CLASSES: Record<string, { badge: string; dot: string; ring: string }> = {
  blue: {
    badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500',
  },
  purple: {
    badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    dot: 'bg-purple-500',
    ring: 'ring-purple-500',
  },
  green: {
    badge: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    dot: 'bg-green-500',
    ring: 'ring-green-500',
  },
  orange: {
    badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    dot: 'bg-orange-500',
    ring: 'ring-orange-500',
  },
  red: {
    badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    dot: 'bg-red-500',
    ring: 'ring-red-500',
  },
  cyan: {
    badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
    dot: 'bg-cyan-500',
    ring: 'ring-cyan-500',
  },
  pink: {
    badge: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800',
    dot: 'bg-pink-500',
    ring: 'ring-pink-500',
  },
  yellow: {
    badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    dot: 'bg-yellow-500',
    ring: 'ring-yellow-500',
  },
  indigo: {
    badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-500',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500',
  },
};

function getColorClasses(color: string) {
  return COLOR_CLASSES[color] || COLOR_CLASSES.blue;
}

export default function SettingsPage() {
  const { projects, createProject } = useProjects();
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useAdmin();
  const {
    settings,
    updateMilestoneName,
    updateMilestonePhase,
    updatePresetName,
    updatePresetDuration,
    updatePhaseName,
    updatePhaseColor,
    addPhase,
    removePhase,
    addMilestone,
    removeMilestone,
    reorderMilestones,
    updateSprintWeeks,
    updateSprintCode,
    resetToDefaults,
  } = useMilestoneSettings();
  const {
    settings: checklistSettings,
    addSection,
    updateSectionLabel,
    updateSectionColor,
    removeSection,
    addItem: addChecklistItem,
    updateItemLabel,
    removeItem: removeChecklistItem,
    copyFromMilestone,
    resetToDefaults: resetChecklistDefaults,
  } = useChecklistSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  // Add milestone dialog state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestonePhase, setNewMilestonePhase] = useState('');

  // Add phase dialog state
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newPhaseColor, setNewPhaseColor] = useState('blue');

  // Deliverables state
  const [selectedDeliverableMilestone, setSelectedDeliverableMilestone] = useState<string>(settings.milestones[0]?.id || '');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('blue');
  const [addingItemToSection, setAddingItemToSection] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [copyFromSource, setCopyFromSource] = useState<string>('');

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIndex) {
      reorderMilestones(dragIndex, dropIndex);
      toast.success('Milestone order updated');
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, reorderMilestones]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleAddMilestone = () => {
    if (!newMilestoneName.trim()) {
      toast.error('Please enter a milestone name');
      return;
    }
    if (!newMilestonePhase) {
      toast.error('Please select a phase');
      return;
    }
    addMilestone(newMilestoneName.trim(), newMilestonePhase);
    toast.success(`Added milestone "${newMilestoneName.trim()}"`);
    setNewMilestoneName('');
    setNewMilestonePhase('');
    setShowAddMilestone(false);
  };

  const handleAddPhase = () => {
    if (!newPhaseName.trim()) {
      toast.error('Please enter a phase name');
      return;
    }
    addPhase(newPhaseName.trim(), newPhaseColor);
    toast.success(`Added phase "${newPhaseName.trim()}"`);
    setNewPhaseName('');
    setNewPhaseColor('blue');
    setShowAddPhase(false);
  };

  const handleRemoveMilestone = (milestoneId: string, milestoneName: string) => {
    removeMilestone(milestoneId);
    toast.success(`Removed milestone "${milestoneName}"`);
  };

  const handleRemovePhase = (phaseId: string, phaseName: string) => {
    const hasRefs = settings.milestones.some(m => m.phase === phaseId);
    if (hasRefs) {
      toast.error(`Cannot remove "${phaseName}" — milestones still use this phase`);
      return;
    }
    removePhase(phaseId);
    toast.success(`Removed phase "${phaseName}"`);
  };

  const handleExportAll = () => {
    if (projects.length === 0) {
      toast.error('No projects to export');
      return;
    }

    const exportData: ExportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      projects: projects.map(p => ({
        feature_name: p.feature_name,
        project_start: p.project_start,
        preset: p.preset,
        show_detailed: p.show_detailed,
        overrides: p.overrides,
        hidden_milestones: p.hidden_milestones,
        locked_dev_start: p.locked_dev_start,
        exported_at: new Date().toISOString(),
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictor-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${projects.length} project(s)`);
  };

  const handleExportSingle = (project: DbProject) => {
    const exportData: ExportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      projects: [{
        feature_name: project.feature_name,
        project_start: project.project_start,
        preset: project.preset,
        show_detailed: project.show_detailed,
        overrides: project.overrides,
        hidden_milestones: project.hidden_milestones,
        locked_dev_start: project.locked_dev_start,
        exported_at: new Date().toISOString(),
      }]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.feature_name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported "${project.feature_name}"`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setImportMessage('');

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;

      if (!data.version || !data.projects || !Array.isArray(data.projects)) {
        throw new Error('Invalid file format. Expected Predictor export file.');
      }

      let imported = 0;
      let skipped = 0;

      for (const project of data.projects) {
        if (!project.feature_name || !project.project_start || !project.preset) {
          skipped++;
          continue;
        }

        const result = await createProject({
          feature_name: project.feature_name,
          project_start: project.project_start,
          preset: project.preset as PresetType,
          show_detailed: project.show_detailed ?? true,
          overrides: project.overrides || {},
          hidden_milestones: project.hidden_milestones || [],
          locked_dev_start: project.locked_dev_start || null,
        });

        if (result) {
          imported++;
        } else {
          skipped++;
        }
      }

      if (imported > 0) {
        setImportStatus('success');
        setImportMessage(`Successfully imported ${imported} project(s)${skipped > 0 ? `, ${skipped} skipped` : ''}`);
        toast.success(`Imported ${imported} project(s)`);
      } else {
        setImportStatus('error');
        setImportMessage('No projects were imported. Check file format.');
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Failed to import file');
      toast.error('Failed to import projects');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 bg-muted/30 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">Manage your account and preferences</p>

        <Tabs defaultValue="milestones" className="space-y-4 md:space-y-6">
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="milestones" className="flex-1 text-xs md:text-sm">PLC Milestones</TabsTrigger>
            <TabsTrigger value="sprints" className="flex-1 text-xs md:text-sm">Sprints</TabsTrigger>
            <TabsTrigger value="deliverables" className="flex-1 text-xs md:text-sm">Deliverables</TabsTrigger>
            <TabsTrigger value="data" className="flex-1 text-xs md:text-sm">Data</TabsTrigger>
            <TabsTrigger value="general" className="flex-1 text-xs md:text-sm">General</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 text-xs md:text-sm">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="milestones">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Milestone className="w-5 h-5" />
                      PLC Milestone Configuration
                    </CardTitle>
                    <CardDescription>
                      Customize phases, milestone names, order, and default durations
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetToDefaults();
                        toast.success('Milestone settings reset to defaults');
                      }}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Defaults
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">

                {!isAdmin && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">Only administrators can modify milestone settings. Contact an admin to make changes.</p>
                  </div>
                )}

                {/* Phase Names */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Phase Names</h3>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddPhase(true)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        Add Phase
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Customize phase names and colors. Phases group milestones visually.
                  </p>
                  <div className="grid gap-2">
                    {settings.phases.map((phase) => {
                      const colors = getColorClasses(phase.color);
                      const milestonesInPhase = settings.milestones.filter(m => m.phase === phase.id).length;
                      return (
                        <div key={phase.id} className="flex items-center gap-2">
                          {/* Color picker */}
                          <div className="relative group">
                            <button
                              className={`w-7 h-7 rounded-md border flex items-center justify-center ${colors.badge}`}
                              title={isAdmin ? "Change color" : "Color (admin only)"}
                              disabled={!isAdmin}
                            >
                              <Palette className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <div className="absolute top-full left-0 mt-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg z-50 hidden group-hover:grid grid-cols-5 gap-1 min-w-[130px]">
                                {PHASE_COLOR_OPTIONS.map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => updatePhaseColor(phase.id, c)}
                                    className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c]?.dot || 'bg-gray-500'} ${
                                      phase.color === c ? 'ring-2 ring-offset-1 ring-offset-background ' + (COLOR_CLASSES[c]?.ring || '') : ''
                                    } hover:scale-110 transition-transform`}
                                    title={c}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Name input */}
                          <div className="flex-1">
                            <Input
                              value={phase.name}
                              onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                              className="h-7 text-sm"
                              placeholder="Phase name"
                              disabled={!isAdmin}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground w-20 text-right">
                            {milestonesInPhase} milestone{milestonesInPhase !== 1 ? 's' : ''}
                          </span>
                          {/* Remove */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemovePhase(phase.id, phase.name)}
                              disabled={milestonesInPhase > 0}
                              title={milestonesInPhase > 0 ? 'Remove milestones from this phase first' : 'Remove phase'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Phase Inline Form */}
                  {isAdmin && showAddPhase && (
                    <div className="mt-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {PHASE_COLOR_OPTIONS.slice(0, 5).map((c) => (
                            <button
                              key={c}
                              onClick={() => setNewPhaseColor(c)}
                              className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c]?.dot || 'bg-gray-500'} ${
                                newPhaseColor === c ? 'ring-2 ring-offset-1 ring-offset-background ' + (COLOR_CLASSES[c]?.ring || '') : ''
                              } hover:scale-110 transition-transform`}
                            />
                          ))}
                        </div>
                        <Input
                          value={newPhaseName}
                          onChange={(e) => setNewPhaseName(e.target.value)}
                          placeholder="New phase name..."
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPhase()}
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddPhase}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddPhase(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Milestones - with drag and drop */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Milestones</h3>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewMilestonePhase(settings.phases[0]?.id || '');
                          setShowAddMilestone(true);
                        }}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus className="w-3 h-3" />
                        Add Milestone
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Drag to reorder milestones. Change names, phases, or remove milestones.
                  </p>
                  <div className="space-y-1">
                    {settings.milestones.map((milestone, index) => {
                      const phase = settings.phases.find(p => p.id === milestone.phase);
                      const colors = getColorClasses(phase?.color || 'blue');
                      const isDragging = dragIndex === index;
                      const isDragOver = dragOverIndex === index;
                      return (
                        <div
                          key={milestone.id}
                          draggable={isAdmin}
                          onDragStart={isAdmin ? () => handleDragStart(index) : undefined}
                          onDragOver={isAdmin ? (e) => handleDragOver(e, index) : undefined}
                          onDrop={isAdmin ? (e) => handleDrop(e, index) : undefined}
                          onDragEnd={isAdmin ? handleDragEnd : undefined}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                            isDragging
                              ? 'opacity-50 border-primary bg-primary/5'
                              : isDragOver
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-transparent hover:bg-muted/50'
                          }`}
                        >
                          {/* Drag handle */}
                          <div className={`${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-default opacity-30'} text-muted-foreground hover:text-foreground`}>
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Order number */}
                          <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
                            {index + 1}
                          </span>

                          {/* Phase badge */}
                          <select
                            value={milestone.phase}
                            onChange={(e) => updateMilestonePhase(milestone.id, e.target.value)}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isAdmin ? 'cursor-pointer' : 'cursor-default pointer-events-none'} ${colors.badge}`}
                            disabled={!isAdmin}
                          >
                            {settings.phases.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>

                          {/* Name input */}
                          <div className="flex-1">
                            <Input
                              value={milestone.name}
                              onChange={(e) => updateMilestoneName(milestone.id, e.target.value)}
                              className="h-7 text-sm"
                              placeholder={`Name for ${milestone.id}`}
                              disabled={!isAdmin}
                            />
                          </div>

                          {/* ID */}
                          <span className="text-[10px] text-muted-foreground font-mono w-20 text-right truncate hidden md:block">
                            {milestone.id}
                          </span>

                          {/* Remove */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveMilestone(milestone.id, milestone.name)}
                              title="Remove milestone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Milestone Inline Form */}
                  {isAdmin && showAddMilestone && (
                    <div className="mt-2 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={newMilestonePhase}
                          onChange={(e) => setNewMilestonePhase(e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-border bg-background cursor-pointer"
                        >
                          <option value="">Select phase...</option>
                          {settings.phases.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <Input
                          value={newMilestoneName}
                          onChange={(e) => setNewMilestoneName(e.target.value)}
                          placeholder="New milestone name..."
                          className="h-7 text-sm flex-1"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={handleAddMilestone}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddMilestone(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Preset Names */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Preset Names</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Rename the preset labels displayed throughout the app
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {PRESET_LABELS.map((preset) => (
                      <div key={preset} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{preset}</span>
                        <Input
                          value={settings.presetNames?.[preset] ?? preset}
                          onChange={(e) => updatePresetName(preset, e.target.value)}
                          className="h-8 text-sm"
                          placeholder={preset}
                          disabled={!isAdmin}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Preset Durations */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Default Durations (days)</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Set the default number of days for each milestone in each preset. These are the values used when no per-project override is set.
                  </p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Milestone</th>
                          {PRESET_LABELS.map((preset) => (
                            <th key={preset} className="text-center py-2 px-2 font-medium text-muted-foreground min-w-[80px]">
                              {settings.presetNames?.[preset] ?? preset}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {settings.milestones.map((milestone) => {
                          const phase = settings.phases.find(p => p.id === milestone.phase);
                          const colors = getColorClasses(phase?.color || 'blue');
                          return (
                            <tr key={milestone.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                  <span className="font-medium">{milestone.name}</span>
                                </div>
                              </td>
                              {PRESET_LABELS.map((preset) => (
                                <td key={preset} className="py-2 px-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={settings.presets[preset]?.[milestone.id] ?? 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      if (!isNaN(val) && val >= 0) {
                                        updatePresetDuration(preset, milestone.id, val);
                                      }
                                    }}
                                    className="h-8 text-sm text-center w-20 mx-auto"
                                    disabled={!isAdmin}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Changes are saved automatically and will apply to all new calculations. 
                    Per-project overrides (set in the timeline view) take priority over these defaults.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sprints">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Milestone className="w-5 h-5" />
                  Sprint Configuration
                </CardTitle>
                <CardDescription>
                  Configure sprint duration and numbering scheme for this board
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {!isAdmin && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">Only administrators can modify sprint settings.</p>
                  </div>
                )}

                {/* Sprint Duration */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Sprint Duration</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Define how many weeks each sprint lasts for this board. This affects all new sprints added to projects.
                  </p>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm whitespace-nowrap">Weeks per Sprint:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!isAdmin || (settings.sprintWeeks || 2) <= 1}
                        onClick={() => updateSprintWeeks((settings.sprintWeeks || 2) - 1)}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                      <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5 min-w-[80px] justify-center">
                        <span className="text-lg font-bold text-foreground">{settings.sprintWeeks || 2}</span>
                        <span className="text-xs text-muted-foreground">week{(settings.sprintWeeks || 2) !== 1 ? 's' : ''}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!isAdmin || (settings.sprintWeeks || 2) >= 8}
                        onClick={() => updateSprintWeeks((settings.sprintWeeks || 2) + 1)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      = {(settings.sprintWeeks || 2) * 7} days
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Sprint Code Numbering */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Sprint Code Numbering</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Define the sprint numbering scheme. Set a reference date and the sprint number for that date — all other sprint codes are calculated automatically.
                  </p>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-28 shrink-0">Reference Date:</Label>
                      <Input
                        type="date"
                        value={settings.sprintCode?.referenceDate || '2026-01-13'}
                        onChange={(e) => updateSprintCode({ referenceDate: e.target.value })}
                        className="h-8 text-sm max-w-[180px]"
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-28 shrink-0">Sprint Number:</Label>
                      <Input
                        type="number"
                        value={settings.sprintCode?.referenceNumber ?? 409}
                        onChange={(e) => updateSprintCode({ referenceNumber: parseInt(e.target.value) || 0 })}
                        className="h-8 text-sm max-w-[120px]"
                        disabled={!isAdmin}
                        min={0}
                      />
                      <span className="text-xs text-muted-foreground">at the reference date</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-28 shrink-0">Code Prefix:</Label>
                      <Input
                        value={settings.sprintCode?.prefix ?? '2.'}
                        onChange={(e) => updateSprintCode({ prefix: e.target.value })}
                        className="h-8 text-sm max-w-[80px]"
                        placeholder="e.g. 2."
                        disabled={!isAdmin}
                      />
                      <span className="text-xs text-muted-foreground">
                        Preview: <strong>{settings.sprintCode?.prefix ?? '2.'}{settings.sprintCode?.referenceNumber ?? 409}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Changes are saved automatically. Sprint codes are calculated based on the reference point and sprint duration.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliverables">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" />
                      Deliverables Checklist
                    </CardTitle>
                    <CardDescription>
                      Configure the deliverable items for each PLC milestone independently
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetChecklistDefaults();
                        toast.success('Deliverables checklist reset to defaults for all milestones');
                      }}
                      className="gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">

                {!isAdmin && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <p className="text-sm">Only administrators can modify deliverables settings. Contact an admin to make changes.</p>
                  </div>
                )}

                {/* Milestone Selector Tabs */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Select Milestone</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {settings.milestones.map((ms) => {
                      const phase = settings.phases.find(p => p.id === ms.phase);
                      const colors = getColorClasses(phase?.color || 'blue');
                      const isSelected = selectedDeliverableMilestone === ms.id;
                      const sectionCount = (checklistSettings.milestoneDeliverables[ms.id] || []).length;
                      const itemCount = (checklistSettings.milestoneDeliverables[ms.id] || []).reduce((sum, s) => sum + s.items.length, 0);
                      return (
                        <button
                          key={ms.id}
                          onClick={() => {
                            setSelectedDeliverableMilestone(ms.id);
                            setShowAddSection(false);
                            setAddingItemToSection(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? `${colors.badge} border-current ring-1 ring-current`
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {ms.name}
                          {itemCount > 0 && (
                            <span className="ml-1.5 text-[10px] opacity-60">({itemCount})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Copy from another milestone */}
                {isAdmin && selectedDeliverableMilestone && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Copy deliverables from:</span>
                    <select
                      value={copyFromSource}
                      onChange={(e) => setCopyFromSource(e.target.value)}
                      className="text-xs px-2 py-1 rounded border border-border bg-background cursor-pointer"
                    >
                      <option value="">Select milestone...</option>
                      {settings.milestones.filter(ms => ms.id !== selectedDeliverableMilestone).map((ms) => (
                        <option key={ms.id} value={ms.id}>{ms.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!copyFromSource}
                      onClick={() => {
                        if (copyFromSource) {
                          copyFromMilestone(copyFromSource, selectedDeliverableMilestone);
                          const sourceName = settings.milestones.find(m => m.id === copyFromSource)?.name || copyFromSource;
                          toast.success(`Copied deliverables from "${sourceName}"`);
                          setCopyFromSource('');
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                )}

                {/* Sections for the selected milestone */}
                {selectedDeliverableMilestone && (() => {
                  const currentSections = checklistSettings.milestoneDeliverables[selectedDeliverableMilestone] || [];
                  const selectedMsName = settings.milestones.find(m => m.id === selectedDeliverableMilestone)?.name || selectedDeliverableMilestone;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{selectedMsName} — Deliverables</h3>
                        <span className="text-[10px] text-muted-foreground">
                          {currentSections.length} section{currentSections.length !== 1 ? 's' : ''}, {currentSections.reduce((s, sec) => s + sec.items.length, 0)} item{currentSections.reduce((s, sec) => s + sec.items.length, 0) !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-4">
                        {currentSections.map((section) => {
                          const colorCls = getColorClasses(section.color);
                          return (
                            <div key={section.id} className="rounded-lg border border-border p-4 space-y-3">
                              {/* Section header */}
                              <div className="flex items-center gap-2">
                                {/* Color picker */}
                                <div className="relative group">
                                  <button
                                    className={`w-7 h-7 rounded-md border flex items-center justify-center ${colorCls.badge}`}
                                    title={isAdmin ? 'Change color' : 'Color (admin only)'}
                                    disabled={!isAdmin}
                                  >
                                    <Palette className="w-3.5 h-3.5" />
                                  </button>
                                  {isAdmin && (
                                    <div className="absolute top-full left-0 mt-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg z-50 hidden group-hover:grid grid-cols-5 gap-1 min-w-[130px]">
                                      {SECTION_ICON_COLORS.map((c) => (
                                        <button
                                          key={c}
                                          onClick={() => updateSectionColor(selectedDeliverableMilestone, section.id, c)}
                                          className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c]?.dot || 'bg-gray-500'} ${
                                            section.color === c ? 'ring-2 ring-offset-1 ring-offset-background ' + (COLOR_CLASSES[c]?.ring || '') : ''
                                          } hover:scale-110 transition-transform`}
                                          title={c}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {/* Section name */}
                                <div className="flex-1">
                                  <Input
                                    value={section.label}
                                    onChange={(e) => updateSectionLabel(selectedDeliverableMilestone, section.id, e.target.value)}
                                    className="h-7 text-sm font-semibold"
                                    placeholder="Section name"
                                    disabled={!isAdmin}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground w-16 text-right">
                                  {section.items.length} item{section.items.length !== 1 ? 's' : ''}
                                </span>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                      removeSection(selectedDeliverableMilestone, section.id);
                                      toast.success(`Removed section "${section.label}"`);
                                    }}
                                    title="Remove section and all its items"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>

                              {/* Items */}
                              <div className="space-y-1 ml-4">
                                {section.items.map((item) => (
                                  <div key={item.id} className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${colorCls.dot}`} />
                                    <div className="flex-1">
                                      <Input
                                        value={item.label}
                                        onChange={(e) => updateItemLabel(selectedDeliverableMilestone, section.id, item.id, e.target.value)}
                                        className="h-7 text-sm"
                                        placeholder="Item label"
                                        disabled={!isAdmin}
                                      />
                                    </div>
                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          removeChecklistItem(selectedDeliverableMilestone, section.id, item.id);
                                          toast.success(`Removed "${item.label}"`);
                                        }}
                                        title="Remove item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                ))}

                                {/* Add item inline form */}
                                {isAdmin && addingItemToSection === section.id && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5" />
                                    <Input
                                      value={newItemLabel}
                                      onChange={(e) => setNewItemLabel(e.target.value)}
                                      placeholder="New item label..."
                                      className="h-7 text-sm flex-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newItemLabel.trim()) {
                                          addChecklistItem(selectedDeliverableMilestone, section.id, newItemLabel.trim());
                                          toast.success(`Added "${newItemLabel.trim()}"`);
                                          setNewItemLabel('');
                                        }
                                        if (e.key === 'Escape') {
                                          setAddingItemToSection(null);
                                          setNewItemLabel('');
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        if (newItemLabel.trim()) {
                                          addChecklistItem(selectedDeliverableMilestone, section.id, newItemLabel.trim());
                                          toast.success(`Added "${newItemLabel.trim()}"`);
                                          setNewItemLabel('');
                                        }
                                      }}
                                    >
                                      Add
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
                                      onClick={() => { setAddingItemToSection(null); setNewItemLabel(''); }}
                                    >
                                      Done
                                    </Button>
                                  </div>
                                )}

                                {/* Add item button */}
                                {isAdmin && addingItemToSection !== section.id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-muted-foreground mt-1"
                                    onClick={() => { setAddingItemToSection(section.id); setNewItemLabel(''); }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Item
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {currentSections.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                            No deliverables configured for "{selectedMsName}". Add a section below or copy from another milestone.
                          </p>
                        )}
                      </div>

                      {/* Add Section */}
                      {isAdmin && !showAddSection && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShowAddSection(true)}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Section
                        </Button>
                      )}

                      {isAdmin && showAddSection && (
                        <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {SECTION_ICON_COLORS.slice(0, 5).map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setNewSectionColor(c)}
                                  className={`w-5 h-5 rounded-full ${COLOR_CLASSES[c]?.dot || 'bg-gray-500'} ${
                                    newSectionColor === c ? 'ring-2 ring-offset-1 ring-offset-background ' + (COLOR_CLASSES[c]?.ring || '') : ''
                                  } hover:scale-110 transition-transform`}
                                />
                              ))}
                            </div>
                            <Input
                              value={newSectionName}
                              onChange={(e) => setNewSectionName(e.target.value)}
                              placeholder="New section name..."
                              className="h-7 text-sm flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSectionName.trim()) {
                                  addSection(selectedDeliverableMilestone, newSectionName.trim(), newSectionColor);
                                  toast.success(`Added section "${newSectionName.trim()}"`);
                                  setNewSectionName('');
                                  setNewSectionColor('blue');
                                  setShowAddSection(false);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                if (newSectionName.trim()) {
                                  addSection(selectedDeliverableMilestone, newSectionName.trim(), newSectionColor);
                                  toast.success(`Added section "${newSectionName.trim()}"`);
                                  setNewSectionName('');
                                  setNewSectionColor('blue');
                                  setShowAddSection(false);
                                }
                              }}
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setShowAddSection(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Each milestone has its own deliverables. Changes are saved automatically per game/board.
                    Use "Copy from" to quickly duplicate another milestone's deliverables.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  Import & Export
                </CardTitle>
                <CardDescription>Backup your projects or share them with others</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Export Projects</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Download your projects as a JSON file for backup or sharing
                    </p>
                    <Button onClick={handleExportAll} className="gap-2">
                      <Download className="w-4 h-4" />
                      Export All Projects ({projects.length})
                    </Button>
                  </div>

                  {projects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Or export individual projects:</Label>
                      <div className="flex flex-wrap gap-2">
                        {projects.slice(0, 10).map((project) => (
                          <Button
                            key={project.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingle(project)}
                            className="gap-1.5 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            {project.feature_name}
                          </Button>
                        ))}
                        {projects.length > 10 && (
                          <span className="text-xs text-muted-foreground self-center">
                            +{projects.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Import Projects</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Load projects from a previously exported JSON file
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button onClick={handleImportClick} variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Import from JSON
                    </Button>
                  </div>

                  {importStatus !== 'idle' && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      importStatus === 'success' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {importStatus === 'success' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm">{importMessage}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Project Defaults</CardTitle>
                <CardDescription>Configure default settings for new projects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultPreset">Default Preset</Label>
                  <Input id="defaultPreset" defaultValue="Big" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-save Projects</Label>
                    <p className="text-sm text-muted-foreground">Automatically save project changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "light"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="text-sm font-medium">Light</span>
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="text-sm font-medium">Dark</span>
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === "system"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Monitor className="w-6 h-6" />
                      <span className="text-sm font-medium">System</span>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {theme === "system" 
                      ? "Automatically matches your device settings" 
                      : `Using ${theme} mode`}
                  </p>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact View</Label>
                    <p className="text-sm text-muted-foreground">Show more content in less space</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive project updates via email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sprint Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get reminded about upcoming sprints</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Milestone Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notifications for milestone deadlines</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
