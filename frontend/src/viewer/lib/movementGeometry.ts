export interface Point {
  x: number;
  y: number;
}

/** Shortest distance from point p to the segment [a,b]. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(p.x - cx, p.y - cy);
}

/** Shortest distance from point p to a polyline of 2+ points. */
export function distanceToPolyline(p: Point, points: Point[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distanceToSegment(p, points[i], points[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Maps a real walked tile-path (ActivityLogEntry.path, see types/run.ts)
 * onto a schematic from/to pair via a similarity transform (translate +
 * rotate + uniform-scale) fixed by the two endpoint correspondences:
 * path[0] -> from, path[last] -> to. The run's room layout is schematic —
 * there is no exported room geometry (see roomLayout.ts) — so the path's
 * raw tile coordinates have no direct correspondence to layer-space
 * pixels; this preserves the path's real shape (turns, doubling back)
 * while anchoring it to the two schematic points the map already knows
 * are correct. Falls back to the plain 2-point segment when the path's
 * own start and end tile coincide (a degenerate/zero-length transform).
 */
export function mapPathToWaypoints(path: Point[], from: Point, to: Point): Point[] {
  if (path.length < 2) return [from, to];
  const p0 = path[0];
  const pN = path[path.length - 1];
  const srcDx = pN.x - p0.x;
  const srcDy = pN.y - p0.y;
  const srcLenSq = srcDx * srcDx + srcDy * srcDy;
  if (srcLenSq < 1e-9) return [from, to];

  const dstDx = to.x - from.x;
  const dstDy = to.y - from.y;
  // Complex division dst / src — the unique scale+rotation that carries the
  // path's own start->end vector onto the schematic from->to vector.
  const kRe = (dstDx * srcDx + dstDy * srcDy) / srcLenSq;
  const kIm = (dstDy * srcDx - dstDx * srcDy) / srcLenSq;

  return path.map((point) => {
    const rx = point.x - p0.x;
    const ry = point.y - p0.y;
    return {
      x: from.x + (rx * kRe - ry * kIm),
      y: from.y + (rx * kIm + ry * kRe),
    };
  });
}
