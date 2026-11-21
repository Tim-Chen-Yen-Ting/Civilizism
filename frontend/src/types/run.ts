/**
 * Shape of a completed (or checkpointed) simulation run, as written to
 * simulation_runs/run_<timestamp>.json by the Python engine (schema_version 2).
 *
 * Grounded in real run files (not assumed): simulation_runs/run_20260901_110029.json
 * (ContinuityCheck, 288 ticks) and simulation_runs/run_20260802_232407.json (SPE, with
 * coercive/coercion_refused entries) as of 2026-09-02.
 *
 * Two backend changes are in flight in the Python engine's working tree as of this
 * writing (uncommitted — `git diff` on agtMod/agtCore.py, sysMod/envr.py,
 * sysMod/spatialKit.py) and are NOT present in any run file produced so far:
 *   - `path` on a "movement" activity_log entry (tile-by-tile route).
 *   - `world_x`/`world_y` on a resumed agent, `world_position` on a snapshot_log
 *     entry, and `relationship_label` inside a social_circle entry.
 * All are typed optional/nullable below for exactly that reason — see the comments
 * at each field. The viewer must not assume any of them are present.
 */
export interface RunFile {
  schema_version: number;
  scenario_name: string;
  first_tick: number;
  last_tick: number;
  tick_count: number;
  llm_model: string;
  /** Real physical layout snapshot — envr.py's export_objective_map(), added to
   *  dump_simulation() in backend Round 9 (rooms) / Round 10 (doors). Every
   *  room the scenario declares gets a resolved tile geometry unconditionally
   *  (_generate_world_layout places every room, authored or auto-packed —
   *  confirmed live, not assumed), so in practice this is present on every run
   *  recorded from here on and absent only on a run recorded before Round 9
   *  shipped. Still typed optional — the viewer must fall back to the
   *  schematic layout when it's missing, not assume it's always there. */
  environment?: EnvironmentBlock;
  /** agent name -> faction name */
  factions: Record<string, string>;
  activity_log: ActivityLogEntry[];
  /** The same entries as activity_log, bucketed by region/room name — a
   *  per-room log rather than distinct data. */
  room_logs: Record<string, ActivityLogEntry[]>;
  resume: ResumeBlock;
  /** agent name -> that agent's full per-tick history + a final memory dump */
  agents: Record<string, AgentRunRecord>;
}

// ---------------------------------------------------------------------------
// activity_log — discriminated union on "type". Do NOT force one flat shape;
// each variant's real field set (and which fields are ever null/omitted) was
// checked against real data, not assumed from the field name.
// ---------------------------------------------------------------------------

interface ActivityLogEntryBase {
  timestep: number;
  by_who: string;
  content: string;
  region: string;
  /** Present on most but not all entries, even within the same "type" — e.g.
   *  only ~79% of "action" entries in one real run carried it. Some older
   *  runs wrote an explicit `null`; newer ones omit the key entirely for the
   *  same case. Always read with a fallback (`?? 0`), never assume present. */
  importance?: number | null;
}

export type ActivityLogEntry =
  | (ActivityLogEntryBase & {
      type: 'movement';
      /** Always "NA" in every real sample seen — movement doesn't target another agent/object. */
      target: string | null;
      /**
       * Tile-by-tile route walked for this hop, from the in-flight
       * WorldGrid pathfinder (sysMod/spatialKit.py). NOT present in any run
       * file produced so far (confirmed empty across every movement entry
       * checked) — optional until that backend work lands.
       * Fallback for the viewer when absent: tween a straight line between
       * the agent's last known position and this entry's room/tile instead
       * of an exact walked path.
       */
      path?: { x: number; y: number }[];
    })
  | (ActivityLogEntryBase & {
      type: 'action';
      /** "NA", an object's UUID (matches an object id elsewhere in the sim), or an agent id. */
      target: string | null;
    })
  | (ActivityLogEntryBase & {
      type: 'speech';
      /** The addressed agent's id, or null for an undirected/ambient line. */
      target: string | null;
      /** True only when the line was audible beyond the speaker's own room. Omitted (not false) when not audible. */
      audible?: boolean;
    })
  | (ActivityLogEntryBase & {
      type: 'log';
      /** System/diagnostic note, e.g. a blocked or aborted action. Always "NA" in samples seen. */
      target: string | null;
    })
  | (ActivityLogEntryBase & {
      type: 'coercive';
      /** id of the target agent being coerced (e.g. a prisoner id in SPE). */
      target: string;
    })
  | (ActivityLogEntryBase & {
      type: 'coercion_refused';
      /** id of the agent who refused the coercive order. */
      target: string;
    });

// ---------------------------------------------------------------------------
// resume — everything needed to reconstruct the live sim state; also what a
// "resume this run" flow would read.
// ---------------------------------------------------------------------------

export interface ResumeBlock {
  tick: number;
  end_tick: number;
  start_tick: number;
  /** ticks per in-sim "step" — see sysMod/system.py's TIME_DENSITY. */
  density: number;
  /** Trailing slice of activity_log — same entry shape, not distinct data. */
  activity_log_tail: ActivityLogEntry[];
  agents: Record<string, AgentResumeState>;
}

/** One agent's serialized state — the literal output of AgentCore.resume_state(). */
export interface AgentResumeState {
  location: string;
  /** In flight (uncommitted engine change) — the agent's tile coordinate on the
   *  shared WorldGrid. Not present in any run file yet; both are set together or
   *  both absent/null. */
  world_x?: number | null;
  world_y?: number | null;

  /** 43 traits — 19 Schwartz values + 24 HEXACO facets (see readme.md "Personality
   *  coefficients"). Kept as a dict rather than 43 literal keys so this doesn't
   *  drift out of sync if the trait list changes; see readme.md for the full list. */
  psyc_profile: Record<string, number>;
  bio_profile: {
    physiological_sensitivity: number;
    fatigue_tolerance: number;
    hunger_tolerance: number;
  };
  personality_str: string | null;
  faction: string | null;
  /** Non-null only for a faction with a scenario-authored role instruction (e.g. SPE's guard/prisoner). */
  faction_instruction: string | null;
  available_actions: string[] | null;
  /** e.g. SPE prisoners see `{ "guard": "Guard" }` — deindividuation is intentional, not a bug. */
  identity_view: Record<string, string>;

  process_s: number;
  hunger: number;
  boredom: number;
  _boredom_t: number;
  _current_boredom_intent: string | null;
  optimal_sleep_hours: number;
  belief_confidence_baseline: number;
  _at_natural_break: boolean;
  sleeping: boolean;
  _sleep_ticks: number;
  _sleep_cycle_index: number;
  _cycle_tick: number;
  _was_sleeping: boolean;
  _lingering: boolean;

  plan_queue: PlanItem[];
  last_schedule: { timestep: number; activity: string }[];
  recent_intents: string[];
  agent_tag_pool: AgentTagPool;

  emotion_state: { current_emotion: string; intensity: number };
  /** 8-element Plutchik emotion vector, or null before first resolution. */
  emotion_vector: number[] | null;

  memory_log: MemoryEntry[];
  /** Raw impression accumulator per known agent (STEME embedding centroid +
   *  running importance) — NOT the human-readable social summary; that's
   *  agent_info.social_circle inside a snapshot_log entry (see AgentRunRecord). */
  agent_impressions: Record<string, { centroid: number[]; net_importance: number }>;

  /** In flight (uncommitted engine change), alongside relationship_label below —
   *  raw per-agent relationship score vectors backing resolve_relationship_label(). */
  relationship_vectors?: Record<string, number[]>;
}

export interface PlanItem {
  activity: string;
  timestep: number | null;
  importance: number;
  /** Only present on some entries (e.g. "goal_step"); a plain scheduled item has no source. */
  source?: string;
}

interface TagEntry {
  name: string;
  centroid?: number[];
  net_importance: number;
}

export interface AgentTagPool {
  emotion: TagEntry[];
  belief: TagEntry[];
  /** Legacy pool, being phased out by the in-flight relationship_vectors work
   *  (see AgentResumeState.relationship_vectors) — may be absent on newer saves. */
  social?: TagEntry[];
  by_who: TagEntry[];
}

export interface MemoryEntry {
  index: number;
  timestep: number;
  content: string;
  importance: number;
  location: string;
  by_who: string;
  /** Open tag, not a fixed enum — "reflection" | "action" | "observation" | "dream" | "goal" seen so far, more may exist. */
  type: string;
  emotion: string;
  /** Belief-cluster label this memory was tagged into; absent when nothing matched. */
  belief?: string;
  emotional_intensity: number;
  /** Agent id, "self", "NA", or null. */
  to_who: string | null;
}

// ---------------------------------------------------------------------------
// top-level "agents" — per-agent tick history (snapshot_log) + a final memory dump.
// ---------------------------------------------------------------------------

export interface AgentRunRecord {
  snapshot_log: AgentSnapshot[];
  /** Identical to resume.agents[name].memory_log in every sample checked —
   *  kept as a separate top-level copy by the engine, not distinct data. */
  final_memory_log: MemoryEntry[];
}

/** One per-tick snapshot. NOTE for the viewer's future per-agent time-series
 *  tab: agent_info.psyc_profile below DOES already vary per tick (confirmed —
 *  values drift slowly via trait_tune) despite the values only being
 *  meaningfully different by ~1e-3 to ~1e-2 tick to tick, so a psyc_profile
 *  time-series chart is buildable directly from snapshot_log today; no
 *  backend gap here. */
export interface AgentSnapshot {
  tick: number;
  location: string;
  /** snapshot() unconditionally sets this key now — always `null` in every
   *  sample we have (world position isn't populated by the sim yet), not
   *  "in flight". */
  world_position?: { x: number; y: number } | null;
  emotion: { emotion: string; intensity: number };
  /** 8-way Plutchik distribution, sums to ~1.0. */
  emotion_distribution: Record<string, number>;
  /** Perceived events this tick; usually empty. */
  situation: string[];
  memory_count: number;
  belief_clusters: { name: string; net_importance: number }[];
  recent_intents: string[];
  biological: {
    process_s: number;
    irritability: number;
    fatigue_delta: number;
    hunger: number;
    boredom: number;
    sleeping: boolean;
    lingering?: boolean;
  };
  plan_queue: { activity: string; timestep: number | null; importance: number }[];
  last_decision: {
    action: string;
    intent: string;
    room: string;
  } | null;
  agent_info: AgentInfo;
}

export interface AgentInfo {
  psyc_profile: Record<string, number>;
  phenotypes: Record<string, number>;
  summary: string;
  core_memories: { content: string; importance: number }[];
  top_beliefs: { name: string; net_importance: number }[];
  /** Human-readable per-agent relationship summary — this is what a Tab-1/Tab-2
   *  agent detail panel and the future social graph should read, not agent_impressions. */
  social_circle: Record<string, SocialCircleEntry>;
}

export interface SocialCircleEntry {
  trust_score: number;
  /** emotion label -> accumulated intensity, not a probability distribution. */
  dominant_emotion: Record<string, number>;
  /** belief label -> accumulated importance. */
  dominant_belief: Record<string, number>;
  recent_activities: string[];
  /** get_social_info() always sets this key now (nullable) — absent only in run
   *  files predating this backend change (both sample files qualify). null means
   *  "resolved, below confidence floor" and missing-key means "predates this
   *  field" — the viewer treats both identically as "unclear", so no branching
   *  needed between the two. */
  relationship_label?: string | null;
}

// ---------------------------------------------------------------------------
// environment — real room/door geometry snapshot (envr.py's export_objective_map()).
// ---------------------------------------------------------------------------

export interface EnvironmentBlock {
  name: string;
  rooms: Record<string, RoomExport>;
  doors: DoorExport[];
}

export interface RoomExport {
  type: 'Room';
  name: string;
  agents_present: string[];
  objects: string[];
  connected_to: string[];
  /** Absent only if house.grid had no matching room (Room.export(grid)'s own
   *  guard) — doesn't happen for a room the scenario actually declared. */
  geometry?: { x: number; y: number; width: number; height: number };
  /** Full per-object detail — present alongside geometry (same grid-gated
   *  addition), absent on a run recorded before this field existed. `objects`
   *  above (plain name list) is untouched and still the thing to read for
   *  anything that existed before this — this is strictly additive. */
  object_details?: ObjectExport[];
}

/** Room.export(grid)'s per-object entry: `{...obj.get_status(), kind,
 *  description, world_position}`. get_status() varies by object type — every
 *  type has `name`/`state`, everything past that is optional here because
 *  it's genuinely absent for objects of a different kind, not because it can
 *  fail to load. `kind` is the Python class name (e.g.
 *  "CookingApplianceObject"), finer-grained than `type` below (several
 *  classes collapse to the same type string, e.g. every *Container-shaped
 *  class is "container" — not enough to distinguish an oven from a plain
 *  cupboard). `description` is describe()'s natural-language string, not
 *  otherwise exposed as structured data anywhere else in a run file. */
export interface ObjectExport {
  name: string;
  state: string;
  kind: string;
  description: string;
  /** Null for anything currently inside a closed container — those have no
   *  tile of their own (spatialKit.py's own docstring on why). */
  world_position: { x: number; y: number } | null;
  /** The scenario-JSON type string this object was declared with (e.g.
   *  "container", "food", "device") — coarser than `kind` above. */
  type?: string;
  holder?: string | null;
  open?: boolean;
  capacity?: number | null;
  contents?: string[];
  freshness?: string;
  cooked?: boolean;
  charge?: string;
  pairs_with?: string | null;
  level?: number;
  peak?: number;
  uses?: number;
  maximum?: number | null;
  unit?: string;
}

export interface DoorExport {
  name: string;
  rooms: [string, string];
  state: 'locked' | 'closed' | 'open' | string;
  /** Door's resolved grid cell (grid.doors_at[door.name]) — absent only if
   *  one of its two rooms never made it onto the grid. */
  world_position?: { x: number; y: number };
  /** Which wall this door opens through — "vertical" for a left/right wall
   *  (rooms side by side), "horizontal" for top/bottom (rooms stacked).
   *  Present exactly when world_position is. */
  axis?: 'vertical' | 'horizontal';
}
