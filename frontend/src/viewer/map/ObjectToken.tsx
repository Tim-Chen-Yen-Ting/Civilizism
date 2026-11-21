import { objectIcon, objectVisualState } from '../lib/objectVisuals';
import styles from './ObjectToken.module.css';

interface ObjectTokenProps {
  x: number;
  y: number;
  name: string;
  kind: string;
  state: string;
}

/** One object's icon on the map — purely presentational, like DoorToken.
 *  MapCanvas's viewport takes pointer capture for panning on every
 *  pointerdown, which suppresses native click/dblclick synthesis on inner
 *  elements (see AgentToken/hitTestAgent's own doc comments for the same
 *  constraint) — so double-click detection lives in MapCanvas's manual
 *  hitTestObject/handleObjectTap, not here. Objects with no resolved tile
 *  (anything currently inside a closed container) are filtered out by the
 *  caller before this ever renders. */
export function ObjectToken({ x, y, name, kind, state }: ObjectTokenProps) {
  return (
    <div
      className={[styles.token, styles[objectVisualState(state)]].join(' ')}
      style={{ left: x, top: y }}
      title={`${name} (${state})`}
      aria-label={`${name}, ${state}`}
    >
      {objectIcon(kind)}
    </div>
  );
}
