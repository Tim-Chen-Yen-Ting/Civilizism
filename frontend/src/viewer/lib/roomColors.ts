/**
 * Room-type fill color, inferred from the room's name (there's no explicit
 * type field on a room — scenario JSON just names rooms freely). Keyword
 * match, case-insensitive, first match wins; anything unmatched (hallway,
 * office, ...) falls back to a neutral tone close to the map's own
 * background rather than being left unstyled.
 */
const ROOM_TYPE_COLORS: [RegExp, string][] = [
  [/bedroom/, '#c2ab84'], // beige
  [/bathroom/, '#e4e1d8'], // white
  [/kitchen/, '#5e7a63'], // sage green
  [/living/, '#6b4530'], // wooden brown
];

const DEFAULT_ROOM_COLOR = '#232838'; // neutral fallback — hallway, office, anything untyped

export function roomFillColor(roomName: string): string {
  const lower = roomName.toLowerCase();
  for (const [pattern, color] of ROOM_TYPE_COLORS) {
    if (pattern.test(lower)) return color;
  }
  return DEFAULT_ROOM_COLOR;
}
