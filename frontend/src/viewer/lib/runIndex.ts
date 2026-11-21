import type { ActivityLogEntry, AgentSnapshot, RunFile } from '../../types/run';

/**
 * Precomputed, file-load-time index over a RunFile. Built once (useMemo keyed
 * on the RunFile object identity) and never touched again on a tick scrub —
 * see the perf note on snapshotAtOrBefore below.
 *
 * room_logs is deliberately never parsed here — it's confirmed byte-for-byte
 * the same entries as activity_log, just bucketed by region, so indexing it
 * too would hold a redundant copy for no benefit.
 */
export interface RunIndex {
  /** Union of every tick seen anywhere (activity_log ∪ every agent's
   *  snapshot_log), sorted ascending. NOT first_tick..last_tick — per-agent
   *  snapshot_log is not guaranteed dense or tick-aligned across agents. */
  ticks: number[];
  /** Per agent, sorted ascending — the array binary-searched by snapshotAtOrBefore. */
  agentSortedTicks: Record<string, number[]>;
  /** Per agent, exact-tick snapshot lookup. */
  agentSnapshotAt: Record<string, Map<number, AgentSnapshot>>;
  /** All agents, grouped by timestep, log order preserved. */
  activityByTick: Map<number, ActivityLogEntry[]>;
  /** key = `${agentId}:${tick}`, log order preserved. A single (agent, tick)
   *  commonly holds 2-10 entries (door-pass + arrival + action + speech). */
  agentActivityByTick: Map<string, ActivityLogEntry[]>;
  /** type === 'speech' entries, sorted by timestep — precomputed once for the
   *  scrubber's speech log. */
  speechEntries: ActivityLogEntry[];
  /** Union of every `location` + every `region` value, first-appearance order. */
  roomNames: string[];
  density: number;
}

export function buildRunIndex(run: RunFile): RunIndex {
  const ticksSet = new Set<number>();
  const activityByTick = new Map<number, ActivityLogEntry[]>();
  const agentActivityByTick = new Map<string, ActivityLogEntry[]>();
  const speechEntries: ActivityLogEntry[] = [];
  const roomNamesSeen: string[] = [];
  const roomNamesSet = new Set<string>();

  const noteRoom = (name: string | null | undefined) => {
    if (name && !roomNamesSet.has(name)) {
      roomNamesSet.add(name);
      roomNamesSeen.push(name);
    }
  };

  for (const entry of run.activity_log) {
    ticksSet.add(entry.timestep);

    const byTick = activityByTick.get(entry.timestep);
    if (byTick) byTick.push(entry);
    else activityByTick.set(entry.timestep, [entry]);

    const agentKey = `${entry.by_who}:${entry.timestep}`;
    const byAgent = agentActivityByTick.get(agentKey);
    if (byAgent) byAgent.push(entry);
    else agentActivityByTick.set(agentKey, [entry]);

    if (entry.type === 'speech') speechEntries.push(entry);
    noteRoom(entry.region);
  }
  speechEntries.sort((a, b) => a.timestep - b.timestep);

  const agentSortedTicks: Record<string, number[]> = {};
  const agentSnapshotAt: Record<string, Map<number, AgentSnapshot>> = {};

  for (const [agentId, record] of Object.entries(run.agents)) {
    const snapMap = new Map<number, AgentSnapshot>();
    for (const snap of record.snapshot_log) {
      ticksSet.add(snap.tick);
      snapMap.set(snap.tick, snap);
      noteRoom(snap.location);
    }
    agentSnapshotAt[agentId] = snapMap;
    agentSortedTicks[agentId] = Array.from(snapMap.keys()).sort((a, b) => a - b);
  }

  return {
    ticks: Array.from(ticksSet).sort((a, b) => a - b),
    agentSortedTicks,
    agentSnapshotAt,
    activityByTick,
    agentActivityByTick,
    speechEntries,
    roomNames: roomNamesSeen,
    density: run.resume.density,
  };
}

/**
 * Latest snapshot at or before `tick` for one agent, via binary search over
 * agentSortedTicks — O(log n) regardless of total tick count, so a per-agent
 * scrub lookup stays sub-millisecond even on the 288-tick file. Never index
 * snapshot_log by array position or assume the tick range is dense.
 */
export function snapshotAtOrBefore(index: RunIndex, agentId: string, tick: number): AgentSnapshot | null {
  const ticks = index.agentSortedTicks[agentId];
  if (!ticks || ticks.length === 0) return null;

  let lo = 0;
  let hi = ticks.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ticks[mid] <= tick) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (found === -1) return null;
  return index.agentSnapshotAt[agentId].get(ticks[found]) ?? null;
}

/** Every snapshot for one agent, in ascending tick order — the full-history
 *  read Tab 3's trend charts build their series from. */
export function agentSnapshotHistory(index: RunIndex, agentId: string): AgentSnapshot[] {
  const ticks = index.agentSortedTicks[agentId];
  const snapMap = index.agentSnapshotAt[agentId];
  if (!ticks || !snapMap) return [];
  const out: AgentSnapshot[] = [];
  for (const t of ticks) {
    const snap = snapMap.get(t);
    if (snap) out.push(snap);
  }
  return out;
}
