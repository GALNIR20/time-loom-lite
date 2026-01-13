import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { parseISO, subDays, format } from 'date-fns';
import { ControlsPanel } from '@/components/ControlsPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { MilestoneTable } from '@/components/MilestoneTable';
import { JsonExportModal } from '@/components/JsonExportModal';
import { TimelineView } from '@/components/TimelineView';
import {
  DEFAULT_MILESTONES,
  calculateTimeline,
  getPresetDuration,
  PRESET_CONFIGS,
  getTodayISO,
} from '@/lib/timeline';
import { TimelineExport, PresetType } from '@/types/timeline';
import predictorLogo from '@/assets/predictor-logo.png';

// Calculate days before Sprint 1 for a given preset and overrides
function calculateDaysBeforeSprint1(
  presetType: PresetType,
  overrides: Record<string, number | null>
): number {
  const sprint1Index = DEFAULT_MILESTONES.findIndex((m) => m.id === 'sprint-1');
  if (sprint1Index === -1) return 0;
  
  return DEFAULT_MILESTONES.slice(0, sprint1Index).reduce((sum, config) => {
    const overrideDays = overrides[config.id] ?? null;
    const duration = getPresetDuration(config.id, presetType, overrideDays);
    return sum + duration;
  }, 0);
}

const Index = () => {
  const [projectStart, setProjectStart] = useState(getTodayISO);
  const [preset, setPreset] = useState<PresetType>('Big');
  const [showDetailed, setShowDetailed] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isTimelineViewOpen, setIsTimelineViewOpen] = useState(false);
  
  // Track the user's intended dev start date (null = not manually set)
  const [lockedDevStart, setLockedDevStart] = useState<string | null>(null);

  const milestones = useMemo(
    () => calculateTimeline(DEFAULT_MILESTONES, overrides, projectStart, preset),
    [overrides, projectStart, preset]
  );

  const totalDays = useMemo(
    () => milestones.reduce((sum, m) => sum + m.durationDays, 0),
    [milestones]
  );

  const projectedEnd = useMemo(
    () => milestones[milestones.length - 1]?.end ?? projectStart,
    [milestones, projectStart]
  );

  const sprint1Start = useMemo(() => {
    const sprint1 = milestones.find((m) => m.id === 'sprint-1');
    return sprint1?.start ?? null;
  }, [milestones]);

  const daysToSprint1 = useMemo(() => {
    const sprint1 = milestones.find((m) => m.id === 'sprint-1');
    if (!sprint1) return null;
    
    return milestones
      .filter((m) => milestones.indexOf(m) < milestones.indexOf(sprint1))
      .reduce((sum, m) => sum + m.durationDays, 0);
  }, [milestones]);

  const daysBeforeSprint1 = useMemo(
    () => calculateDaysBeforeSprint1(preset, overrides),
    [overrides, preset]
  );

  const handleDevStartChange = useCallback((devStartDate: string) => {
    // Lock this dev start date
    setLockedDevStart(devStartDate);
    // Calculate project start by going back from dev start
    const devStart = parseISO(devStartDate);
    const daysBack = calculateDaysBeforeSprint1(preset, overrides);
    const newProjectStart = subDays(devStart, daysBack);
    setProjectStart(format(newProjectStart, 'yyyy-MM-dd'));
  }, [preset, overrides]);

  const handlePresetChange = useCallback((newPreset: PresetType) => {
    setPreset(newPreset);
    
    // If user has locked a dev start date, recalculate project start
    if (lockedDevStart) {
      const devStart = parseISO(lockedDevStart);
      const daysBack = calculateDaysBeforeSprint1(newPreset, overrides);
      const newProjectStart = subDays(devStart, daysBack);
      setProjectStart(format(newProjectStart, 'yyyy-MM-dd'));
    }
  }, [lockedDevStart, overrides]);

  const exportData: TimelineExport = useMemo(
    () => ({
      projectStart,
      devStart: sprint1Start ?? projectStart,
      preset,
      totalDays,
      projectedEnd,
      milestones: milestones.map((m) => ({
        id: m.id,
        phase: m.phase,
        name: m.name,
        durationDays: m.durationDays,
        date: m.start,
      })),
    }),
    [projectStart, sprint1Start, preset, totalDays, projectedEnd, milestones]
  );

  const handleDaysChange = useCallback((id: string, value: number | null) => {
    setOverrides((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      toast.success('JSON copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
      setIsJsonModalOpen(true);
    }
  }, [exportData]);

  const handleReset = useCallback(() => {
    setProjectStart(getTodayISO());
    setPreset('Big');
    setShowDetailed(true);
    setOverrides({});
    setLockedDevStart(null);
    setIsTimelineViewOpen(false);
    toast.success('Timeline reset to defaults');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={predictorLogo} alt="Predictor" className="h-[42px] sm:h-[58px]" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Plan your product lifecycle with flexible milestone durations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <ControlsPanel
          projectStart={projectStart}
          onProjectStartChange={(date) => {
            setProjectStart(date);
            setLockedDevStart(null); // Clear locked dev start when project start is manually changed
          }}
          devStart={sprint1Start ?? projectStart}
          onDevStartChange={handleDevStartChange}
          preset={preset}
          onPresetChange={handlePresetChange}
          showDetailed={showDetailed}
          onShowDetailedChange={setShowDetailed}
          onCopyJson={handleCopyJson}
          onReset={handleReset}
          onShowTimeline={() => setIsTimelineViewOpen(true)}
        />

        <SummaryCards
          totalDays={totalDays}
          projectedEnd={projectedEnd}
          sprint1Start={sprint1Start}
          daysToSprint1={daysToSprint1}
          showDetailed={showDetailed}
        />

        <MilestoneTable
          milestones={milestones}
          showDetailed={showDetailed}
          onDaysChange={handleDaysChange}
        />
      </main>

      {/* JSON Modal */}
      <JsonExportModal
        data={exportData}
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
      />

      {/* Timeline View Modal */}
      <TimelineView
        milestones={milestones}
        isOpen={isTimelineViewOpen}
        onClose={() => setIsTimelineViewOpen(false)}
        onDaysChange={handleDaysChange}
      />
    </div>
  );
};

export default Index;
