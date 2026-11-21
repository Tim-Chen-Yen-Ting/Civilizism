import { useCallback, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import styles from './TrendChart.module.css';

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export type TrendPoint = Record<string, number> & { tick: number };

export interface TrendChartProps {
  data: TrendPoint[];
  series: TrendSeries[];
  currentTick: number;
  /** Force the y-axis to include 0 (right for a magnitude/weight series).
   *  Off for the psych-trait topic, where per-tick drift is tiny (~1e-3) and
   *  a 0-anchored axis would flatten every line into an unreadable band. */
  zeroBaseline?: boolean;
  yFormatter?: (value: number) => string;
  emptyMessage?: string;
}

const defaultFormat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(3));

/**
 * Thin recharts wrapper reused for all three Tab 3 topics (beliefs, emotions,
 * psych traits) — callers only shape `data`/`series`, this owns the chrome:
 * legend with click-to-toggle, a "you are here" marker at currentTick, a
 * value-leads tooltip, and a table-view twin (dataviz skill: every chart
 * needs a non-color-only escape hatch).
 */
export function TrendChart({ data, series, currentTick, zeroBaseline = true, yFormatter, emptyMessage }: TrendChartProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [showTable, setShowTable] = useState(false);
  const format = yFormatter ?? defaultFormat;

  const toggle = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  if (series.length === 0 || data.length === 0) {
    return <div className={styles.empty}>{emptyMessage ?? 'No data for this agent yet.'}</div>;
  }

  const visibleSeries = series.filter((s) => !hidden.has(s.key));

  return (
    <div className={styles.wrap}>
      <div className={styles.chartArea}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="tick"
              stroke="var(--color-border-strong)"
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border-strong)' }}
              minTickGap={24}
            />
            <YAxis
              domain={zeroBaseline ? [0, 'auto'] : ['auto', 'auto']}
              stroke="var(--color-border-strong)"
              tick={{ fill: 'var(--color-text-faint)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={format}
            />
            <Tooltip
              cursor={{ stroke: 'var(--color-border-strong)', strokeWidth: 1 }}
              content={<ChartTooltip series={series} hidden={hidden} format={format} />}
            />
            <ReferenceLine
              x={currentTick}
              stroke="var(--color-accent)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{ value: 'now', position: 'insideTopRight', fill: 'var(--color-accent)', fontSize: 10 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: 'var(--color-bg-elevated)', strokeWidth: 2 }}
                hide={hidden.has(s.key)}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ChartLegend series={series} hidden={hidden} onToggle={toggle} />

      <button type="button" className={styles.tableToggle} onClick={() => setShowTable((v) => !v)} aria-expanded={showTable}>
        {showTable ? 'Hide table view' : 'View as table'}
      </button>

      {showTable && <ChartTable data={data} series={visibleSeries} format={format} />}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  hidden,
  format,
}: TooltipProps<number, string> & { series: TrendSeries[]; hidden: Set<string>; format: (v: number) => string }) {
  if (!active || !payload || payload.length === 0) return null;
  const byKey = new Map(payload.map((p) => [String(p.dataKey), typeof p.value === 'number' ? p.value : undefined]));

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTick}>tick {label}</div>
      {series
        .filter((s) => !hidden.has(s.key) && byKey.get(s.key) !== undefined)
        .map((s) => (
          <div key={s.key} className={styles.tooltipRow}>
            <span className={styles.tooltipKey} style={{ backgroundColor: s.color }} />
            <span className={styles.tooltipLabel}>{s.label}</span>
            <span className={styles.tooltipValue}>{format(byKey.get(s.key)!)}</span>
          </div>
        ))}
    </div>
  );
}

function ChartLegend({
  series,
  hidden,
  onToggle,
}: {
  series: TrendSeries[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
}) {
  if (series.length < 2) return null;
  return (
    <div className={styles.legend} role="group" aria-label="Toggle series visibility">
      {series.map((s) => {
        const isHidden = hidden.has(s.key);
        return (
          <button
            key={s.key}
            type="button"
            className={styles.legendItem}
            aria-pressed={!isHidden}
            onClick={() => onToggle(s.key)}
          >
            <span className={styles.legendSwatch} style={{ backgroundColor: isHidden ? 'var(--color-border-strong)' : s.color }} />
            <span className={isHidden ? styles.legendLabelDim : styles.legendLabel}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartTable({ data, series, format }: { data: TrendPoint[]; series: TrendSeries[]; format: (v: number) => string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tick</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.tick}>
              <td>{row.tick}</td>
              {series.map((s) => (
                <td key={s.key}>{format(row[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
