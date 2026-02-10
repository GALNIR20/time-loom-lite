import { useState, useEffect, useCallback } from 'react';
import { PhaseType, PresetType, MilestoneConfig, PhaseConfig } from '@/types/timeline';
import { useGame } from '@/hooks/useGame';

const BASE_STORAGE_KEY = 'predictor-milestone-settings';

// Build a game-specific storage key by reading the selected game from localStorage
function getStorageKey(): string {
  try {
    const game = localStorage.getItem('predictor-selected-game');
    if (game) return `${BASE_STORAGE_KEY}-${game}`;
  } catch {}
  return BASE_STORAGE_KEY;
}

// Available phase colors for the UI
export const PHASE_COLOR_OPTIONS = [
  'blue', 'purple', 'green', 'orange', 'red', 'cyan', 'pink', 'yellow', 'indigo', 'emerald',
] as const;

export interface SprintCodeConfig {
  prefix: string;           // e.g. "2." or "" for no prefix
  referenceNumber: number;  // sprint number at the reference date
  referenceDate: string;    // ISO date string for the reference point
}

export interface MilestoneSettingsData {
  milestones: Array<{
    id: string;
    name: string;
    phase: PhaseType;
  }>;
  phases: PhaseConfig[];
  presets: Record<PresetType, Record<string, number>>;
  presetNames: Record<PresetType, string>;
  sprintWeeks: number;
  sprintCode: SprintCodeConfig;
}

const DEFAULT_PHASES: PhaseConfig[] = [
  { id: 'concept-phase', name: 'Concept Phase', color: 'blue' },
  { id: 'sketch-phase', name: 'Sketch Phase', color: 'purple' },
  { id: 'development', name: 'Development', color: 'green' },
];

const DEFAULT_PRESET_NAMES: Record<PresetType, string> = {
  Big: 'Big PLC',
  Medium: 'Medium PLC',
  BLITZ: 'BLITZ',
};

const DEFAULT_SPRINT_CODE: SprintCodeConfig = {
  prefix: '2.',
  referenceNumber: 409,
  referenceDate: '2026-01-13',
};

const DEFAULT_SETTINGS: MilestoneSettingsData = {
  milestones: [
    { id: 'brief', phase: 'concept-phase', name: 'Brief' },
    { id: 'pre-concept', phase: 'concept-phase', name: 'Pre-Concept' },
    { id: 'concept', phase: 'concept-phase', name: 'Concept' },
    { id: 'art-sketch', phase: 'sketch-phase', name: 'Art Sketch' },
    { id: 'sketch', phase: 'sketch-phase', name: 'Sketch' },
    { id: 'i-phase', phase: 'development', name: 'I-Phase' },
  ],
  phases: [...DEFAULT_PHASES],
  presets: {
    Big: {
      'brief': 14,
      'pre-concept': 21,
      'concept': 42,
      'art-sketch': 7,
      'sketch': 14,
      'i-phase': 14,
    },
    Medium: {
      'brief': 7,
      'pre-concept': 17,
      'concept': 28,
      'art-sketch': 7,
      'sketch': 7,
      'i-phase': 7,
    },
    BLITZ: {
      'brief': 5,
      'pre-concept': 10,
      'concept': 14,
      'art-sketch': 3,
      'sketch': 7,
      'i-phase': 7,
    },
  },
  presetNames: { ...DEFAULT_PRESET_NAMES },
  sprintWeeks: 2,
  sprintCode: { ...DEFAULT_SPRINT_CODE },
};

// Map old phase name strings to new phase IDs for migration
const PHASE_NAME_TO_ID: Record<string, string> = {
  'Concept Phase': 'concept-phase',
  'Sketch Phase': 'sketch-phase',
  'Development': 'development',
};

function loadSettings(): MilestoneSettingsData {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as MilestoneSettingsData;
      // Validate structure
      if (parsed.milestones && parsed.presets) {
        // Migrate: add presetNames if missing
        if (!parsed.presetNames) {
          parsed.presetNames = { ...DEFAULT_PRESET_NAMES };
        }
        // Migrate: add sprintWeeks if missing (default 2 weeks)
        if (parsed.sprintWeeks === undefined || parsed.sprintWeeks === null) {
          parsed.sprintWeeks = 2;
        }
        // Migrate: add sprintCode if missing
        if (!parsed.sprintCode) {
          parsed.sprintCode = { ...DEFAULT_SPRINT_CODE };
        }
        // Migrate: add phases if missing (from older saved data)
        if (!parsed.phases) {
          parsed.phases = [...DEFAULT_PHASES];
          // Also migrate milestone phase references from name to ID
          parsed.milestones = parsed.milestones.map(m => ({
            ...m,
            phase: PHASE_NAME_TO_ID[m.phase] || m.phase,
          }));
        }
        return parsed;
      }
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: MilestoneSettingsData) {
  localStorage.setItem(getStorageKey(), JSON.stringify(settings));
  // Dispatch event so other components can react
  window.dispatchEvent(new CustomEvent('milestoneSettingsUpdated'));
}

export function useMilestoneSettings() {
  const { selectedGame } = useGame();
  const [settings, setSettings] = useState<MilestoneSettingsData>(loadSettings);

  // Reload settings when game changes
  useEffect(() => {
    setSettings(loadSettings());
  }, [selectedGame]);

  // Listen for changes from other tabs/components
  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener('milestoneSettingsUpdated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('milestoneSettingsUpdated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // --- Milestone operations ---

  const updateMilestoneName = useCallback((id: string, newName: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === id ? { ...m, name: newName } : m
        ),
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateMilestonePhase = useCallback((milestoneId: string, phaseId: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === milestoneId ? { ...m, phase: phaseId } : m
        ),
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const addMilestone = useCallback((name: string, phaseId: string, insertIndex?: number) => {
    setSettings(prev => {
      // Generate a unique ID from the name
      const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let id = baseId || 'milestone';
      let counter = 1;
      while (prev.milestones.some(m => m.id === id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }

      const newMilestone = { id, name, phase: phaseId };
      const newMilestones = [...prev.milestones];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newMilestones.length) {
        newMilestones.splice(insertIndex, 0, newMilestone);
      } else {
        // Insert before the last milestone (i-phase/development)
        newMilestones.splice(Math.max(0, newMilestones.length - 1), 0, newMilestone);
      }

      // Add default durations for all presets (default to 7 days)
      const newPresets = { ...prev.presets };
      for (const preset of ['Big', 'Medium', 'BLITZ'] as PresetType[]) {
        newPresets[preset] = { ...newPresets[preset], [id]: 7 };
      }

      const updated = { ...prev, milestones: newMilestones, presets: newPresets };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const removeMilestone = useCallback((milestoneId: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        milestones: prev.milestones.filter(m => m.id !== milestoneId),
        presets: Object.fromEntries(
          Object.entries(prev.presets).map(([preset, durations]) => {
            const { [milestoneId]: _, ...rest } = durations;
            return [preset, rest];
          })
        ) as Record<PresetType, Record<string, number>>,
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const reorderMilestones = useCallback((fromIndex: number, toIndex: number) => {
    setSettings(prev => {
      const newMilestones = [...prev.milestones];
      const [moved] = newMilestones.splice(fromIndex, 1);
      newMilestones.splice(toIndex, 0, moved);
      const updated = { ...prev, milestones: newMilestones };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Preset operations ---

  const updatePresetName = useCallback((preset: PresetType, newName: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        presetNames: {
          ...prev.presetNames,
          [preset]: newName,
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updatePresetDuration = useCallback((preset: PresetType, milestoneId: string, days: number) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        presets: {
          ...prev.presets,
          [preset]: {
            ...prev.presets[preset],
            [milestoneId]: days,
          },
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Phase operations ---

  const updatePhaseName = useCallback((phaseId: string, newName: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        phases: prev.phases.map(p =>
          p.id === phaseId ? { ...p, name: newName } : p
        ),
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updatePhaseColor = useCallback((phaseId: string, color: string) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        phases: prev.phases.map(p =>
          p.id === phaseId ? { ...p, color } : p
        ),
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const addPhase = useCallback((name: string, color: string) => {
    setSettings(prev => {
      const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      let id = baseId || 'phase';
      let counter = 1;
      while (prev.phases.some(p => p.id === id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      const updated = {
        ...prev,
        phases: [...prev.phases, { id, name, color }],
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const removePhase = useCallback((phaseId: string) => {
    setSettings(prev => {
      // Don't remove if milestones still reference it
      const hasRefs = prev.milestones.some(m => m.phase === phaseId);
      if (hasRefs) return prev;
      const updated = {
        ...prev,
        phases: prev.phases.filter(p => p.id !== phaseId),
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Sprint duration ---

  const updateSprintWeeks = useCallback((weeks: number) => {
    const clamped = Math.max(1, Math.min(8, Math.round(weeks)));
    setSettings(prev => {
      const updated = { ...prev, sprintWeeks: clamped };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Sprint code config ---

  const updateSprintCode = useCallback((update: Partial<SprintCodeConfig>) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        sprintCode: { ...(prev.sprintCode || DEFAULT_SPRINT_CODE), ...update },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Reset ---

  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // --- Config getters ---

  const getMilestoneConfigs = useCallback((): MilestoneConfig[] => {
    return settings.milestones.map(m => {
      const phase = settings.phases.find(p => p.id === m.phase);
      return {
        id: m.id,
        phase: phase?.name || m.phase,
        name: m.name,
      };
    });
  }, [settings]);

  const getPresetConfigs = useCallback((): Record<PresetType, Record<string, number>> => {
    return {
      Big: { ...settings.presets.Big, 'sprint-1': 0 },
      Medium: { ...settings.presets.Medium, 'sprint-1': 0 },
      BLITZ: { ...settings.presets.BLITZ, 'sprint-1': 0 },
    };
  }, [settings]);

  return {
    settings,
    updateMilestoneName,
    updateMilestonePhase,
    updatePresetName,
    updatePresetDuration,
    updatePhaseName,
    updatePhaseColor,
    addPhase,
    removePhase,
    addMilestone,
    removeMilestone,
    reorderMilestones,
    updateSprintWeeks,
    updateSprintCode,
    resetToDefaults,
    getMilestoneConfigs,
    getPresetConfigs,
    DEFAULT_SETTINGS,
  };
}

// Static helpers for use outside of React components
export function getMilestoneSettings(): MilestoneSettingsData {
  return loadSettings();
}

export function getCustomMilestoneConfigs(): MilestoneConfig[] {
  const settings = loadSettings();
  return settings.milestones.map(m => {
    const phase = settings.phases.find(p => p.id === m.phase);
    return {
      id: m.id,
      phase: phase?.name || m.phase,
      name: m.name,
    };
  });
}

export function getCustomPresetConfigs(): Record<PresetType, Record<string, number>> {
  const settings = loadSettings();
  return {
    Big: { ...settings.presets.Big, 'sprint-1': 0 },
    Medium: { ...settings.presets.Medium, 'sprint-1': 0 },
    BLITZ: { ...settings.presets.BLITZ, 'sprint-1': 0 },
  };
}

export function getPresetDisplayNames(): Record<PresetType, string> {
  const settings = loadSettings();
  return settings.presetNames || DEFAULT_PRESET_NAMES;
}

export function getPhaseConfigs(): PhaseConfig[] {
  const settings = loadSettings();
  return settings.phases || [...DEFAULT_PHASES];
}

// Get the sprint duration in days for the current game
export function getSprintDurationDays(): number {
  const settings = loadSettings();
  return (settings.sprintWeeks || 2) * 7;
}

// Get the sprint duration in weeks for the current game
export function getSprintWeeks(): number {
  const settings = loadSettings();
  return settings.sprintWeeks || 2;
}

// Get the sprint code configuration for the current game
export function getSprintCodeConfig(): SprintCodeConfig {
  const settings = loadSettings();
  return settings.sprintCode || { ...DEFAULT_SPRINT_CODE };
}

// Get the color class for a phase by name (for use in components)
export function getPhaseColor(phaseName: string): string {
  const settings = loadSettings();
  // Look up by phase name
  const phase = settings.phases.find(p => p.name === phaseName);
  if (phase) return phase.color;
  // Fallback for legacy phase names
  if (phaseName.toLowerCase().includes('concept')) return 'blue';
  if (phaseName.toLowerCase().includes('sketch')) return 'purple';
  if (phaseName.toLowerCase().includes('development')) return 'green';
  return 'blue';
}
