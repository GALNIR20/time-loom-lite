export interface MilestoneConfig {
  id: string;
  phase: 'PLC' | 'Delivery';
  name: string;
  minDays: number;
  maxDays: number;
}

export interface MilestoneState extends MilestoneConfig {
  overrideDays: number | null;
  durationDays: number;
  start: string;
  end: string;
}

export interface TimelineExport {
  projectStart: string;
  speed: number;
  totalDays: number;
  projectedEnd: string;
  milestones: Array<{
    id: string;
    phase: string;
    name: string;
    minDays: number;
    maxDays: number;
    overrideDays?: number;
    durationDays: number;
    start: string;
    end: string;
  }>;
}
