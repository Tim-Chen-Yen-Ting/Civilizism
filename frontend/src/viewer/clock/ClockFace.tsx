import { useMemo } from 'react';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { tickToClock } from '../lib/simclock';
import styles from './ClockFace.module.css';

const HOUR_MARK_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

export function ClockFace() {
  const { index } = useRunData();
  const { currentTick } = usePlayback();

  const { datePart, hour, minute, label } = useMemo(() => {
    const clockStr = tickToClock(currentTick, index.density); // "MM/DD HH:MM"
    const [date, time] = clockStr.split(' ');
    const [h, m] = time.split(':').map(Number);
    return { datePart: date, hour: h, minute: m, label: clockStr };
  }, [currentTick, index.density]);

  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minuteAngle = minute * 6;

  return (
    <div className={styles.wrap} aria-label={`Simulation clock: ${label}`}>
      <svg viewBox="0 0 100 100" className={styles.face} role="img" aria-hidden="true">
        <circle cx="50" cy="50" r="47" className={styles.rim} />
        {HOUR_MARK_ANGLES.map((angle) => (
          <line key={angle} x1="50" y1="6" x2="50" y2="12" className={styles.tick} transform={`rotate(${angle} 50 50)`} />
        ))}
        <line x1="50" y1="50" x2="50" y2="27" className={styles.hourHand} transform={`rotate(${hourAngle} 50 50)`} />
        <line x1="50" y1="50" x2="50" y2="16" className={styles.minuteHand} transform={`rotate(${minuteAngle} 50 50)`} />
        <circle cx="50" cy="50" r="3" className={styles.pivot} />
      </svg>
      <div className={styles.date}>{datePart}</div>
    </div>
  );
}
