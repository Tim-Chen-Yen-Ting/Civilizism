import styles from './DoorToken.module.css';

interface DoorTokenProps {
  x: number;
  y: number;
  state: string;
  /** Which wall this door opens through — absent on a run recorded before
   *  this field existed, or a door whose axis couldn't be resolved; falls
   *  back to a plain dot rather than guessing an orientation. */
  axis?: 'vertical' | 'horizontal';
  /** Which way the open/closed leaf's swinging end should rotate so it moves
   *  into the room's own interior — see roomLayout.ts's computeSwingSign for
   *  why this can't be a fixed sign per axis. Falls back to a fixed guess
   *  (+1) when unavailable (older run, room rect missing) rather than not
   *  rendering the leaf at all. */
  swingSign?: 1 | -1;
}

/**
 * A door renders as a leaf spanning the wall it opens through — the only
 * state that actually blocks passage is "locked" (Door.is_passable() in
 * envr.py is literally `state != "locked"`; "open" and "closed" behave
 * identically), so that's the only visual distinction that matters.
 *
 * Locked draws one flat, unrotated bar exactly where the wall's own segment
 * sits, in the locked color — the wall is genuinely "overwritten" by the
 * door there, reading as a solid barrier.
 *
 * Anything else draws two things: a same-sized, same-position flat bar in
 * the map's own background color, painted over that wall segment to erase
 * it (RoomBox's border is a continuous rect outline with no way to carve a
 * literal gap into one edge via CSS border alone, so this patches over it
 * instead — same visual result, a punched-through doorway), and the leaf
 * itself, pivoted open per swingSign, on top of that gap.
 *
 * Mirrors the builder's DoorMarker for sizing, read-only here (no drag/
 * click — this is a replay). 40 is roomLayout.ts's TILE_PX; not shared as a
 * constant with the builder's GRID_SIZE — see that file's own doc comment
 * on why.
 */
const DOOR_LENGTH = 40 * 1.5;
const DOOR_THICKNESS = 6;
const DOT_DIAMETER = 12;
const OPEN_ANGLE_DEG = 60;

export function DoorToken({ x, y, state, axis, swingSign }: DoorTokenProps) {
  const locked = state === 'locked';

  if (!axis) {
    return (
      <div
        className={[styles.dot, locked ? styles.locked : styles.unlocked].join(' ')}
        style={{ left: x - DOT_DIAMETER / 2, top: y - DOT_DIAMETER / 2, width: DOT_DIAMETER, height: DOT_DIAMETER }}
        title={`door (${state})`}
      />
    );
  }

  // The flat bar spans the doorway exactly like the wall segment it sits
  // on; pivoting it open rotates around one end of that box rather than
  // its center, so the sweep reads as a hinge.
  const flatDims =
    axis === 'horizontal'
      ? { left: x - DOOR_LENGTH / 2, top: y - DOOR_THICKNESS / 2, width: DOOR_LENGTH, height: DOOR_THICKNESS }
      : { left: x - DOOR_THICKNESS / 2, top: y - DOOR_LENGTH / 2, width: DOOR_THICKNESS, height: DOOR_LENGTH };
  const transformOrigin = axis === 'horizontal' ? 'left center' : 'top center';

  if (locked) {
    return <div className={styles.wallPatch} style={flatDims} title={`door (${state})`} />;
  }

  return (
    <>
      <div className={styles.gapPatch} style={flatDims} aria-hidden="true" />
      <div
        className={styles.leaf}
        style={{ ...flatDims, transformOrigin, transform: `rotate(${(swingSign ?? 1) * OPEN_ANGLE_DEG}deg)` }}
        title={`door (${state})`}
      />
    </>
  );
}
