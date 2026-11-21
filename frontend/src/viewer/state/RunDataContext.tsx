import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { RunFile } from '../../types/run';
import { buildRunIndex, type RunIndex } from '../lib/runIndex';
import {
  computeRoomLayout,
  computeRoomLayoutFromGeometry,
  computeDoorPositions,
  computeObjectPositions,
  type RoomRect,
  type DoorMarkerData,
  type ObjectMarkerData,
} from '../lib/roomLayout';

interface RunDataContextValue {
  run: RunFile;
  index: RunIndex;
  /** Real floor-plan rects from `run.environment.rooms.*.geometry` when present (every run recorded after backend Round 9/10); falls back to the schematic near-square grid pack over index.roomNames for older run files. */
  roomLayout: Record<string, RoomRect>;
  /** Door markers from `run.environment.doors[].world_position` — tile-space pixels, so only populated when roomLayout is ALSO the real geometry layout (never mixed with the schematic grid-pack); empty otherwise, including when `environment` is present but some room's `geometry` is missing and roomLayout fell back to schematic. */
  doorPositions: Record<string, DoorMarkerData>;
  /** Object markers from every room's object_details — same tile-space-pixels gating as doorPositions (only populated alongside the real geometry layout). Empty for a run recorded before object_details existed. */
  objectPositions: ObjectMarkerData[];
  /** Stable per-run agent order (Object.keys(run.agents)) — the color/legend order everything (map tokens, social graph, trend series) keys off. */
  agentIds: string[];
  /** Identity of the loaded run, stable across a live run's own 2s polling
   *  (Viewer.tsx's state.fileName — same string every poll while status
   *  stays e.g. "running", changes only on a genuine run switch or a
   *  terminal status transition). `run` itself gets a brand-new object
   *  reference on every single live poll (fresh fetch + JSON.parse each
   *  time, even though the room layout it contains is almost always
   *  unchanged) — anything that should reset only when the user switches to
   *  a REAL different run (MapCanvas's camera fit-to-content, notably) must
   *  key off this instead of `roomLayout`/`run`'s own reference identity,
   *  or it fires on every poll instead of on an actual file change. */
  runKey: string;
}

const RunDataContext = createContext<RunDataContextValue | null>(null);

export function RunDataProvider({ run, runKey, children }: { run: RunFile; runKey: string; children: ReactNode }) {
  const value = useMemo<RunDataContextValue>(() => {
    const index = buildRunIndex(run);
    const geometryLayout = run.environment ? computeRoomLayoutFromGeometry(run.environment.rooms) : null;
    return {
      run,
      index,
      roomLayout: geometryLayout ?? computeRoomLayout(index.roomNames),
      doorPositions: geometryLayout ? computeDoorPositions(run.environment!.doors, geometryLayout) : {},
      objectPositions: geometryLayout ? computeObjectPositions(run.environment!.rooms) : [],
      agentIds: Object.keys(run.agents),
      runKey,
    };
  }, [run, runKey]);

  return <RunDataContext.Provider value={value}>{children}</RunDataContext.Provider>;
}

export function useRunData(): RunDataContextValue {
  const ctx = useContext(RunDataContext);
  if (!ctx) throw new Error('useRunData must be used within a RunDataProvider');
  return ctx;
}
