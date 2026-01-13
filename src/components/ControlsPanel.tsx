import { Calendar, RefreshCw, BarChart3 } from 'lucide-react';
import { PresetType } from '@/types/timeline';

interface ControlsPanelProps {
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
    <div className="card-elevated p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Configuration</h2>
      
      <div className="space-y-4">
        {/* Date inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Preset Selector */}
          <div className="flex flex-col gap-2">
            <label htmlFor="preset" className="text-xs font-medium text-muted-foreground">
              Timeline Preset
            </label>
            <select
              id="preset"
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as PresetType)}
              className="input-field w-full"
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.description})
                </option>
              ))}
            </select>
          </div>

          {/* Dev Start Date (editable - calculates backwards) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="dev-start" className="text-xs font-medium text-muted-foreground">
              Development Start (Sprint 1)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                id="dev-start"
                value={devStart}
                onChange={(e) => onDevStartChange(e.target.value)}
                className="input-field w-full pl-9"
              />
            </div>
          </div>

          {/* Project Start Date */}
          <div className="flex flex-col gap-2">
            <label htmlFor="project-start" className="text-xs font-medium text-muted-foreground">
              Project Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                id="project-start"
                value={projectStart}
                onChange={(e) => onProjectStartChange(e.target.value)}
                className="input-field w-full pl-9"
              />
            </div>
          </div>
        </div>

        {/* Options and Actions row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-2 border-t border-border">
          {/* Show Detailed Checkbox */}
          <div className="flex flex-col gap-2 sm:flex-1">
            <span className="text-xs font-medium text-muted-foreground">Display Options</span>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDetailed}
                onChange={(e) => onShowDetailedChange(e.target.checked)}
                className="w-4 h-4 rounded border-input text-primary focus:ring-ring focus:ring-offset-1"
              />
              <span className="text-sm text-foreground">Show months/weeks/days</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button onClick={onShowTimeline} className="btn-primary flex-1 sm:flex-none">
              <BarChart3 className="w-4 h-4" />
              <span>Timeline View</span>
            </button>
            <button onClick={onCopyJson} className="btn-secondary flex-1 sm:flex-none">
              Copy JSON
            </button>
            <button onClick={onReset} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
