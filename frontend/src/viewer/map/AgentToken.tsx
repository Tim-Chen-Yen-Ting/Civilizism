import { useLayoutEffect, useRef } from 'react';
import type { Point } from '../lib/movementGeometry';
import styles from './AgentToken.module.css';

interface AgentTokenProps {
  agentId: string;
  /** [from, to] for a plain single-hop move (or a stationary token, where
   *  both points coincide) — the common case, left entirely to the CSS
   *  transition below. 3+ points when a real walked path (ActivityLogEntry
   *  .path, see types/run.ts) was available for this tick's move, already
   *  mapped onto this from/to pair by MapCanvas (lib/movementGeometry.ts). */
  waypoints: Point[];
  color: string;
  initials: string;
  intentEmoji: string | null;
  selected: boolean;
}

const PATH_ANIMATION_DURATION_MS = 400;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * One agent circle + intent thought bubble. Purely presentational — click
 * and double-click detection do not live here. MapCanvas hit-tests pointer
 * events against every token's own waypoint polyline instead of relying on
 * the browser's native per-element hit-test, which silently misses a token
 * that's mid-transition (its room changed on the most recently-scrubbed
 * tick, or a real double-click's own camera-recenter side effect moved it)
 * by the time a double-click's second physical click arrives at the same
 * screen point.
 */
export function AgentToken({ agentId, waypoints, color, initials, intentEmoji, selected }: AgentTokenProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const target = waypoints[waypoints.length - 1];
  const isPathAnimated = waypoints.length > 2;
  const initial = isPathAnimated ? waypoints[0] : target;

  // A plain 2-point move (including "didn't move") is left entirely to the
  // CSS transition in AgentToken.module.css — cheapest path, no JS per tick.
  // A 3+ point real walked path needs more than the two keyframes a CSS
  // transition can interpolate between, so it's manually driven with rAF
  // instead, writing the transform directly to bypass a React re-render
  // every frame. useLayoutEffect (not useEffect) so the transition-disable
  // and the first animated frame land before the browser paints — otherwise
  // the CSS rule would ease the initial "jump to waypoints[0]" render too.
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || waypoints.length <= 2) return;

    const segLengths: number[] = [];
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
      segLengths.push(d);
      total += d;
    }
    if (total === 0) return;

    function positionAt(t: number): Point {
      let remaining = t * total;
      for (let i = 0; i < segLengths.length; i++) {
        if (remaining <= segLengths[i] || i === segLengths.length - 1) {
          const segT = segLengths[i] === 0 ? 0 : remaining / segLengths[i];
          const a = waypoints[i];
          const b = waypoints[i + 1];
          return { x: a.x + (b.x - a.x) * segT, y: a.y + (b.y - a.y) * segT };
        }
        remaining -= segLengths[i];
      }
      return waypoints[waypoints.length - 1];
    }

    el.style.transitionDuration = '0ms';
    const start = performance.now();
    let raf = 0;

    function frame(now: number) {
      const t = Math.min(1, (now - start) / PATH_ANIMATION_DURATION_MS);
      const p = positionAt(easeInOutQuad(t));
      el!.style.transform = `translate(${p.x}px, ${p.y}px)`;
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        el!.style.transitionDuration = '';
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      el.style.transitionDuration = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, waypoints]);

  return (
    <div
      ref={elRef}
      className={[styles.wrap, selected ? styles.selected : ''].filter(Boolean).join(' ')}
      style={{ transform: `translate(${initial.x}px, ${initial.y}px)` }}
      role="button"
      aria-label={agentId}
    >
      {intentEmoji && <div className={styles.bubble}>{intentEmoji}</div>}
      <div className={styles.token} style={{ background: color }}>
        {initials}
      </div>
      <div className={styles.name}>{agentId}</div>
    </div>
  );
}
