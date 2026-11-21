import type { EnvironmentBlock, ObjectExport } from '../../types/run';

/**
 * Schematic room layout, used when a run has no `environment` block (every
 * run recorded before backend Round 9/10, and any run's rooms that lack
 * `geometry`). When `run.environment` is present, computeRoomLayoutFromGeometry
 * below places rooms from their real tile rects instead — see RunDataContext.
 */
export interface RoomRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CELL_W = 260;
const CELL_H = 180;
const GUTTER = 40;

/** px per backend tile for the real-geometry path — independent of the
 *  builder's own GRID_SIZE (canvas authoring px/tile); coordinates.ts's own
 *  doc comment says those two were never meant to match. */
const TILE_PX = 40;

/** Deterministic on room name order (first-appearance order from RunIndex.roomNames) — stable across reloads of the same file, not across files with different room sets. */
export function computeRoomLayout(roomNames: string[]): Record<string, RoomRect> {
  const layout: Record<string, RoomRect> = {};
  if (roomNames.length === 0) return layout;

  const cols = Math.ceil(Math.sqrt(roomNames.length));
  roomNames.forEach((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    layout[name] = {
      x: col * (CELL_W + GUTTER),
      y: row * (CELL_H + GUTTER),
      w: CELL_W,
      h: CELL_H,
    };
  });
  return layout;
}

/** Real floor-plan layout from run.environment (present on every run
 *  recorded after backend Round 9+10 — see this file's own doc comment).
 *  All-or-nothing: any room missing `geometry` fails the whole thing back to
 *  null rather than mixing tile-space and schematic-space rects, which would
 *  overlap unpredictably. */
export function computeRoomLayoutFromGeometry(rooms: EnvironmentBlock['rooms']): Record<string, RoomRect> | null {
  const layout: Record<string, RoomRect> = {};
  for (const [name, room] of Object.entries(rooms)) {
    if (!room.geometry) return null;
    layout[name] = { x: room.geometry.x * TILE_PX, y: room.geometry.y * TILE_PX, w: room.geometry.width * TILE_PX, h: room.geometry.height * TILE_PX };
  }
  return Object.keys(layout).length > 0 ? layout : null;
}

export interface DoorMarkerData {
  x: number;
  y: number;
  state: string;
  /** "vertical" | "horizontal" | undefined — a run predating this field (or
   *  a door whose axis couldn't be resolved) falls back to DoorToken's own
   *  default rendering rather than being dropped. */
  axis?: 'vertical' | 'horizontal';
  /** Which way an open/closed (not locked) leaf should pivot so its swinging
   *  end moves into rooms[0]'s own interior rather than out through the wall
   *  or into whatever's on the other side. A single fixed rotation sign for
   *  every door (the original approach) swings correctly for doors on one
   *  side of a room and backwards for doors on the opposite side — this is
   *  what read as "near random" orientation once rooms weren't laid out on a
   *  uniform grid. 1 | -1, undefined when rooms[0]'s rect isn't available
   *  (DoorToken then falls back to a fixed sign). */
  swingSign?: 1 | -1;
}

/** Which wall of `room` a door tile sits on, the CSS rotate() sign that
 *  swings that leaf's far end toward `room`'s own interior rather than out
 *  through the wall (see DoorMarkerData.swingSign's own doc comment for why
 *  this can't be a fixed constant), and the cross-axis pixel coordinate the
 *  door marker should actually sit at.
 *
 *  That last part matters because a "wall tile" and the room's rendered
 *  border are two different things: the wall tile is `_carve_room_walls`'s
 *  outermost ring of the room's own tile grid, a full TILE_PX-wide band, and
 *  door.world_position is that tile's index — but RoomBox draws its border
 *  as a thin line exactly at the room's edge coordinate, not across that
 *  whole band. Centering the marker on the wall tile (the position this
 *  function used to just pass through) puts it TILE_PX/2 px inside the
 *  room from where the border line actually is — a visible, systematic
 *  "door floating away from the wall" offset once the wall got thick enough
 *  (and the room got colored enough) to make the mismatch obvious. Snapping
 *  the cross-axis coordinate to the room's own edge here instead fixes that;
 *  the along-the-wall coordinate (unaffected by this mismatch) is untouched.
 *  Compares in the same TILE_PX pixel space `room` (a
 *  computeRoomLayoutFromGeometry rect) is already in; `doorTileX`/
 *  `doorTileY` are raw tile coordinates (door.world_position), scaled here
 *  to match. */
function doorWallGeometry(axis: 'vertical' | 'horizontal', doorTileX: number, doorTileY: number, room: RoomRect): { crossPx: number; swingSign: 1 | -1 } {
  if (axis === 'horizontal') {
    const distToTop = Math.abs(doorTileY * TILE_PX - room.y);
    const distToBottom = Math.abs(doorTileY * TILE_PX - (room.y + room.h - TILE_PX));
    const onTop = distToTop <= distToBottom;
    return { crossPx: onTop ? room.y : room.y + room.h, swingSign: onTop ? 1 : -1 };
  }
  const distToLeft = Math.abs(doorTileX * TILE_PX - room.x);
  const distToRight = Math.abs(doorTileX * TILE_PX - (room.x + room.w - TILE_PX));
  const onLeft = distToLeft <= distToRight;
  return { crossPx: onLeft ? room.x : room.x + room.w, swingSign: onLeft ? -1 : 1 };
}

/** Door pixel centers from run.environment.doors, in the same TILE_PX space
 *  as computeRoomLayoutFromGeometry's rects (`roomLayout`, that same
 *  function's output — required to compute each door's swing direction, see
 *  computeSwingSign). Callers must only use this alongside that function's
 *  output, never the schematic computeRoomLayout grid-pack — mixing the two
 *  spaces scatters markers with no relation to any room. RunDataContext
 *  enforces this by gating on the room-geometry layout actually succeeding,
 *  not merely on `environment` being present. */
export function computeDoorPositions(doors: EnvironmentBlock['doors'], roomLayout: Record<string, RoomRect>): Record<string, DoorMarkerData> {
  const positions: Record<string, DoorMarkerData> = {};
  for (const door of doors) {
    if (!door.world_position) continue;
    const roomA = roomLayout[door.rooms[0]];
    const alongPx =
      door.axis === 'horizontal' ? (door.world_position.x + 0.5) * TILE_PX : (door.world_position.y + 0.5) * TILE_PX;
    const geometry = door.axis && roomA ? doorWallGeometry(door.axis, door.world_position.x, door.world_position.y, roomA) : null;
    const x = geometry ? (door.axis === 'horizontal' ? alongPx : geometry.crossPx) : (door.world_position.x + 0.5) * TILE_PX;
    const y = geometry ? (door.axis === 'horizontal' ? geometry.crossPx : alongPx) : (door.world_position.y + 0.5) * TILE_PX;
    positions[door.name] = {
      x,
      y,
      state: door.state,
      axis: door.axis,
      swingSign: geometry?.swingSign,
    };
  }
  return positions;
}

export interface ObjectMarkerData {
  x: number;
  y: number;
  roomName: string;
  object: ObjectExport;
}

/** Object marker pixel centers from every room's object_details, in the
 *  same TILE_PX space computeRoomLayoutFromGeometry's rects use — no room
 *  rect needed here unlike doors, since world_position is already an
 *  absolute grid coordinate (find_object's return, not room-relative).
 *  Objects with no resolved tile (anything currently inside a closed
 *  container — object_details entries carry `world_position: null` for
 *  those, see ObjectExport's own doc comment) are skipped, not rendered
 *  at some fallback position. Same gating as computeDoorPositions: only
 *  meaningful alongside the real-geometry roomLayout, never the schematic
 *  grid-pack. */
export function computeObjectPositions(rooms: EnvironmentBlock['rooms']): ObjectMarkerData[] {
  const markers: ObjectMarkerData[] = [];
  for (const [roomName, room] of Object.entries(rooms)) {
    for (const object of room.object_details ?? []) {
      if (!object.world_position) continue;
      markers.push({
        x: (object.world_position.x + 0.5) * TILE_PX,
        y: (object.world_position.y + 0.5) * TILE_PX,
        roomName,
        object,
      });
    }
  }
  return markers;
}

/** Overall bounding box of a computed layout, for camera reset/fit. */
export function layoutBounds(layout: Record<string, RoomRect>): { width: number; height: number } {
  let maxX = 0;
  let maxY = 0;
  for (const rect of Object.values(layout)) {
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return { width: maxX, height: maxY };
}

const TOKEN_DIAMETER = 44;
const ROOM_PADDING = 28;
// RoomBox draws its label in the top-left corner (see RoomBox.module.css) —
// the first token row needs more top clearance than the other three sides
// so a token doesn't sit on top of the label text.
const ROOM_PADDING_TOP = 52;

/**
 * Positions agents deterministically inside a room's rect (absolute
 * layer-space coordinates, not room-relative) so agents don't jitter
 * tick-to-tick when the room's occupant set is unchanged. Sorts by agentId
 * so callers don't need to pre-sort.
 */
export function positionsWithinRoom(agentIds: string[], rect: RoomRect): Record<string, { x: number; y: number }> {
  const sorted = [...agentIds].sort();
  const positions: Record<string, { x: number; y: number }> = {};
  if (sorted.length === 0) return positions;

  const innerW = Math.max(rect.w - ROOM_PADDING * 2 - TOKEN_DIAMETER, 1);
  const innerH = Math.max(rect.h - ROOM_PADDING_TOP - ROOM_PADDING - TOKEN_DIAMETER, 1);
  const cols = Math.ceil(Math.sqrt(sorted.length));
  const rows = Math.ceil(sorted.length / cols);

  sorted.forEach((agentId, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const fracX = cols === 1 ? 0.5 : col / (cols - 1);
    const fracY = rows === 1 ? 0.5 : row / (rows - 1);
    positions[agentId] = {
      x: rect.x + ROOM_PADDING + fracX * innerW,
      y: rect.y + ROOM_PADDING_TOP + fracY * innerH,
    };
  });
  return positions;
}

export const AGENT_TOKEN_DIAMETER = TOKEN_DIAMETER;
