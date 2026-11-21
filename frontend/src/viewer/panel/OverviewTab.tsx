import { useState } from 'react';
import type { AgentSnapshot } from '../../types/run';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { snapshotAtOrBefore } from '../lib/runIndex';
import { getAgentColor, agentInitials } from '../lib/agentColor';
import { currentIntent, intentEmoji } from '../lib/intentEmoji';
import { Button } from '../../components/ui/Button';
import { PlanTimeline } from './PlanTimeline';
import { DetailedProfileModal } from './DetailedProfileModal';
import styles from './OverviewTab.module.css';

export interface OverviewTabProps {
  /** AgentPanel passes its panelAgentId through; the snapshot at the current
   *  tick and the static resume-state are resolved from context in here —
   *  same self-resolving pattern SocialTab/ClockFace use rather than having
   *  either threaded through as props. */
  agentId: string;
}

const MAX_EMOTION_ROWS = 4;
const MAX_BELIEF_ROWS = 5;

export function OverviewTab({ agentId }: OverviewTabProps) {
  const { run, index, agentIds } = useRunData();
  const { currentTick } = usePlayback();
  const [detailOpen, setDetailOpen] = useState(false);

  // A different agent's panel opening must not carry over a stale open
  // modal — reset during render (React's documented derived-state pattern)
  // rather than an effect + extra render, mirroring SocialTab's reset.
  const [trackedAgentId, setTrackedAgentId] = useState(agentId);
  if (agentId !== trackedAgentId) {
    setTrackedAgentId(agentId);
    setDetailOpen(false);
  }

  const snapshot = snapshotAtOrBefore(index, agentId, currentTick);
  const resumeState = run.resume.agents[agentId];
  const color = getAgentColor(agentId, agentIds);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.avatar} style={{ background: color }}>
          {agentInitials(agentId)}
        </div>
        <div className={styles.headerText}>
          <div className={styles.nameRow}>
            <h3 className={styles.name}>{agentId}</h3>
            {resumeState?.faction && <span className={styles.factionBadge}>{resumeState.faction}</span>}
          </div>
          <p className={styles.personalityStr}>{resumeState?.personality_str ?? 'No personality description recorded.'}</p>
        </div>
      </header>

      {!snapshot ? (
        <p className={styles.empty}>No snapshot recorded for {agentId} yet at this tick.</p>
      ) : (
        <>
          <CurrentActionSection snapshot={snapshot} />

          <StatusSection snapshot={snapshot} />

          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Plan queue</h4>
            <PlanTimeline items={snapshot.plan_queue} density={index.density} currentTick={snapshot.tick} />
          </section>

          <HighlightsSection snapshot={snapshot} />

          <section className={styles.section}>
            <Button variant="secondary" className={styles.detailToggle} onClick={() => setDetailOpen(true)}>
              Detailed profile…
            </Button>
          </section>

          {detailOpen && (
            <DetailedProfileModal
              agentId={agentId}
              psycProfile={snapshot.agent_info.psyc_profile}
              bioProfile={resumeState?.bio_profile ?? null}
              onClose={() => setDetailOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

function StatusSection({ snapshot }: { snapshot: AgentSnapshot }) {
  const { biological, emotion, emotion_distribution: emotionDistribution } = snapshot;
  const topEmotions = Object.entries(emotionDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_EMOTION_ROWS);

  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Status</h4>

      <h5 className={styles.sectionTitle} style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
        Emotion
      </h5>
      <div className={styles.emotionHeadline}>
        <span className={styles.emotionLabel}>{emotion.emotion}</span>
        <span className={styles.emotionIntensity}>intensity {emotion.intensity.toFixed(2)}</span>
      </div>
      {topEmotions.length > 0 && (
        <ul className={styles.emotionBars}>
          {topEmotions.map(([name, weight]) => (
            <li key={name} className={styles.emotionBarRow}>
              <span className={styles.emotionBarName}>{name}</span>
              <span className={styles.meterTrack}>
                <span className={styles.meterFill} style={{ width: `${Math.round(clamp01(weight) * 100)}%`, background: 'var(--color-accent)' }} />
              </span>
              <span className={styles.emotionBarValue}>{weight.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <h5 className={styles.sectionTitle} style={{ fontSize: 'var(--text-xs)', marginBottom: 4, marginTop: 'var(--space-3)' }}>
        Biological
      </h5>
      <div className={styles.meterGrid}>
        <Meter label="Fatigue (sleep debt)" value={biological.process_s} />
        <Meter label="Stress (irritability)" value={biological.irritability} />
        <Meter label="Hunger" value={biological.hunger} />
        <Meter label="Boredom" value={biological.boredom} />
      </div>
    </section>
  );
}

/**
 * process_s/irritability/hunger/boredom are open-ended computed floats, not
 * hard-clipped to [0,1] at every call site in the engine — clamp defensively
 * for the fill width so an edge-case value can't overflow or invert the bar.
 */
function Meter({ label, value }: { label: string; value: number }) {
  const fraction = clamp01(value);
  const tier = fraction >= 0.75 ? 'danger' : fraction >= 0.5 ? 'warning' : 'good';
  const fillClass = tier === 'danger' ? styles.meterDanger : tier === 'warning' ? styles.meterWarning : styles.meterGood;

  return (
    <div className={styles.meterRow}>
      <div className={styles.meterLabelRow}>
        <span className={styles.meterLabel}>{label}</span>
        <span className={styles.meterValue}>{value.toFixed(2)}</span>
      </div>
      <span className={styles.meterTrack}>
        <span className={[styles.meterFill, fillClass].join(' ')} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </span>
    </div>
  );
}

/** Same last_decision (with recent_intents fallback) the map reads via
 *  currentIntent() — action is the full decision text ("Open door to living
 *  room"), richer than the emoji-only intent category shown on the token. */
function CurrentActionSection({ snapshot }: { snapshot: AgentSnapshot }) {
  const decision = snapshot.last_decision;
  const intent = currentIntent(snapshot);
  const emoji = intentEmoji(intent);

  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Current action</h4>
      {decision ? (
        <p className={styles.currentAction}>
          {emoji && <span className={styles.currentActionEmoji}>{emoji}</span>}
          <span>{decision.action}</span>
          <span className={styles.currentActionRoom}> — {decision.room}</span>
        </p>
      ) : intent ? (
        <p className={styles.currentAction}>
          {emoji && <span className={styles.currentActionEmoji}>{emoji}</span>}
          <span className={styles.currentActionRoom}>{intent}</span>
        </p>
      ) : (
        <p className={styles.empty}>No decision recorded yet.</p>
      )}
    </section>
  );
}

function HighlightsSection({ snapshot }: { snapshot: AgentSnapshot }) {
  const { top_beliefs: topBeliefs, core_memories: coreMemories } = snapshot.agent_info;
  const beliefRows = [...topBeliefs].sort((a, b) => b.net_importance - a.net_importance).slice(0, MAX_BELIEF_ROWS);
  const maxBelief = beliefRows[0]?.net_importance || 1;

  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Highlights</h4>

      <div>
        <h5 className={styles.sectionTitle} style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
          Top beliefs
        </h5>
        {beliefRows.length === 0 ? (
          <p className={styles.empty}>No belief clusters formed yet.</p>
        ) : (
          <ul className={styles.beliefList}>
            {beliefRows.map((belief) => (
              <li key={belief.name} className={styles.beliefRow}>
                <div className={styles.beliefLabelRow}>
                  <span className={styles.beliefName}>{belief.name}</span>
                  <span className={styles.beliefValue}>{belief.net_importance.toFixed(1)}</span>
                </div>
                <span className={styles.meterTrack}>
                  <span
                    className={styles.meterFill}
                    style={{ width: `${Math.round((belief.net_importance / maxBelief) * 100)}%`, background: 'var(--color-accent)' }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <h5 className={styles.sectionTitle} style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>
          Core memories
        </h5>
        {coreMemories.length === 0 ? (
          <p className={styles.empty}>No core memories recorded yet.</p>
        ) : (
          <ul className={styles.memoryList}>
            {coreMemories.map((memory, i) => (
              <li key={i} className={styles.memoryRow}>
                <p className={styles.memoryContent}>{memory.content}</p>
                <p className={styles.memoryImportance}>importance {memory.importance.toFixed(1)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
