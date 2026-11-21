import { useEffect, useMemo, useRef } from 'react';
import type { ActivityLogEntry } from '../../types/run';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { floorIndexBy } from '../lib/tickSearch';
import { tickToHHMM } from '../lib/simclock';
import { getAgentColor } from '../lib/agentColor';
import styles from './SpeechLog.module.css';

type SpeechEntry = Extract<ActivityLogEntry, { type: 'speech' }>;

/** "Ray says: Anyone else up yet?" -> "Anyone else up yet?" — the engine
 *  always writes this exact "<name> says: " prefix (verified across every
 *  sample run); fall back to the raw content unchanged if a line ever
 *  doesn't match rather than mangling it. */
function stripSpeakerPrefix(content: string, speaker: string): string {
  const prefix = `${speaker} says: `;
  return content.startsWith(prefix) ? content.slice(prefix.length) : content;
}

/** Chat-style transcript windowed to "everything said up to currentTick",
 *  auto-scrolled to the newest line. Clicking a line jumps the scrubber to
 *  that line's tick; clicking a speaker's name selects that agent. */
export function SpeechLog() {
  const { index, agentIds } = useRunData();
  const { currentTick, setCurrentTick, setSelectedAgentId } = usePlayback();
  const density = index.density;
  // RunIndex.speechEntries is contractually every type==='speech' entry,
  // sorted by timestep — trusted here rather than re-filtered every render.
  const speech = index.speechEntries as SpeechEntry[];
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => {
    const count = floorIndexBy(speech, currentTick, (entry) => entry.timestep) + 1;
    return speech.slice(0, count);
  }, [speech, currentTick]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  return (
    <div className={styles.log} ref={scrollRef}>
      {visible.length === 0 && <p className={styles.empty}>No speech yet.</p>}
      {visible.map((entry, i) => {
        const color = getAgentColor(entry.by_who, agentIds);
        return (
          <div
            key={`${entry.timestep}-${entry.by_who}-${i}`}
            className={i === visible.length - 1 ? `${styles.line} ${styles.latest}` : styles.line}
            style={{ borderLeftColor: color }}
            onClick={() => setCurrentTick(entry.timestep)}
          >
            <span className={styles.time}>{tickToHHMM(entry.timestep, density)}</span>
            <button
              type="button"
              className={styles.speaker}
              style={{ color }}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAgentId(entry.by_who);
              }}
            >
              {entry.by_who}
            </button>
            <span className={styles.content}>{stripSpeakerPrefix(entry.content, entry.by_who)}</span>
            {entry.target && <span className={styles.target}>→ {entry.target}</span>}
          </div>
        );
      })}
    </div>
  );
}
