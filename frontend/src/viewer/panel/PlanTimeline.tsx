import { tickToHHMM } from '../lib/simclock';
import styles from './PlanTimeline.module.css';

interface PlanQueueItem {
  activity: string;
  timestep: number | null;
  importance: number;
}

export interface PlanTimelineProps {
  /** snapshot.plan_queue — already truncated to the top 5 by the backend (see AgentCore.snapshot()); render exactly what's here, don't invent more. */
  items: PlanQueueItem[];
  density: number;
  /** For dimming past-due rows. Optional — omit to render every row at full weight. */
  currentTick?: number;
}

/**
 * A single-instant plan_queue item has no end time, so this is a vertical
 * time axis (one marker per item), not a when2meet-style overlapping
 * availability block. Duplicate-looking entries (same activity+timestep,
 * different importance) are real data and render as separate rows —
 * dedup would silently drop planning signal. ~22% of items across a full
 * run carry timestep: null (goal-sourced, not yet scheduled); those go in
 * a separate bucket below the axis rather than being dropped.
 */
export function PlanTimeline({ items, density, currentTick }: PlanTimelineProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No plan queue entries.</p>;
  }

  const scheduled = items.filter((item) => item.timestep !== null).sort((a, b) => a.timestep! - b.timestep!);
  const unscheduled = items.filter((item) => item.timestep === null);

  return (
    <div className={styles.wrap}>
      {scheduled.length > 0 && (
        <ol className={styles.axis}>
          {scheduled.map((item, i) => {
            const isPast = currentTick !== undefined && item.timestep! < currentTick;
            return (
              <li key={`${item.timestep}-${item.activity}-${i}`} className={[styles.row, isPast ? styles.rowPast : ''].join(' ')}>
                <span className={styles.dot} aria-hidden="true" />
                <span className={styles.time}>{tickToHHMM(item.timestep!, density)}</span>
                <span className={styles.activity}>{item.activity}</span>
                <span className={styles.importance}>{item.importance.toFixed(1)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {unscheduled.length > 0 && (
        <div className={styles.unscheduled}>
          <h5 className={styles.sectionTitle}>Unscheduled</h5>
          <ul className={styles.unscheduledList}>
            {unscheduled.map((item, i) => (
              <li key={`unscheduled-${item.activity}-${i}`} className={styles.unscheduledRow}>
                <span className={styles.activity}>{item.activity}</span>
                <span className={styles.importance}>{item.importance.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
