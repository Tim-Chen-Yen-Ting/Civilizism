import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useRunData } from './RunDataContext';

interface PlaybackContextValue {
  currentTick: number;
  setCurrentTick: (t: number) => void;
  /** Single-click camera target on the map — local to the map's own camera
   *  state elsewhere, kept here only because it's shared across map + panel. */
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  /** Double-click panel target; null = panel closed. */
  panelAgentId: string | null;
  panelTab: 1 | 2 | 3;
  openPanel: (agentId: string, tab?: 1 | 2 | 3) => void;
  closePanel: () => void;
  setPanelTab: (tab: 1 | 2 | 3) => void;
  /** True while Viewer.tsx is polling a running simulation's checkpoint —
   *  PlaybackBar disables manual scrubbing during this, since the tick head
   *  is being pinned to the latest tick on every poll instead. */
  live: boolean;
  setLive: (live: boolean) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { index } = useRunData();
  const [currentTick, setCurrentTick] = useState<number>(() => index.ticks[0] ?? 0);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [panelAgentId, setPanelAgentId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<1 | 2 | 3>(1);
  const [live, setLive] = useState(false);

  const openPanel = useCallback((agentId: string, tab: 1 | 2 | 3 = 1) => {
    setPanelAgentId(agentId);
    setPanelTab(tab);
  }, []);

  const closePanel = useCallback(() => setPanelAgentId(null), []);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      currentTick,
      setCurrentTick,
      selectedAgentId,
      setSelectedAgentId,
      panelAgentId,
      panelTab,
      openPanel,
      closePanel,
      setPanelTab,
      live,
      setLive,
    }),
    [currentTick, selectedAgentId, panelAgentId, panelTab, openPanel, closePanel, live],
  );

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider');
  return ctx;
}
