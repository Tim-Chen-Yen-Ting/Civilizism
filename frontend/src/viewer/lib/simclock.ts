/**
 * Tick -> wall-clock conversion, ported 1:1 from sysMod/simclock.py.
 * Tick 0 is 00:00 of day 0 of month 0 — the same convention the agents
 * themselves experience, so this must stay in lockstep with the Python
 * source rather than drift into its own scheme.
 *
 * Shared by the viewer (tick display) and the config builder
 * (builder/state — deriving start_tick/end_tick from a "start at HH:MM, run
 * N days" authoring convenience) — extend in place rather than forking a
 * second copy in builder/lib.
 */

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_MONTH = 43200;

export function tickToMinutes(tick: number, density: number): number {
  return tick * density;
}

/** 'MM/DD HH:MM' for a tick. */
export function tickToClock(tick: number, density: number): string {
  const total = tickToMinutes(tick, density);
  const month = Math.floor(total / MINUTES_PER_MONTH);
  const day = Math.floor((total % MINUTES_PER_MONTH) / MINUTES_PER_DAY);
  const hour = Math.floor((total % MINUTES_PER_DAY) / 60);
  const minute = total % 60;
  return `${pad2(month)}/${pad2(day)} ${pad2(hour)}:${pad2(minute)}`;
}

/** 'HH:MM' for a tick. */
export function tickToHHMM(tick: number, density: number): string {
  const total = tickToMinutes(tick, density);
  const hour = Math.floor((total % MINUTES_PER_DAY) / 60);
  const minute = total % 60;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Ticks in one simulated day — 1440 // density, integer division like the
 *  Python source; a density that doesn't evenly divide 1440 truncates. */
export function ticksPerDay(density: number): number {
  return Math.floor(MINUTES_PER_DAY / density);
}

/** Absolute simulated day a tick falls on (0-indexed from tick 0), not the
 *  day-of-month tickToClock's "MM/DD" shows. */
export function tickToDay(tick: number, density: number): number {
  return Math.floor(tickToMinutes(tick, density) / MINUTES_PER_DAY);
}

/** 'HH:MM' -> offset within a day, in ticks (floor division, matching
 *  sysMod/simclock.py's `//`). */
export function tickOfDay(timeStr: string, density: number): number {
  const [hourStr, minuteStr] = timeStr.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  return Math.floor((hour * 60 + minute) / density);
}

/**
 * Mirrors sysMod/scenario.py's build_world_schedule() own resolution of a
 * {time: "HH:MM"} schedule entry into its first absolute tick >= startTick:
 * `start_tick + ((tod - start_tick) % day_ticks)`. Builder-only (the
 * schedule editor's fire-time preview) — never fed back into the engine.
 */
export function firstFireTickForTime(timeStr: string, startTick: number, density: number): number {
  const dayTicks = ticksPerDay(density);
  if (dayTicks <= 0) return startTick;
  const tod = tickOfDay(timeStr, density);
  const offset = (((tod - startTick) % dayTicks) + dayTicks) % dayTicks;
  return startTick + offset;
}
