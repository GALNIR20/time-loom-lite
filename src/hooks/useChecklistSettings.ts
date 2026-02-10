import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '@/hooks/useGame';

const BASE_STORAGE_KEY = 'predictor-checklist-settings';

// Color palette for section icons
export const SECTION_ICON_COLORS = [
  'blue', 'purple', 'emerald', 'orange', 'red', 'cyan', 'pink', 'yellow', 'indigo', 'green',
] as const;

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistSection {
  id: string;
  label: string;
  color: string;
  items: ChecklistItem[];
}

/**
 * Per-milestone deliverables configuration.
 * Key = milestone ID (e.g. 'brief', 'sketch', 'concept')
 * Value = array of checklist sections for that milestone.
 */
export interface ChecklistSettingsData {
  milestoneDeliverables: Record<string, ChecklistSection[]>;
}

// Default deliverables — applied to every milestone initially
const DEFAULT_SECTIONS: ChecklistSection[] = [
  {
    id: 'product',
    label: 'Product',
    color: 'blue',
    items: [
      { id: 'goal-kpi', label: "Goal and KPI's" },
      { id: 'target-audience', label: 'Target audience' },
      { id: 'ci', label: 'CI' },
      { id: 'loop-feature-mechanics', label: 'Loop and Feature Mechanics' },
      { id: 'feature-plc-timeline', label: 'Feature PLC timeline' },
      { id: 'layer-pyramid', label: 'Layer - pyramid' },
    ],
  },
  {
    id: 'uxui',
    label: 'UX/UI',
    color: 'purple',
    items: [
      { id: 'wireframes-basic-3', label: 'Main flows - up to 3 Wireframes basic core loop' },
      { id: 'wireframes-extended-6', label: 'Main flows - up to 6 Wireframes extended flow' },
      { id: 'wireframes-gameplay', label: 'Main flows - gameplay wide Wireframes' },
      { id: 'hl-narrative', label: 'HL Narrative connection (story)' },
      { id: 'hl-1-3-narrative', label: 'HL 1-3 Narrative connection (story)' },
    ],
  },
  {
    id: 'economy',
    label: 'Economy team',
    color: 'emerald',
    items: [
      { id: 'draft-config-file', label: 'Draft configuration file' },
    ],
  },
];

/** Get milestone IDs from the milestone settings in localStorage */
function getMilestoneIds(): string[] {
  try {
    const game = localStorage.getItem('predictor-selected-game');
    const msKey = game
      ? `predictor-milestone-settings-${game}`
      : 'predictor-milestone-settings';
    const raw = localStorage.getItem(msKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.milestones && Array.isArray(parsed.milestones)) {
        return parsed.milestones.map((m: { id: string }) => m.id);
      }
    }
  } catch {}
  // Default milestone IDs
  return ['brief', 'pre-concept', 'concept', 'art-sketch', 'sketch', 'i-phase'];
}

function buildDefaultSettings(): ChecklistSettingsData {
  const milestoneIds = getMilestoneIds();
  const milestoneDeliverables: Record<string, ChecklistSection[]> = {};
  for (const id of milestoneIds) {
    // Deep copy so each milestone gets an independent set
    milestoneDeliverables[id] = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
  }
  return { milestoneDeliverables };
}

function getStorageKey(): string {
  try {
    const game = localStorage.getItem('predictor-selected-game');
    if (game) return `${BASE_STORAGE_KEY}-${game}`;
  } catch {}
  return BASE_STORAGE_KEY;
}

function loadSettings(): ChecklistSettingsData {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      // New per-milestone format
      if (parsed.milestoneDeliverables && typeof parsed.milestoneDeliverables === 'object') {
        // Ensure all current milestones have an entry (new milestones get defaults)
        const milestoneIds = getMilestoneIds();
        for (const id of milestoneIds) {
          if (!parsed.milestoneDeliverables[id]) {
            parsed.milestoneDeliverables[id] = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
          }
        }
        return parsed as ChecklistSettingsData;
      }
      // Migrate from old global format: { sections: [...] }
      if (parsed.sections && Array.isArray(parsed.sections)) {
        const milestoneIds = getMilestoneIds();
        const milestoneDeliverables: Record<string, ChecklistSection[]> = {};
        for (const id of milestoneIds) {
          milestoneDeliverables[id] = JSON.parse(JSON.stringify(parsed.sections));
        }
        const migrated: ChecklistSettingsData = { milestoneDeliverables };
        saveSettings(migrated);
        return migrated;
      }
    }
  } catch {}
  return buildDefaultSettings();
}

function saveSettings(settings: ChecklistSettingsData) {
  localStorage.setItem(getStorageKey(), JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('checklistSettingsUpdated'));
}

export function useChecklistSettings() {
  const { selectedGame } = useGame();
  const [settings, setSettings] = useState<ChecklistSettingsData>(loadSettings);

  // Reload when game changes
  useEffect(() => {
    setSettings(loadSettings());
  }, [selectedGame]);

  // Listen for milestone settings changes (new milestones added/removed)
  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener('checklistSettingsUpdated', handler);
    window.addEventListener('milestoneSettingsUpdated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('checklistSettingsUpdated', handler);
      window.removeEventListener('milestoneSettingsUpdated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // --- Section operations (scoped to a specific milestone) ---

  const addSection = useCallback((milestoneId: string, label: string, color: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
      let id = baseId;
      let counter = 1;
      while (sections.some(s => s.id === id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: [...sections, { id, label, color, items: [] }],
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateSectionLabel = useCallback((milestoneId: string, sectionId: string, label: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.map(s => s.id === sectionId ? { ...s, label } : s),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateSectionColor = useCallback((milestoneId: string, sectionId: string, color: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.map(s => s.id === sectionId ? { ...s, color } : s),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const removeSection = useCallback((milestoneId: string, sectionId: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.filter(s => s.id !== sectionId),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Item operations (scoped to a specific milestone + section) ---

  const addItem = useCallback((milestoneId: string, sectionId: string, label: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const section = sections.find(s => s.id === sectionId);
      if (!section) return prev;
      const baseId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
      let id = baseId;
      let counter = 1;
      const allIds = sections.flatMap(s => s.items.map(i => i.id));
      while (allIds.includes(id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.map(s =>
            s.id === sectionId ? { ...s, items: [...s.items, { id, label }] } : s
          ),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateItemLabel = useCallback((milestoneId: string, sectionId: string, itemId: string, label: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.map(s =>
            s.id === sectionId
              ? { ...s, items: s.items.map(i => i.id === itemId ? { ...i, label } : i) }
              : s
          ),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const removeItem = useCallback((milestoneId: string, sectionId: string, itemId: string) => {
    setSettings(prev => {
      const sections = prev.milestoneDeliverables[milestoneId] || [];
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [milestoneId]: sections.map(s =>
            s.id === sectionId
              ? { ...s, items: s.items.filter(i => i.id !== itemId) }
              : s
          ),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Copy deliverables from one milestone to another ---
  const copyFromMilestone = useCallback((sourceMilestoneId: string, targetMilestoneId: string) => {
    setSettings(prev => {
      const sourceSections = prev.milestoneDeliverables[sourceMilestoneId];
      if (!sourceSections) return prev;
      const updated: ChecklistSettingsData = {
        ...prev,
        milestoneDeliverables: {
          ...prev.milestoneDeliverables,
          [targetMilestoneId]: JSON.parse(JSON.stringify(sourceSections)),
        },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // --- Reset ---

  const resetToDefaults = useCallback(() => {
    const defaults = buildDefaultSettings();
    saveSettings(defaults);
    setSettings(defaults);
  }, []);

  // --- Computed: all milestone IDs that have config ---
  const configuredMilestoneIds = useMemo(() => {
    return Object.keys(settings.milestoneDeliverables);
  }, [settings]);

  return {
    settings,
    addSection,
    updateSectionLabel,
    updateSectionColor,
    removeSection,
    addItem,
    updateItemLabel,
    removeItem,
    copyFromMilestone,
    resetToDefaults,
    configuredMilestoneIds,
  };
}

// ---- Static helpers for use outside React components ----

export function getChecklistSettings(): ChecklistSettingsData {
  return loadSettings();
}

/** Get checklist sections for a specific milestone */
export function getChecklistForMilestone(milestoneId: string): ChecklistSection[] {
  const settings = loadSettings();
  return settings.milestoneDeliverables[milestoneId] || [];
}

/** Get all item IDs for a specific milestone */
export function getItemIdsForMilestone(milestoneId: string): string[] {
  const sections = getChecklistForMilestone(milestoneId);
  return sections.flatMap(s => s.items.map(i => i.id));
}

/** Get all unique item IDs across all milestones (for backward compat) */
export function getAllChecklistItemIds(): string[] {
  const settings = loadSettings();
  const allIds = new Set<string>();
  for (const sections of Object.values(settings.milestoneDeliverables)) {
    for (const section of sections) {
      for (const item of section.items) {
        allIds.add(item.id);
      }
    }
  }
  return [...allIds];
}
