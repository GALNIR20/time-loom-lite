import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { CalendarCheck, Clock, Target } from 'lucide-react';

interface SummaryCardsProps {
  totalDays: number;
  projectedEnd: string;
  iPhaseStart: string | null;
  daysToIPhase: number | null;
  showDetailed: boolean;
}

export function SummaryCards({ 
  totalDays, 
  projectedEnd, 
  iPhaseStart, 
  daysToIPhase, 
  showDetailed 
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Total Duration</span>
        </div>
        <div className="mt-2">
          <span className="summary-value">{formatDuration(totalDays, showDetailed)}</span>
          <span className="summary-subtext ml-2">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Start → I-Phase</span>
        </div>
        <div className="mt-2">
          {daysToIPhase !== null && iPhaseStart ? (
            <>
              <span className="summary-value">{formatDuration(daysToIPhase, showDetailed)}</span>
              <span className="summary-subtext ml-2">days ({formatDateDisplay(iPhaseStart)})</span>
            </>
          ) : (
            <span className="summary-subtext">N/A</span>
          )}
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-4 h-4 text-primary" />
          </div>
          <span className="summary-label">Projected End Date</span>
        </div>
        <div className="mt-2">
          <span className="summary-value">{formatDateDisplay(projectedEnd)}</span>
        </div>
      </div>
    </div>
  );
}
