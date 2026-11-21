import { useEffect, useMemo, useRef, useState } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { Simulation, SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { SocialCircleEntry } from '../../types/run';
import styles from './SocialGraph.module.css';

export interface SocialGraphProps {
  /** The agent whose panel this is — always rendered as the fixed center node. */
  egoAgentId: string;
  /** From the current-tick snapshot, not re-fetched inside this component. */
  socialCircle: Record<string, SocialCircleEntry>;
  /** Drives the node-detail card in SocialTab. */
  onSelectNode: (agentId: string) => void;
  /** Highlights the node whose detail card is currently open, if any. */
  selectedAgentId?: string | null;
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  isEgo: boolean;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  trustScore: number;
  relationshipLabel: string | null;
}

// Floors only — not a target size. The panel this graph lives in is
// ~380px wide (see SocialTab.module.css); a floor much above that just
// forces horizontal scrolling and clips nodes off the visible edge.
const MIN_WIDTH = 240;
const MIN_HEIGHT = 300;
const NODE_RADIUS_EGO = 26;
const NODE_RADIUS = 20;

// The detail card overlays the graph's bottom-right corner (see
// SocialTab.module.css) rather than sitting beside it, so the canvas never
// has to shrink to make room for it. That alone isn't enough on its own: a
// node the force sim happens to settle under that corner would be exactly
// as unreachable as one scrolled off-screen. Reserve the same corner here
// (with a margin, since the card's exact rendered height is content-
// dependent) and keep every non-ego node clamped out of it while a card is
// open.
const CARD_MARGIN = 12;
const CARD_RESERVED_WIDTH = 240 + CARD_MARGIN * 2;
const CARD_RESERVED_HEIGHT = 360 + CARD_MARGIN * 2;

/** Pushes any non-ego node inside the reserved corner out to its nearest
 *  free edge, in place. Shared by the tick handler (keeps it out on every
 *  subsequent physics step) and the selection-change effect below (an
 *  immediate correction, so a node already resting under the corner when
 *  the card opens doesn't wait out a multi-tick physics settle before it's
 *  clickable again). */
function clampOutOfReservedCorner(nodeData: GraphNode[], cardLeft: number, cardTop: number) {
  for (const n of nodeData) {
    if (n.isEgo || n.x === undefined || n.y === undefined) continue;
    const r = NODE_RADIUS;
    if (n.x + r <= cardLeft || n.y + r <= cardTop) continue;
    // Push toward whichever reserved edge is closer, rather than straight
    // to a corner — keeps the node's own link/charge forces from fighting
    // the clamp every subsequent tick.
    const pastLeft = n.x + r - cardLeft;
    const pastTop = n.y + r - cardTop;
    if (pastLeft < pastTop) n.x = cardLeft - r;
    else n.y = cardTop - r;
  }
}

export function SocialGraph({ egoAgentId, socialCircle, onSelectNode, selectedAgentId = null }: SocialGraphProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: MIN_WIDTH, height: MIN_HEIGHT });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: Math.max(MIN_WIDTH, Math.floor(entry.contentRect.width)),
        height: Math.max(MIN_HEIGHT, Math.floor(entry.contentRect.height)),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const knownIds = useMemo(() => Object.keys(socialCircle), [socialCircle]);
  const knownIdsKey = knownIds.join('|');

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // The tick handler below is set up once per simulation instance (this
  // effect's own deps don't include selectedAgentId — a selection change
  // shouldn't tear down and re-seed the whole graph), so it reads the
  // current selection through a ref rather than closing over a prop value
  // that would go stale the moment a card opens or the selection changes.
  const selectedAgentIdRef = useRef(selectedAgentId);
  useEffect(() => {
    selectedAgentIdRef.current = selectedAgentId;
  }, [selectedAgentId]);

  useEffect(() => {
    const { width, height } = size;
    const nodeData: GraphNode[] = [
      { id: egoAgentId, isEgo: true, x: width / 2, y: height / 2, fx: width / 2, fy: height / 2 },
      ...knownIds.map((id): GraphNode => {
        const prev = prevPositions.current.get(id);
        return { id, isEgo: false, x: prev?.x, y: prev?.y };
      }),
    ];
    const linkData: GraphLink[] = knownIds.map((id) => ({
      source: egoAgentId,
      target: id,
      trustScore: socialCircle[id].trust_score,
      relationshipLabel: socialCircle[id].relationship_label ?? null,
    }));

    const cardLeft = width - CARD_RESERVED_WIDTH;
    const cardTop = height - CARD_RESERVED_HEIGHT;

    const sim = forceSimulation<GraphNode>(nodeData)
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(linkData)
          .id((d) => d.id)
          .distance(140)
          .strength(0.5),
      )
      .force('charge', forceManyBody().strength(-320))
      .force('collide', forceCollide<GraphNode>((d) => (d.isEgo ? NODE_RADIUS_EGO : NODE_RADIUS) + 34))
      .force('center', forceCenter(width / 2, height / 2))
      .on('tick', () => {
        if (selectedAgentIdRef.current) clampOutOfReservedCorner(nodeData, cardLeft, cardTop);
        for (const n of nodeData) {
          if (n.x !== undefined && n.y !== undefined) {
            prevPositions.current.set(n.id, { x: n.x, y: n.y });
          }
        }
        setNodes([...nodeData]);
      });

    simRef.current = sim;
    setLinks(linkData);

    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [egoAgentId, knownIdsKey, size.width, size.height]);

  // A card opening (or the selection switching to a different agent) only
  // matters to the tick handler's clamp above, which only runs on an
  // active tick — a node already resting under the reserved corner from
  // before the card opened would otherwise stay stuck there, unclickable,
  // until something else (e.g. a drag) happens to perturb the sim. Correct
  // it immediately (synchronously, off the simulation's own live node
  // array) rather than waiting out a restart's first few ticks, then
  // restart gently so collide/link resolve any overlap the jump caused.
  useEffect(() => {
    const sim = simRef.current;
    if (!selectedAgentId || !sim) return;
    const cardLeft = size.width - CARD_RESERVED_WIDTH;
    const cardTop = size.height - CARD_RESERVED_HEIGHT;
    clampOutOfReservedCorner(sim.nodes(), cardLeft, cardTop);
    setNodes([...sim.nodes()]);
    sim.alpha(0.3).restart();
  }, [selectedAgentId, size.width, size.height]);

  function handlePointerDown(node: GraphNode, event: React.PointerEvent<SVGCircleElement>) {
    if (node.isEgo) return;
    const sim = simRef.current;
    const svg = svgRef.current;
    if (sim === null || svg === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    sim.alphaTarget(0.3).restart();
    node.fx = node.x;
    node.fy = node.y;

    function toLocalPoint(clientX: number, clientY: number) {
      const rect = svg!.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function onMove(ev: PointerEvent) {
      const { x, y } = toLocalPoint(ev.clientX, ev.clientY);
      node.fx = x;
      node.fy = y;
    }
    function onUp() {
      sim!.alphaTarget(0);
      node.fx = null;
      node.fy = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  if (knownIds.length === 0) {
    return (
      <div className={styles.scrollWrap} ref={scrollRef}>
        <p className={styles.empty}>No known relationships yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.scrollWrap} ref={scrollRef}>
      <svg ref={svgRef} className={styles.canvas} width={size.width} height={size.height}>
        <g>
          {links.map((link) => {
            const source = typeof link.source === 'object' ? link.source : nodeById.get(link.source as unknown as string);
            const target = typeof link.target === 'object' ? link.target : nodeById.get(link.target as unknown as string);
            if (!source || !target || source.x === undefined || target.x === undefined) return null;
            const midX = (source.x + target.x) / 2;
            const midY = (source.y! + target.y!) / 2;
            // Trust is a sequential magnitude (0-1) — encoded as opacity/width on one hue,
            // never as a distinct categorical color (that's relationship_label's job, via text).
            const opacity = 0.25 + link.trustScore * 0.65;
            const strokeWidth = 1.5 + link.trustScore * 3.5;
            return (
              <g key={target.id}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={styles.edge}
                  style={{ opacity, strokeWidth }}
                />
                <text x={midX} y={midY - 8} className={styles.edgeLabelTrust} textAnchor="middle">
                  {link.trustScore.toFixed(2)}
                </text>
                <text x={midX} y={midY + 16} className={styles.edgeLabelRelation} textAnchor="middle">
                  {link.relationshipLabel ?? 'unclear'}
                </text>
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((node) => {
            if (node.x === undefined || node.y === undefined) return null;
            const radius = node.isEgo ? NODE_RADIUS_EGO : NODE_RADIUS;
            const isSelected = !node.isEgo && node.id === selectedAgentId;
            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                <circle
                  r={radius}
                  className={[styles.node, node.isEgo ? styles.nodeEgo : styles.nodeOther, isSelected ? styles.nodeSelected : ''].join(
                    ' ',
                  )}
                  onPointerDown={(e) => handlePointerDown(node, e)}
                  onClick={() => !node.isEgo && onSelectNode(node.id)}
                  role={node.isEgo ? undefined : 'button'}
                  tabIndex={node.isEgo ? undefined : 0}
                  onKeyDown={(e) => {
                    if (!node.isEgo && (e.key === 'Enter' || e.key === ' ')) onSelectNode(node.id);
                  }}
                  aria-label={node.isEgo ? `${node.id} (this agent)` : `View relationship detail for ${node.id}`}
                />
                <text className={styles.nodeLabel} y={radius + 16} textAnchor="middle">
                  {node.id}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
