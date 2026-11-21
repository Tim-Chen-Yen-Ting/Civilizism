import { useMemo, useState } from 'react';
import type { AgentSnapshot } from '../../types/run';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { agentSnapshotHistory } from '../lib/runIndex';
import { TrendChart, type TrendPoint, type TrendSeries } from './TrendChart';
import styles from './TrendsTab.module.css';

export interface TrendsTabProps {
  /** The agent whose panel is open. Everything else (snapshot history,
   *  currentTick) is resolved from context in here — the same pattern
   *  SocialTab/ClockFace use rather than threading it all through as props. */
  agentId: string;
}

type Topic = 'emotions' | 'beliefs' | 'psych';

const TOPICS: { value: Topic; label: string }[] = [
  { value: 'emotions', label: 'Emotion intensity' },
  { value: 'beliefs', label: 'Belief cluster weights' },
  { value: 'psych', label: 'Psych coefficients' },
];

/** Same 8 hues/order as viewer/lib/agentColor.ts's CATEGORICAL_DARK and
 *  tokens.css's --chart-cat-*, referenced here via the CSS custom properties
 *  so there is exactly one place (tokens.css) the actual hex values live.
 *  Fixed order is the CVD-safety mechanism — never reorder, never cycle
 *  past 8; a 9th series folds into "Other" instead (see buildCappedSeries). */
const CATEGORICAL = [
  'var(--chart-cat-1)',
  'var(--chart-cat-2)',
  'var(--chart-cat-3)',
  'var(--chart-cat-4)',
  'var(--chart-cat-5)',
  'var(--chart-cat-6)',
  'var(--chart-cat-7)',
  'var(--chart-cat-8)',
];
const OTHER_COLOR = 'var(--chart-other)';

/** Plutchik wheel order — used as the preferred ordering when all 8 are
 *  present (the normal case), so the legend/series order is stable and
 *  meaningful rather than alphabetical or first-seen. */
const EMOTION_ORDER = ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'];

const MAX_PSYCH_SELECTED = 6;

function humanize(key: string): string {
  return key
    .split('_')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function colorForSlot(colorOrder: string[], key: string): string {
  const idx = colorOrder.indexOf(key);
  return CATEGORICAL[(idx < 0 ? 0 : idx) % CATEGORICAL.length];
}

interface ChartResult {
  data: TrendPoint[];
  series: TrendSeries[];
}

/**
 * Shared builder for the two "weighted label set that varies per tick"
 * topics (emotions, belief clusters): ranks every label ever seen by its
 * max value across the agent's history, keeps the top 8 (the categorical
 * palette's cap) as their own series, and folds anything past that into a
 * single gray "Other" series — never a generated 9th hue (dataviz
 * anti-pattern: cycling/generating hues past 8).
 */
function buildCappedSeries(
  snapshots: AgentSnapshot[],
  getWeights: (s: AgentSnapshot) => Record<string, number>,
  preferredOrder: string[] = [],
): ChartResult {
  const maxVal = new Map<string, number>();
  for (const s of snapshots) {
    for (const [name, val] of Object.entries(getWeights(s))) {
      maxVal.set(name, Math.max(maxVal.get(name) ?? 0, val));
    }
  }

  const seen = [...maxVal.keys()];
  const byMaxDesc = (a: string, b: string) => (maxVal.get(b) ?? 0) - (maxVal.get(a) ?? 0);
  const ranked =
    preferredOrder.length > 0
      ? [...preferredOrder.filter((n) => maxVal.has(n)), ...seen.filter((n) => !preferredOrder.includes(n)).sort(byMaxDesc)]
      : seen.sort(byMaxDesc);

  const topNames = ranked.slice(0, CATEGORICAL.length);
  const hasOverflow = ranked.length > CATEGORICAL.length;
  const topSet = new Set(topNames);

  const data: TrendPoint[] = snapshots.map((s) => {
    const weights = getWeights(s);
    const point: TrendPoint = { tick: s.tick };
    let otherSum = 0;
    for (const [name, val] of Object.entries(weights)) {
      if (topSet.has(name)) point[name] = val;
      else otherSum += val;
    }
    for (const name of topNames) if (!(name in point)) point[name] = 0;
    if (hasOverflow) point.__other = otherSum;
    return point;
  });

  const series: TrendSeries[] = topNames.map((name, i) => ({ key: name, label: humanize(name), color: CATEGORICAL[i] }));
  if (hasOverflow) series.push({ key: '__other', label: 'Other', color: OTHER_COLOR });

  return { data, series };
}

function buildEmotionSeries(snapshots: AgentSnapshot[]): ChartResult {
  return buildCappedSeries(snapshots, (s) => s.emotion_distribution, EMOTION_ORDER);
}

function buildBeliefSeries(snapshots: AgentSnapshot[]): ChartResult {
  return buildCappedSeries(snapshots, (s) => Object.fromEntries(s.belief_clusters.map((c) => [c.name, c.net_importance])));
}

interface TraitRange {
  trait: string;
  range: number;
}

/** Total (max - min) per trait across the agent's whole history — computed
 *  once over the full snapshot list, not per tick. Drives the default
 *  trait selection (the traits that actually moved) since with ~1e-3
 *  typical per-tick drift, a random 6 of 43 traits reads as flat noise. */
function computeTraitRanges(snapshots: AgentSnapshot[]): TraitRange[] {
  const minMax = new Map<string, [number, number]>();
  for (const s of snapshots) {
    for (const [trait, val] of Object.entries(s.agent_info.psyc_profile)) {
      const cur = minMax.get(trait);
      if (!cur) minMax.set(trait, [val, val]);
      else {
        if (val < cur[0]) cur[0] = val;
        if (val > cur[1]) cur[1] = val;
      }
    }
  }
  return [...minMax.entries()]
    .map(([trait, [min, max]]): TraitRange => ({ trait, range: max - min }))
    .sort((a, b) => b.range - a.range || a.trait.localeCompare(b.trait));
}

/**
 * Traits sit at very different absolute baselines (0.1 vs 0.9), so a shared
 * raw-value axis has to span the full cross-trait spread — which swamps the
 * ~1e-3-scale drift each one actually shows over time, flattening every
 * line regardless of y-axis zoom. Charted as delta-from-first-shown-tick
 * instead (every series starts at 0 on the agent's earliest known tick):
 * same "index to a common base" fix the dataviz skill prescribes for
 * differently-scaled series sharing one axis, applied to differently-based
 * ones. Signed, in the trait's own units, so relative drift stays
 * comparable across traits (a 0-1-normalized version would falsely equate
 * a 0.006 mover with a 0.0001 one).
 */
function buildPsychSeries(snapshots: AgentSnapshot[], selected: string[], colorOrder: string[]): ChartResult {
  const baseline = new Map<string, number>();
  for (const trait of selected) {
    const first = snapshots.find((s) => trait in s.agent_info.psyc_profile);
    baseline.set(trait, first ? first.agent_info.psyc_profile[trait] : 0);
  }

  const data: TrendPoint[] = snapshots.map((s) => {
    const point: TrendPoint = { tick: s.tick };
    for (const trait of selected) {
      const raw = s.agent_info.psyc_profile[trait] ?? baseline.get(trait)!;
      point[trait] = raw - baseline.get(trait)!;
    }
    return point;
  });
  const series: TrendSeries[] = selected.map((trait) => ({ key: trait, label: humanize(trait), color: colorForSlot(colorOrder, trait) }));

  return { data, series };
}

function formatPsychDelta(v: number): string {
  if (Math.abs(v) < 1e-9) return '0';
  return `${v > 0 ? '+' : ''}${v.toFixed(4)}`;
}

function emptyMessageFor(topic: Topic): string {
  if (topic === 'beliefs') return 'No belief clusters formed for this agent yet.';
  if (topic === 'psych') return 'No traits selected.';
  return 'No emotion data recorded for this agent yet.';
}

export function TrendsTab({ agentId }: TrendsTabProps) {
  const { index } = useRunData();
  const { currentTick } = usePlayback();
  const [topic, setTopic] = useState<Topic>('emotions');

  // A different agent's panel opening resets the trait selection/coloring —
  // derived during render (React's documented pattern for state keyed off a
  // changed prop) rather than an effect + extra render, same as SocialTab's
  // trackedEgoId reset.
  const [trackedAgentId, setTrackedAgentId] = useState(agentId);
  const [selectedTraits, setSelectedTraits] = useState<string[] | null>(null);
  // Append-only history of every trait ever selected this panel session —
  // never removes an entry when a trait is deselected, so its color-slot
  // index (see colorForSlot) stays fixed. "Color follows the entity, never
  // its rank": deselecting trait B from [A,B,C] must not repaint C.
  const [everSelected, setEverSelected] = useState<string[]>([]);
  if (agentId !== trackedAgentId) {
    setTrackedAgentId(agentId);
    setSelectedTraits(null);
    setEverSelected([]);
  }

  // Full snapshot history for this agent, built once per agent — NOT
  // per-currentTick. The chart series memo below is keyed the same way
  // (plus topic/selection), per the Scope doc's Tab 3 perf rule: rebuilding
  // an N-point series on every scrub frame is the mistake to avoid.
  const snapshots = useMemo(() => agentSnapshotHistory(index, agentId), [index, agentId]);
  const traitRanges = useMemo(() => computeTraitRanges(snapshots), [snapshots]);
  const defaultTraits = useMemo(() => traitRanges.slice(0, MAX_PSYCH_SELECTED).map((t) => t.trait), [traitRanges]);
  const effectiveSelectedTraits = selectedTraits ?? defaultTraits;

  const colorOrder = useMemo(() => {
    const seenTraits = new Set<string>();
    const ordered: string[] = [];
    for (const t of defaultTraits) {
      if (!seenTraits.has(t)) {
        seenTraits.add(t);
        ordered.push(t);
      }
    }
    for (const t of everSelected) {
      if (!seenTraits.has(t)) {
        seenTraits.add(t);
        ordered.push(t);
      }
    }
    return ordered;
  }, [defaultTraits, everSelected]);

  const chart = useMemo(() => {
    if (topic === 'emotions') return buildEmotionSeries(snapshots);
    if (topic === 'beliefs') return buildBeliefSeries(snapshots);
    return buildPsychSeries(snapshots, effectiveSelectedTraits, colorOrder);
  }, [topic, snapshots, effectiveSelectedTraits, colorOrder]);

  function toggleTrait(trait: string) {
    setSelectedTraits((current) => {
      const base = current ?? defaultTraits;
      if (base.includes(trait)) return base.filter((t) => t !== trait);
      if (base.length >= MAX_PSYCH_SELECTED) return base;
      return [...base, trait];
    });
    setEverSelected((prev) => (prev.includes(trait) ? prev : [...prev, trait]));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <label className={styles.topicLabel}>
          Topic
          <select className={styles.topicSelect} value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {topic === 'psych' && (
        <>
          <TraitMultiselect
            traitRanges={traitRanges}
            selected={effectiveSelectedTraits}
            colorOrder={colorOrder}
            onToggle={toggleTrait}
          />
          <p className={styles.caption}>
            Shown as drift from each trait&rsquo;s value at the agent&rsquo;s earliest known tick — traits sit at very
            different baselines, so a shared raw-value axis would flatten the actual movement.
          </p>
        </>
      )}

      <TrendChart
        data={chart.data}
        series={chart.series}
        currentTick={currentTick}
        zeroBaseline={topic !== 'psych'}
        yFormatter={topic === 'psych' ? formatPsychDelta : undefined}
        emptyMessage={emptyMessageFor(topic)}
      />
    </div>
  );
}

function TraitMultiselect({
  traitRanges,
  selected,
  colorOrder,
  onToggle,
}: {
  traitRanges: TraitRange[];
  selected: string[];
  colorOrder: string[];
  onToggle: (trait: string) => void;
}) {
  const selectedSet = new Set(selected);
  const atCap = selected.length >= MAX_PSYCH_SELECTED;

  return (
    <div className={styles.traitPicker}>
      <div className={styles.traitPickerHeader}>
        <span>
          Traits ({selected.length}/{MAX_PSYCH_SELECTED})
        </span>
        {atCap && <span className={styles.traitPickerHint}>Uncheck one to add another</span>}
      </div>
      <div className={styles.traitList}>
        {traitRanges.map(({ trait, range }) => {
          const isSelected = selectedSet.has(trait);
          const disabled = !isSelected && atCap;
          return (
            <label key={trait} className={styles.traitItem}>
              <input type="checkbox" checked={isSelected} disabled={disabled} onChange={() => onToggle(trait)} />
              <span
                className={styles.traitSwatch}
                style={{ backgroundColor: isSelected ? colorForSlot(colorOrder, trait) : 'transparent' }}
              />
              <span className={disabled ? styles.traitNameDisabled : styles.traitName}>{humanize(trait)}</span>
              <span className={styles.traitRange}>&#916;{range.toFixed(4)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
