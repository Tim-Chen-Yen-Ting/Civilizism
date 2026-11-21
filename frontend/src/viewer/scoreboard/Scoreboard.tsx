import { useMemo, useState } from 'react';
import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { getAgentColor } from '../lib/agentColor';
import styles from './Scoreboard.module.css';

interface Reading {
  tick: number;
  level: number;
}
interface Board {
  device: string;
  unit: string;
  maximum: number;
  readings: Record<string, Reading[]>;
}

const CHART_W = 300;
const CHART_H = 110;

function levelAt(readings: Reading[], tick: number): number {
  let level = 0;
  for (const r of readings) {
    if (r.tick > tick) break;
    level = r.level;
  }
  return level;
}

/** Shown only when the run logged instrument readings; otherwise renders nothing. */
export function Scoreboard() {
  const { run } = useRunData();
  const { currentTick } = usePlayback();
  const [open, setOpen] = useState(true);

  const board = useMemo<Board | null>(() => {
    const readings: Record<string, Reading[]> = {};
    let device = '';
    let unit = '';
    let maximum = 0;
    for (const raw of run.activity_log) {
      const e = raw as unknown as Record<string, unknown>;
      if (e.type === 'instrument' && typeof e.level === 'number') {
        const who = e.by_who as string;
        (readings[who] ??= []).push({ tick: e.timestep as number, level: e.level });
        device ||= (e.device as string) ?? '';
        unit ||= (e.unit as string) ?? '';
        maximum = Math.max(maximum, (e.maximum as number) ?? e.level);
      }
    }
    return Object.keys(readings).length ? { device, unit, maximum, readings } : null;
  }, [run]);

  const agentIds = useMemo(() => Object.keys(run.agents), [run]);
  if (!board) return null;

  const operators = Object.keys(board.readings);
  const rows = operators
    .map((who) => ({ who, level: levelAt(board.readings[who], currentTick) }))
    .sort((a, b) => b.level - a.level);

  const t0 = run.first_tick;
  const t1 = Math.max(run.last_tick, t0 + 1);
  const x = (t: number) => ((t - t0) / (t1 - t0)) * CHART_W;
  const y = (v: number) => CHART_H - (v / board.maximum) * CHART_H;

  return (
    <aside className={styles.board}>
      <button type="button" className={styles.header} onClick={() => setOpen((o) => !o)}>
        <span>Scoreboard · {board.device || 'instrument'}</span>
        <span className={styles.chevron}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <>
          <ul className={styles.rows}>
            {rows.map(({ who, level }) => (
              <li key={who} className={styles.row}>
                <span className={styles.name}>{who}</span>
                <span className={styles.track}>
                  <span
                    className={styles.fill}
                    style={{ width: `${(level / board.maximum) * 100}%`, background: getAgentColor(who, agentIds) }}
                  />
                </span>
                <span className={styles.value}>
                  {level}
                  {board.unit}
                  {level >= board.maximum && <span className={styles.max}> MAX</span>}
                </span>
              </li>
            ))}
          </ul>
          <svg className={styles.chart} viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" role="img" aria-label="Level over time per operator">
            {operators.map((who) => {
              const pts = board.readings[who].filter((r) => r.tick <= currentTick);
              if (!pts.length) return null;
              let d = `M ${x(t0)} ${y(0)}`;
              let prev = 0;
              for (const p of pts) {
                d += ` L ${x(p.tick)} ${y(prev)} L ${x(p.tick)} ${y(p.level)}`;
                prev = p.level;
              }
              d += ` L ${x(currentTick)} ${y(prev)}`;
              return <path key={who} d={d} fill="none" stroke={getAgentColor(who, agentIds)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
            })}
            <line x1={x(currentTick)} x2={x(currentTick)} y1="0" y2={CHART_H} className={styles.playhead} vectorEffect="non-scaling-stroke" />
          </svg>
          <p className={styles.caption}>Level of each operator's {board.device || 'instrument'} over the run, up to the playhead.</p>
        </>
      )}
    </aside>
  );
}
