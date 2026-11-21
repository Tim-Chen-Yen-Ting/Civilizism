import { useMemo } from 'react';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { floorIndex } from '../lib/tickSearch';
import { tickToClock } from '../lib/simclock';
import styles from './PlaybackBar.module.css';

/** |<<<|<|>|>>>| + scrub slider, reading/writing the shared playback tick.
 *
 * Steps between entries of RunIndex.ticks, never +/-1 on the raw tick
 * number — tick coverage is sparse and non-contiguous (see RunIndex.ticks'
 * own doc comment), so a bare +1 can land on a tick nothing happened at. */
export function PlaybackBar() {
  const { index } = useRunData();
  const { currentTick, setCurrentTick, live } = usePlayback();
  const ticks = index.ticks;
  const pos = useMemo(() => floorIndex(ticks, currentTick), [ticks, currentTick]);
  const lastPos = ticks.length - 1;

  if (ticks.length === 0) {
    return (
      <div className={styles.bar}>
        <span className={styles.empty}>No ticks recorded in this run.</span>
      </div>
    );
  }

  function goToPos(nextPos: number) {
    const clamped = Math.min(Math.max(nextPos, 0), lastPos);
    const tick = ticks[clamped];
    if (tick !== currentTick) setCurrentTick(tick);
  }

  const atStart = pos <= 0;
  const atEnd = pos >= lastPos;

  return (
    <div className={styles.bar}>
      <div className={styles.controls}>
        <button type="button" className={styles.stepButton} onClick={() => goToPos(0)} disabled={live || atStart} aria-label="First tick" title="First tick">
          |&lt;&lt;&lt;
        </button>
        <button type="button" className={styles.stepButton} onClick={() => goToPos(pos - 1)} disabled={live || atStart} aria-label="Previous tick" title="Previous tick">
          |&lt;
        </button>
        <button type="button" className={styles.stepButton} onClick={() => goToPos(pos + 1)} disabled={live || atEnd} aria-label="Next tick" title="Next tick">
          |&gt;
        </button>
        <button type="button" className={styles.stepButton} onClick={() => goToPos(lastPos)} disabled={live || atEnd} aria-label="Last tick" title="Last tick">
          |&gt;&gt;&gt;
        </button>
      </div>

      <input
        type="range"
        className={styles.scrub}
        min={0}
        max={lastPos}
        step={1}
        value={Math.max(pos, 0)}
        onChange={(event) => goToPos(Number(event.target.value))}
        aria-label="Scrub tick"
        disabled={live}
      />

      <div className={styles.readout}>
        <span className={styles.tickNumber}>Tick {currentTick}</span>
        <span className={styles.clock}>{tickToClock(currentTick, index.density)}</span>
        <span className={styles.position}>
          {pos + 1} / {ticks.length}
        </span>
      </div>
    </div>
  );
}
