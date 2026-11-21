/**
 * Icon-per-kind and color-per-state for the map's object markers. `kind` is
 * ObjectExport's Python class name (CookingApplianceObject, etc.) — matched
 * here, not the coarser `type` string, since several classes share one
 * `type` (every *Container-shaped class is "container") but should still
 * read as visually distinct on the map (an oven isn't a cupboard).
 */
const KIND_ICONS: Record<string, string> = {
  CookingApplianceObject: '🍳',
  ContainerObject: '📦',
  PoweredDeviceObject: '🔋',
  DeviceObject: '💡',
  FoodObject: '🍎',
  ConsumableObject: '🥤',
  KeyObject: '🔑',
  InstrumentObject: '🎚️',
  PortableObject: '◆',
  EnvObject: '◻',
};

export function objectIcon(kind: string): string {
  return KIND_ICONS[kind] ?? '◻';
}

/**
 * State strings vary by kind (idle/cooking/done, closed/full/empty,
 * off/on, fresh/old/spoiled, placed/carried, ...) with no shared enum, so
 * this is a small keyword heuristic rather than an exhaustive per-kind
 * table: something clearly "used up or gone wrong" reads as danger,
 * something clearly "actively doing something" reads as active, anything
 * else (idle, closed, placed, fresh, off, ...) is the neutral default.
 */
const DANGER_KEYWORDS = ['spoiled', 'empty', 'depleted'];
const ACTIVE_KEYWORDS = ['cooking', 'done', 'on', 'open', 'full'];

export type ObjectVisualState = 'danger' | 'active' | 'neutral';

export function objectVisualState(state: string): ObjectVisualState {
  const s = state.toLowerCase();
  if (DANGER_KEYWORDS.some((k) => s.includes(k))) return 'danger';
  if (ACTIVE_KEYWORDS.some((k) => s.includes(k))) return 'active';
  return 'neutral';
}
