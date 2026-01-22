import { formatDateDisplay, formatDuration } from '@/lib/timeline';
import { CalendarCheck, Clock, Target, Rocket, PlayCircle } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';

interface SummaryCardsProps {
  totalDays: number;
  projectedEnd: string;
  iPhaseStart: string | null;
  daysToIPhase: number | null;
  showDetailed: boolean;
  devDays: number;
  projectStart: string;
}

export function SummaryCards({ 
  totalDays, 
  projectedEnd, 
  iPhaseStart, 
  daysToIPhase, 
  showDetailed,
  devDays,
  projectStart
}: SummaryCardsProps) {
  const daysToStart = differenceInDays(parseISO(projectStart), new Date());
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
      <div className="summary-card">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
          </div>
          <span className="summary-label text-[10px] sm:text-xs">Total Duration</span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="summary-value text-base sm:text-2xl">{formatDuration(totalDays, showDetailed)}</span>
          <span className="summary-subtext ml-1 sm:ml-2 text-[10px] sm:text-sm">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
          </div>
          <span className="summary-label text-[10px] sm:text-xs">To I-Phase</span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          {daysToIPhase !== null && iPhaseStart ? (
            <div className="flex flex-col">
              <span className="summary-value text-base sm:text-2xl">{formatDuration(daysToIPhase, showDetailed)}</span>
              <span className="summary-subtext text-[9px] sm:text-xs">days ({formatDateDisplay(iPhaseStart)})</span>
            </div>
          ) : (
            <span className="summary-subtext">N/A</span>
          )}
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
          </div>
          <span className="summary-label text-[10px] sm:text-xs">Dev Time</span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="summary-value text-base sm:text-2xl">{formatDuration(devDays, showDetailed)}</span>
          <span className="summary-subtext ml-1 sm:ml-2 text-[10px] sm:text-sm">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <PlayCircle className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
          </div>
          <span className="summary-label text-[10px] sm:text-xs">Days to Start</span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="summary-value text-base sm:text-2xl">{daysToStart}</span>
          <span className="summary-subtext ml-1 sm:ml-2 text-[10px] sm:text-sm">days</span>
        </div>
      </div>

      <div className="summary-card">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-3 sm:w-4 h-3 sm:h-4 text-primary" />
          </div>
          <span className="summary-label text-[10px] sm:text-xs">RFC Estimation</span>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="summary-value text-base sm:text-2xl">{formatDateDisplay(projectedEnd)}</span>
        </div>
      </div>
    </div>
  );
}
