import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { snapshotAtOrBefore } from '../lib/runIndex';
import { currentIntent, intentEmoji } from '../lib/intentEmoji';
import { getAgentColor, agentInitials } from '../lib/agentColor';
import { layoutBounds, positionsWithinRoom, type RoomRect, type ObjectMarkerData } from '../lib/roomLayout';
import { distanceToPolyline, mapPathToWaypoints, type Point } from '../lib/movementGeometry';
import { RoomBox } from './RoomBox';
import { AgentToken } from './AgentToken';
import { DoorToken } from './DoorToken';
import { ObjectToken } from './ObjectToken';
import { ZoomControls } from './ZoomControls';
import { ObjectDetailPanel } from '../panel/ObjectDetailPanel';
import type { ObjectExport } from '../../types/run';
import styles from './MapCanvas.module.css';

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;
const VIEW_PADDING = 60;
/** Pointer must move less than this between down and up for a release to be
 *  treated as a tap/click rather than a canvas pan-drag. */
const CLICK_DRAG_THRESHOLD_PX = 6;
/** World-space (layer-pixel) tolerance for "did this pointer land on this
 *  agent" — tested against the agent's whole waypoint polyline, not its
 *  instantaneous on-screen position (see handlePointerUp). */
const TOKEN_HIT_RADIUS = 26;
/** Smaller than TOKEN_HIT_RADIUS — object markers are an 18px icon, not a
 *  44px agent token, and objects in the same room sit close together. */
const OBJECT_HIT_RADIUS = 14;
const DOUBLE_CLICK_WINDOW_MS = 250;

interface ViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Pan/zoom viewport rendering every RoomBox + the current tick's AgentTokens. Reads currentTick off PlaybackContext so nothing else re-renders on a scrub. */
export function MapCanvas() {
  const { index, roomLayout, doorPositions, objectPositions, agentIds, runKey } = useRunData();
  const { currentTick, selectedAgentId, setSelectedAgentId, openPanel } = usePlayback();
  const [detailObject, setDetailObject] = useState<ObjectExport | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const [view, setView] = useState<ViewState>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const fitToContent = useCallback((): ViewState => {
    const bounds = layoutBounds(roomLayout);
    const vp = viewportRef.current?.getBoundingClientRect();
    const vw = vp?.width ?? 800;
    const vh = vp?.height ?? 500;
    if (bounds.width === 0 || bounds.height === 0) return { scale: 1, offsetX: vw / 2, offsetY: vh / 2 };

    const scale = Math.min(1, Math.min((vw - VIEW_PADDING) / bounds.width, (vh - VIEW_PADDING) / bounds.height));
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    return {
      scale: clampedScale,
      offsetX: (vw - bounds.width * clampedScale) / 2,
      offsetY: (vh - bounds.height * clampedScale) / 2,
    };
  }, [roomLayout]);

  // Reset the camera whenever a genuinely new file loads — keyed on runKey
  // (stable across a live run's own 2s polling), NOT roomLayout. roomLayout
  // gets a brand-new object reference on every single poll (fresh fetch +
  // JSON.parse each time, even though the layout it describes is almost
  // always unchanged), so depending on it here reset the user's zoom/pan
  // back to fit-to-content every ~2s during a live run — looked like zoom
  // and drag "snapping back" seconds after being set, since that's exactly
  // what was happening.
  useEffect(() => {
    setView(fitToContent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const centerOnRect = useCallback((rect: RoomRect, scale: number) => {
    const vp = viewportRef.current?.getBoundingClientRect();
    const vw = vp?.width ?? 800;
    const vh = vp?.height ?? 500;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    setView({ scale, offsetX: vw / 2 - cx * scale, offsetY: vh / 2 - cy * scale });
  }, []);

  // React's synthetic onWheel is registered passive, so event.preventDefault()
  // inside it silently no-ops (and logs "Unable to preventDefault inside
  // passive event listener invocation") — the page scrolls along with the
  // zoom. A native listener with { passive: false } is the only way to
  // actually block page scroll while zooming the canvas.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const vp = el!.getBoundingClientRect();
      const pointerX = event.clientX - vp.left;
      const pointerY = event.clientY - vp.top;

      setView((prev) => {
        const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        // Keep the world point under the cursor fixed on screen while zooming.
        const worldX = (pointerX - prev.offsetX) / prev.scale;
        const worldY = (pointerY - prev.offsetY) / prev.scale;
        return {
          scale: nextScale,
          offsetX: pointerX - worldX * nextScale,
          offsetY: pointerY - worldY * nextScale,
        };
      });
    }

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragState.current = { startX: event.clientX, startY: event.clientY, startOffsetX: view.offsetX, startOffsetY: view.offsetY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag) return;
    setView((prev) => ({
      ...prev,
      offsetX: drag.startOffsetX + (event.clientX - drag.startX),
      offsetY: drag.startOffsetY + (event.clientY - drag.startY),
    }));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    dragState.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!drag) return;
    const movedDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (movedDistance >= CLICK_DRAG_THRESHOLD_PX) return; // a real pan, not a tap
    const agentId = hitTestAgent(event.clientX, event.clientY);
    if (agentId) {
      handleTokenTap(agentId);
      return;
    }
    const object = hitTestObject(event.clientX, event.clientY);
    if (object) handleObjectTap(object);
  }

  /**
   * Finds which agent (if any) a screen point landed on, testing against
   * each token's whole waypoint polyline (in world/layer space) rather than
   * its instantaneous DOM position. A token mid-CSS-transition (its room
   * changed on the most recently-scrubbed tick) or one whose position just
   * snapped from this same click's own camera recenter both fail a native
   * per-element hit-test for a double-click's second physical click, which
   * always lands at the same fixed screen point as the first — this doesn't,
   * since the polyline covers everywhere the token visually swept.
   */
  function hitTestAgent(clientX: number, clientY: number): string | null {
    const vp = viewportRef.current?.getBoundingClientRect();
    if (!vp) return null;
    const worldPoint: Point = {
      x: (clientX - vp.left - view.offsetX) / view.scale,
      y: (clientY - vp.top - view.offsetY) / view.scale,
    };
    let bestId: string | null = null;
    let bestDist = TOKEN_HIT_RADIUS;
    for (const t of tokens) {
      const d = distanceToPolyline(worldPoint, t.waypoints);
      if (d <= bestDist) {
        bestDist = d;
        bestId = t.agentId;
      }
    }
    return bestId;
  }

  /** Same reasoning as hitTestAgent's own doc comment (native per-element
   *  click detection doesn't work once the viewport's pointerdown has taken
   *  pointer capture for panning — see handlePointerDown) but simpler:
   *  objects don't move within a tick, so a plain point-radius test against
   *  each marker's fixed position is enough, no polyline needed. */
  function hitTestObject(clientX: number, clientY: number): ObjectMarkerData | null {
    const vp = viewportRef.current?.getBoundingClientRect();
    if (!vp) return null;
    const worldPoint: Point = {
      x: (clientX - vp.left - view.offsetX) / view.scale,
      y: (clientY - vp.top - view.offsetY) / view.scale,
    };
    let best: ObjectMarkerData | null = null;
    let bestDist = OBJECT_HIT_RADIUS;
    for (const marker of objectPositions) {
      const d = Math.hypot(worldPoint.x - marker.x, worldPoint.y - marker.y);
      if (d <= bestDist) {
        bestDist = d;
        best = marker;
      }
    }
    return best;
  }

  // Click/double-click disambiguation, keyed per agent (not per screen
  // point) — two taps on the SAME agent within the window are a double
  // click; a tap on a different agent right after starts its own new timer.
  // Deferring the single-click side effect (camera recenter) until the
  // window elapses is what keeps that recenter from being able to race a
  // second physical click in the first place.
  const clickTimerRef = useRef<number | null>(null);
  const pendingTapAgentRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    },
    [],
  );

  function handleTokenTap(agentId: string) {
    if (clickTimerRef.current !== null && pendingTapAgentRef.current === agentId) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      pendingTapAgentRef.current = null;
      handleSelectAgent(agentId);
      openPanel(agentId);
      return;
    }
    if (clickTimerRef.current !== null) window.clearTimeout(clickTimerRef.current);
    pendingTapAgentRef.current = agentId;
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      pendingTapAgentRef.current = null;
      handleSelectAgent(agentId);
    }, DOUBLE_CLICK_WINDOW_MS);
  }

  // Same double-click disambiguation as handleTokenTap, keyed per object
  // instead of per agent — but a single tap on an object has no side effect
  // of its own (no selection/recenter concept for objects), so the pending
  // timeout here just expires silently instead of firing anything.
  const objectClickTimerRef = useRef<number | null>(null);
  const pendingTapObjectRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectClickTimerRef.current !== null) window.clearTimeout(objectClickTimerRef.current);
    },
    [],
  );

  function handleObjectTap(marker: ObjectMarkerData) {
    const key = `${marker.roomName}:${marker.object.name}`;
    if (objectClickTimerRef.current !== null && pendingTapObjectRef.current === key) {
      window.clearTimeout(objectClickTimerRef.current);
      objectClickTimerRef.current = null;
      pendingTapObjectRef.current = null;
      setDetailObject(marker.object);
      return;
    }
    if (objectClickTimerRef.current !== null) window.clearTimeout(objectClickTimerRef.current);
    pendingTapObjectRef.current = key;
    objectClickTimerRef.current = window.setTimeout(() => {
      objectClickTimerRef.current = null;
      pendingTapObjectRef.current = null;
    }, DOUBLE_CLICK_WINDOW_MS);
  }

  function zoomBy(factor: number) {
    setView((prev) => {
      const vp = viewportRef.current?.getBoundingClientRect();
      const vw = vp?.width ?? 800;
      const vh = vp?.height ?? 500;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const worldX = (vw / 2 - prev.offsetX) / prev.scale;
      const worldY = (vh / 2 - prev.offsetY) / prev.scale;
      return { scale: nextScale, offsetX: vw / 2 - worldX * nextScale, offsetY: vh / 2 - worldY * nextScale };
    });
  }

  function handleSelectAgent(agentId: string) {
    setSelectedAgentId(agentId);
    const snap = snapshotAtOrBefore(index, agentId, currentTick);
    const rect = snap ? roomLayout[snap.location] : undefined;
    if (rect) centerOnRect(rect, Math.max(view.scale, 1));
  }

  const occupantsByRoom = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const agentId of agentIds) {
      const snap = snapshotAtOrBefore(index, agentId, currentTick);
      if (!snap) continue;
      (map[snap.location] ??= []).push(agentId);
    }
    return map;
  }, [agentIds, index, currentTick]);

  // Last-rendered position per agent, read as this tick's tween "from" and
  // overwritten with this tick's "to" at the end of the memo below — mirrors
  // exactly what the CSS transition itself eases from/to, so hit-testing
  // (which reads the same waypoints) always matches what's on screen.
  const prevPosRef = useRef<Map<string, Point>>(new Map());

  const tokens = useMemo(() => {
    const result: { agentId: string; waypoints: Point[]; intent: string | null }[] = [];
    for (const [room, occupants] of Object.entries(occupantsByRoom)) {
      const rect = roomLayout[room];
      if (!rect) continue;
      const positions = positionsWithinRoom(occupants, rect);
      for (const agentId of occupants) {
        const pos = positions[agentId];
        const snap = snapshotAtOrBefore(index, agentId, currentTick);
        const from = prevPosRef.current.get(agentId) ?? pos;

        let waypoints: Point[] = [from, pos];
        const activity = snap ? index.agentActivityByTick.get(`${agentId}:${snap.tick}`) : undefined;
        const movement = activity?.find((e) => e.type === 'movement' && e.path && e.path.length >= 2);
        if (movement?.type === 'movement' && movement.path) {
          waypoints = mapPathToWaypoints(movement.path, from, pos);
        }

        result.push({ agentId, waypoints, intent: currentIntent(snap) });
      }
    }
    for (const t of result) prevPosRef.current.set(t.agentId, t.waypoints[t.waypoints.length - 1]);
    return result;
  }, [occupantsByRoom, roomLayout, index, currentTick]);

  return (
    <div
      ref={viewportRef}
      className={[styles.viewport, isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <ZoomControls scale={view.scale} onZoomIn={() => zoomBy(1.25)} onZoomOut={() => zoomBy(1 / 1.25)} onReset={() => setView(fitToContent())} />
      <div className={styles.layer} style={{ transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})` }}>
        {Object.entries(roomLayout).map(([name, rect]) => (
          <RoomBox key={name} name={name} rect={rect} />
        ))}
        {Object.entries(doorPositions).map(([name, door]) => (
          <DoorToken key={name} x={door.x} y={door.y} state={door.state} axis={door.axis} swingSign={door.swingSign} />
        ))}
        {objectPositions.map((marker) => (
          <ObjectToken
            key={`${marker.roomName}:${marker.object.name}`}
            x={marker.x}
            y={marker.y}
            name={marker.object.name}
            kind={marker.object.kind}
            state={marker.object.state}
          />
        ))}
        {tokens.map((t) => (
          <AgentToken
            key={t.agentId}
            agentId={t.agentId}
            waypoints={t.waypoints}
            color={getAgentColor(t.agentId, agentIds)}
            initials={agentInitials(t.agentId)}
            intentEmoji={intentEmoji(t.intent)}
            selected={selectedAgentId === t.agentId}
          />
        ))}
      </div>
      {detailObject && <ObjectDetailPanel object={detailObject} onClose={() => setDetailObject(null)} />}
    </div>
  );
}
