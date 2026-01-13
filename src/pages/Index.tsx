import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ControlsPanel } from '@/components/ControlsPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { MilestoneTable } from '@/components/MilestoneTable';
import { JsonExportModal } from '@/components/JsonExportModal';
import {
  DEFAULT_MILESTONES,
  calculateTimeline,
  getTodayISO,
} from '@/lib/timeline';
import { TimelineExport } from '@/types/timeline';

const Index = () => {
  const [projectStart, setProjectStart] = useState(getTodayISO);
  const [devStart, setDevStart] = useState(getTodayISO);
  const [speed, setSpeed] = useState(1.0);
  const [showDetailed, setShowDetailed] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);

  const milestones = useMemo(
    () => calculateTimeline(DEFAULT_MILESTONES, overrides, projectStart, speed),
    [overrides, projectStart, speed]
  );

  const totalDays = useMemo(
    () => milestones.reduce((sum, m) => sum + m.durationDays, 0),
    [milestones]
  );

  const projectedEnd = useMemo(
    () => milestones[milestones.length - 1]?.end ?? projectStart,
    [milestones, projectStart]
  );

  const iPhaseData = useMemo(() => {
    const iPhase = milestones.find((m) => m.id === 'i-phase');
    if (!iPhase) return { start: null, daysTo: null };
    
    const daysToIPhase = milestones
      .filter((m) => milestones.indexOf(m) < milestones.indexOf(iPhase))
      .reduce((sum, m) => sum + m.durationDays, 0);
    
    return { start: iPhase.start, daysTo: daysToIPhase };
  }, [milestones]);

  const exportData: TimelineExport = useMemo(
    () => ({
      projectStart,
      devStart,
      speed,
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
    [projectStart, devStart, speed, totalDays, projectedEnd, milestones]
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
    setDevStart(getTodayISO());
    setSpeed(1.0);
    setShowDetailed(true);
    setOverrides({});
    toast.success('Timeline reset to defaults');
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">Timeline Sandbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan your product lifecycle with flexible milestone durations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <ControlsPanel
          projectStart={projectStart}
          onProjectStartChange={setProjectStart}
          devStart={devStart}
          onDevStartChange={setDevStart}
          speed={speed}
          onSpeedChange={setSpeed}
          showDetailed={showDetailed}
          onShowDetailedChange={setShowDetailed}
          onCopyJson={handleCopyJson}
          onReset={handleReset}
        />

        <SummaryCards
          totalDays={totalDays}
          projectedEnd={projectedEnd}
          iPhaseStart={iPhaseData.start}
          daysToIPhase={iPhaseData.daysTo}
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
    </div>
  );
};

export default Index;
