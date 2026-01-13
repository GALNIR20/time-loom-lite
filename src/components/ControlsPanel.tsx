import { Calendar, RefreshCw } from 'lucide-react';

interface ControlsPanelProps {
  projectStart: string;
  onProjectStartChange: (date: string) => void;
  devStart: string;
  onDevStartChange: (date: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  showDetailed: boolean;
  onShowDetailedChange: (show: boolean) => void;
  onCopyJson: () => void;
  onReset: () => void;
}

export function ControlsPanel({
  projectStart,
  onProjectStartChange,
  devStart,
  onDevStartChange,
  speed,
  onSpeedChange,
  showDetailed,
  onShowDetailedChange,
  onCopyJson,
  onReset,
}: ControlsPanelProps) {
  return (
    <div className="card-elevated p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Configuration</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
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

        {/* Dev Start Date */}
        <div className="flex flex-col gap-2">
          <label htmlFor="dev-start" className="text-xs font-medium text-muted-foreground">
            Dev Start Date
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

        {/* Speed Slider */}
        <div className="flex flex-col gap-2">
          <label htmlFor="speed" className="text-xs font-medium text-muted-foreground">
            Global Speed
          </label>
          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              id="speed"
              min="0.5"
              max="2.0"
              step="0.05"
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x</span>
              <span className="font-semibold text-foreground bg-secondary px-2 py-0.5 rounded">
                {speed.toFixed(2)}x
              </span>
              <span>2.0x</span>
            </div>
          </div>
        </div>

        {/* Show Detailed Checkbox */}
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Actions</span>
          <div className="flex gap-2">
            <button onClick={onCopyJson} className="btn-primary flex-1">
              Copy JSON
            </button>
            <button onClick={onReset} className="btn-secondary">
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
