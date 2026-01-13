import { MilestoneConfig, MilestoneState, MinMaxOverrides } from '@/types/timeline';
import { format, addDays, parseISO } from 'date-fns';

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'brief', phase: 'PLC', name: 'Brief', defaultMinDays: 7, defaultMaxDays: 14 },
  { id: 'pre-concept', phase: 'PLC', name: 'Pre-Concept', defaultMinDays: 21, defaultMaxDays: 21 },
  { id: 'concept', phase: 'PLC', name: 'Concept', defaultMinDays: 5, defaultMaxDays: 5 },
  { id: 'art-sketch', phase: 'PLC', name: 'Art Sketch', defaultMinDays: 28, defaultMaxDays: 42 },
  { id: 'sketch', phase: 'PLC', name: 'Sketch', defaultMinDays: 7, defaultMaxDays: 14 },
  { id: 'i-phase', phase: 'PLC', name: 'I-Phase', defaultMinDays: 7, defaultMaxDays: 14 },
  { id: 'sprint-1', phase: 'Delivery', name: 'Sprint 1', defaultMinDays: 14, defaultMaxDays: 14 },
];

export function calculateDuration(
  minDays: number,
  maxDays: number,
  speed: number,
  overrideDays: number | null
): number {
  if (overrideDays !== null && overrideDays >= 0) {
    return overrideDays;
  }
  const midpoint = (minDays + maxDays) / 2;
  return Math.round(midpoint * speed);
}

export function calculateTimeline(
  configs: MilestoneConfig[],
  overrides: Record<string, number | null>,
  minMaxOverrides: MinMaxOverrides,
  projectStart: string,
  speed: number
): MilestoneState[] {
  const startDate = parseISO(projectStart);
  let currentDate = startDate;

  return configs.map((config) => {
    const overrideDays = overrides[config.id] ?? null;
    const minDays = minMaxOverrides[config.id]?.min ?? config.defaultMinDays;
    const maxDays = minMaxOverrides[config.id]?.max ?? config.defaultMaxDays;
    
    const durationDays = calculateDuration(
      minDays,
      maxDays,
      speed,
      overrideDays
    );

    const start = format(currentDate, 'yyyy-MM-dd');
    const endDate = addDays(currentDate, durationDays);
    const end = format(endDate, 'yyyy-MM-dd');

    currentDate = endDate;

    return {
      ...config,
      minDays,
      maxDays,
      overrideDays,
      durationDays,
      start,
      end,
    };
  });
}

export function formatDateDisplay(isoDate: string): string {
  const date = parseISO(isoDate);
  return format(date, 'MMM d, yyyy');
}

export function daysToWeeks(days: number): string {
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (weeks === 0) return '';
  if (remainingDays === 0) return `${weeks}w`;
  return `${weeks}w ${remainingDays}d`;
}

export function formatDuration(days: number, showWeeks: boolean): string {
  if (!showWeeks) return `${days}`;
  const weeksStr = daysToWeeks(days);
  return weeksStr ? `${days} (${weeksStr})` : `${days}`;
}

export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
