import { MilestoneConfig, MilestoneState } from '@/types/timeline';
import { format, addDays, parseISO } from 'date-fns';

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'brief', phase: 'PLC', name: 'Brief', minDays: 7, maxDays: 14 },
  { id: 'pre-concept', phase: 'PLC', name: 'Pre-Concept', minDays: 21, maxDays: 21 },
  { id: 'concept', phase: 'PLC', name: 'Concept', minDays: 5, maxDays: 5 },
  { id: 'art-sketch', phase: 'PLC', name: 'Art Sketch', minDays: 28, maxDays: 42 },
  { id: 'sketch', phase: 'PLC', name: 'Sketch', minDays: 7, maxDays: 14 },
  { id: 'i-phase', phase: 'PLC', name: 'I-Phase', minDays: 7, maxDays: 14 },
  { id: 'sprint-1', phase: 'Delivery', name: 'Sprint 1', minDays: 14, maxDays: 14 },
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
  projectStart: string,
  speed: number
): MilestoneState[] {
  const startDate = parseISO(projectStart);
  let currentDate = startDate;

  return configs.map((config) => {
    const overrideDays = overrides[config.id] ?? null;
    const durationDays = calculateDuration(
      config.minDays,
      config.maxDays,
      speed,
      overrideDays
    );

    const start = format(currentDate, 'yyyy-MM-dd');
    const endDate = addDays(currentDate, durationDays);
    const end = format(endDate, 'yyyy-MM-dd');

    currentDate = endDate;

    return {
      ...config,
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
