import { useState } from 'react';
import type { SocialCircleEntry } from '../../types/run';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { snapshotAtOrBefore } from '../lib/runIndex';
import { SocialGraph } from './SocialGraph';
import styles from './SocialTab.module.css';

export interface SocialTabProps {
  /** The agent whose panel is open — the graph's center node. AgentPanel
   *  passes its panelAgentId through as `agentId`, matching OverviewTab's
   *  and TrendsTab's prop name; everything else (the social_circle at the
   *  current tick) is resolved from context in here, the same self-resolving
   *  pattern ClockFace/OverviewTab/TrendsTab use rather than having it
   *  threaded through as props. */
  agentId: string;
}

const MAX_TAG_ROWS = 4;

export function SocialTab({ agentId: egoAgentId }: SocialTabProps) {
  const { index } = useRunData();
  const { currentTick } = usePlayback();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A different agent's panel opening must not carry over a stale node
  // selection — reset during render (React's documented pattern for
  // deriving state off a changed prop) rather than an effect + extra render.
  const [trackedEgoId, setTrackedEgoId] = useState(egoAgentId);
  if (egoAgentId !== trackedEgoId) {
    setTrackedEgoId(egoAgentId);
    setSelectedId(null);
  }

  const snapshot = snapshotAtOrBefore(index, egoAgentId, currentTick);
  const socialCircle = snapshot?.agent_info.social_circle ?? {};
  const selectedEntry = selectedId ? (socialCircle[selectedId] ?? null) : null;

  function handleSelect(agentId: string) {
    setSelectedId((current) => (current === agentId ? null : agentId));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.graphArea}>
        <SocialGraph egoAgentId={egoAgentId} socialCircle={socialCircle} onSelectNode={handleSelect} selectedAgentId={selectedId} />
      </div>
      {selectedId && selectedEntry && (
        <NodeDetailCard agentId={selectedId} entry={selectedEntry} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function NodeDetailCard({ agentId, entry, onClose }: { agentId: string; entry: SocialCircleEntry; onClose: () => void }) {
  const emotionRows = topRows(entry.dominant_emotion);
  const beliefRows = topRows(entry.dominant_belief);

  return (
    <aside className={styles.detailCard} aria-label={`Relationship detail for ${agentId}`}>
      <div className={styles.detailHeader}>
        <h4 className={styles.detailName}>{agentId}</h4>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close detail">
          ×
        </button>
      </div>

      <dl className={styles.statList}>
        <div className={styles.statRow}>
          <dt>Trust</dt>
          <dd>{entry.trust_score.toFixed(2)}</dd>
        </div>
        <div className={styles.statRow}>
          <dt>Relationship</dt>
          <dd className={entry.relationship_label ? undefined : styles.unclear}>{entry.relationship_label ?? 'unclear'}</dd>
        </div>
      </dl>

      <TagSection title="Dominant emotion" rows={emotionRows} />
      <TagSection title="Dominant belief" rows={beliefRows} />

      <div className={styles.activitySection}>
        <h5 className={styles.sectionTitle}>Recent activities</h5>
        {entry.recent_activities.length === 0 ? (
          <p className={styles.empty}>None recorded.</p>
        ) : (
          <ul className={styles.activityList}>
            {entry.recent_activities.map((activity, i) => (
              <li key={i}>{activity}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function TagSection({ title, rows }: { title: string; rows: { label: string; weight: number; fraction: number }[] }) {
  return (
    <div className={styles.tagSection}>
      <h5 className={styles.sectionTitle}>{title}</h5>
      {rows.length === 0 ? (
        <p className={styles.empty}>No signal yet.</p>
      ) : (
        <ul className={styles.tagList}>
          {rows.map((row) => (
            <li key={row.label} className={styles.tagRow}>
              <span className={styles.tagLabel}>{row.label}</span>
              <span className={styles.tagBarTrack}>
                <span className={styles.tagBarFill} style={{ width: `${Math.round(row.fraction * 100)}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** dominant_emotion/dominant_belief are accumulated-weight dicts, not
 *  probability distributions (see types/run.ts) — sorted desc, top N, each
 *  bar scaled relative to the top entry rather than a shared 0-1 axis. */
function topRows(weights: Record<string, number>): { label: string; weight: number; fraction: number }[] {
  const entries = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, MAX_TAG_ROWS);
  const max = top[0]?.[1] || 1;
  return top.map(([label, weight]) => ({ label, weight, fraction: weight / max }));
}
