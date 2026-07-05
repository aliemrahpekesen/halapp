import { useState } from 'react';
import { useThemeMode } from '../theme';

export interface BarDatum { label: string; value: number; }

/**
 * Single-series magnitude bar chart (dataviz: thin marks, 4px rounded data-ends
 * anchored to baseline, 2px gaps, recessive axis, per-bar hover tooltip, direct
 * value labels). Brand hue carries magnitude; text uses ink tokens.
 */
export function BarChart({ data, height = 220, format = (v: number) => v.toLocaleString('tr-TR') }: {
  data: BarDatum[]; height?: number; format?: (v: number) => string;
}) {
  const { mode, brandBar } = useThemeMode();
  const [hover, setHover] = useState<number | null>(null);
  const ink = mode === 'dark' ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.85)';
  const muted = mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const grid = mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  if (!data.length) return <div style={{ height, display: 'grid', placeItems: 'center', color: muted }}>Veri yok</div>;

  const max = Math.max(...data.map((d) => d.value), 1);
  const padTop = 16, padBottom = 28, padLeft = 8, padRight = 8;
  const plotH = height - padTop - padBottom;
  const n = data.length;
  const gap = 8;
  const W = 720;
  const barW = Math.max(6, (W - padLeft - padRight - gap * (n - 1)) / n);

  return (
    <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} role="img" style={{ display: 'block' }}>
        {/* baseline */}
        <line x1={padLeft} y1={padTop + plotH} x2={W - padRight} y2={padTop + plotH} stroke={grid} strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * plotH);
          const x = padLeft + i * (barW + gap);
          const y = padTop + plotH - h;
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={y} width={barW} height={h} rx={4} fill={brandBar} opacity={hover === null || active ? 1 : 0.55} />
              {active && <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={ink}>{format(d.value)}</text>}
              <text x={x + barW / 2} y={padTop + plotH + 16} textAnchor="middle" fontSize={11} fill={muted}>
                {d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
