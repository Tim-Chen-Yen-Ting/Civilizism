/**
 * Binary search over an ascending-sorted array of ticks. Shared by the
 * playback scrubber (nearest known tick to a slider position) and the
 * speech log (how many entries fall at-or-before the current tick) — both
 * need "largest index whose value <= target", not just an exact match,
 * because tick coverage is sparse and non-contiguous (see RunIndex.ticks).
 */

/** Index of the last element <= target, or -1 if every element is greater. */
export function floorIndex(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/** Same as floorIndex, but over an array of tick-bearing objects (e.g.
 *  ActivityLogEntry[] sorted by timestep) via an accessor, so callers don't
 *  need to build an intermediate mapped number[] just to search it. */
export function floorIndexBy<T>(sorted: readonly T[], target: number, getTick: (item: T) => number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (getTick(sorted[mid]) <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}
