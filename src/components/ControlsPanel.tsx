import { Calendar, RefreshCw, BarChart3, Save, Undo2 } from 'lucide-react';
import { PresetType } from '@/types/timeline';

interface ControlsPanelProps {
  featureName: string;
  onFeatureNameChange: (name: string) => void;
  isFeatureNameSet: boolean;
  onSetFeatureName: () => void;
  onEditFeatureName: () => void;
  projectStart: string;
  onProjectStartChange: (date: string) => void;
  devStart: string;
  onDevStartChange: (date: string) => void;
  preset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  showDetailed: boolean;
  onShowDetailedChange: (show: boolean) => void;
  onCopyJson: () => void;
  onSave: () => void;
  onRestore: () => void;
  hasUnsavedChanges: boolean;
  onReset: () => void;
  onShowTimeline: () => void;
}

const PRESET_OPTIONS: { value: PresetType; label: string; description: string }[] = [
  { value: 'Big', label: 'Big PLC', description: '112 days' },
  { value: 'Medium', label: 'Medium PLC', description: '73 days' },
  { value: 'BLITZ', label: 'BLITZ', description: '46 days' },
];

export function ControlsPanel({
  featureName,
  onFeatureNameChange,
  isFeatureNameSet,
  onSetFeatureName,
  onEditFeatureName,
  projectStart,
  onProjectStartChange,
  devStart,
  onDevStartChange,
  preset,
  onPresetChange,
  showDetailed,
  onShowDetailedChange,
  onCopyJson,
  onSave,
  onRestore,
  hasUnsavedChanges,
  onReset,
  onShowTimeline,
}: ControlsPanelProps) {
  return (
    <div className="card-elevated p-3 sm:p-5 overflow-hidden">
      <h2 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Configuration</h2>
      
      <div className="space-y-3 sm:space-y-4">
        {/* Feature Name and Preset row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {/* Feature Name */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label htmlFor="feature-name" className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              Feature Name
            </label>
            {isFeatureNameSet ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground flex-1 truncate">
                  {featureName}
                </span>
                <button
                  onClick={onEditFeatureName}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  id="feature-name"
                  value={featureName}
                  onChange={(e) => onFeatureNameChange(e.target.value)}
                  placeholder="Enter feature name..."
                  className="input-field flex-1 text-sm"
                />
                <button
                  onClick={onSetFeatureName}
                  disabled={!featureName.trim()}
                  className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Set
                </button>
              </div>
            )}
          </div>

          {/* Preset Selector */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label htmlFor="preset" className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              Timeline Preset
            </label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as PresetType)}
              className="input-field w-full text-sm"
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.description})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date inputs row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">

          {/* Development Start Date (editable - calculates backwards) */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label htmlFor="dev-start" className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              Development Start (I-Phase)
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                id="dev-start"
                value={devStart}
                onChange={(e) => onDevStartChange(e.target.value)}
                className="input-field w-full pl-8 sm:pl-9 text-sm min-w-0"
              />
            </div>
          </div>

          {/* Project Start Date */}
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <label htmlFor="project-start" className="text-[10px] sm:text-xs font-medium text-muted-foreground">
              Project Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                id="project-start"
                value={projectStart}
                onChange={(e) => onProjectStartChange(e.target.value)}
                className="input-field w-full pl-8 sm:pl-9 text-sm min-w-0"
              />
            </div>
          </div>
        </div>

        {/* Options and Actions row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 pt-3 border-t border-border">
          {/* Show Detailed Checkbox */}
          <div className="flex flex-col gap-1.5 sm:gap-2 sm:flex-1">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">Display Options</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDetailed}
                onChange={(e) => onShowDetailedChange(e.target.checked)}
                className="w-3.5 sm:w-4 h-3.5 sm:h-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-1"
              />
              <span className="text-xs sm:text-sm text-foreground">Show months/weeks/days</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={onShowTimeline} className="btn-primary text-xs sm:text-sm py-2 px-2 sm:px-3">
              <BarChart3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Timeline</span>
            </button>
            <button onClick={onSave} className="btn-primary text-xs sm:text-sm py-2 px-2 sm:px-3">
              <Save className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
            {hasUnsavedChanges && (
              <button onClick={onRestore} className="btn-secondary text-xs sm:text-sm py-2 px-2 sm:px-3 border-warning text-warning hover:bg-warning/10">
                <Undo2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                <span className="hidden sm:inline">Restore</span>
              </button>
            )}
            <button onClick={onCopyJson} className="btn-secondary text-xs sm:text-sm py-2 px-2 sm:px-3">
              <span>JSON</span>
            </button>
            <button onClick={onReset} className="btn-secondary text-xs sm:text-sm py-2 px-2 sm:px-3">
              <RefreshCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
