import { Calendar, RefreshCw, BarChart3 } from 'lucide-react';
import { PresetType } from '@/types/timeline';

interface ControlsPanelProps {
  featureName: string;
  onFeatureNameChange: (name: string) => void;
  projectStart: string;
  onProjectStartChange: (date: string) => void;
  devStart: string;
  onDevStartChange: (date: string) => void;
  preset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  showDetailed: boolean;
  onShowDetailedChange: (show: boolean) => void;
  onCopyJson: () => void;
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
  projectStart,
  onProjectStartChange,
  devStart,
  onDevStartChange,
  preset,
  onPresetChange,
  showDetailed,
  onShowDetailedChange,
  onCopyJson,
  onReset,
  onShowTimeline,
}: ControlsPanelProps) {
  return (
    <div className="card-elevated p-3 sm:p-5 overflow-hidden">
      <h2 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Configuration</h2>
      
      <div className="space-y-3 sm:space-y-4">
        {/* Feature Name */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          <label htmlFor="feature-name" className="text-[10px] sm:text-xs font-medium text-muted-foreground">
            Feature Name
          </label>
          <input
            type="text"
            id="feature-name"
            value={featureName}
            onChange={(e) => onFeatureNameChange(e.target.value)}
            placeholder="Enter feature name..."
            className="input-field w-full text-sm"
          />
        </div>

        {/* Date inputs row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
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
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <button onClick={onShowTimeline} className="btn-primary text-xs sm:text-sm py-2 px-2 sm:px-3">
              <BarChart3 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Timeline</span>
            </button>
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
