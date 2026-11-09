import { useLayoutEffect, useMemo, useRef } from 'react';
import { max as d3max, rollup, scaleBand, scaleLinear, stack, sum } from 'd3';
import type { DailyRow, Filters, LineLoad, PlanRow } from '../types';
import { matchesFilters } from '../lib/calcs';
import { fd, int, lineColor, pct, short, todayIso, toDate, COLORS } from '../lib/format';
import { useElementWidth, useTooltip } from '../hooks';
import { Tooltip } from './Tooltip';

/* ---------- Daily planned output: stacked bars by line ---------- */
export function DailyChart({ daily, plan, filters }: { daily: DailyRow[]; plan: PlanRow[]; filters: Filters }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const { boxRef, tip, show, hide } = useTooltip<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const model = useMemo(() => {
    const byId = new Map(plan.map((r) => [r.id, r]));
    const rows = daily.filter((r) => { const p = byId.get(r.id); return !!p && matchesFilters(p, filters); });
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const lines = [...new Set(rows.map((r) => r.line))].sort((a, b) => a - b);
    const by = rollup(rows, (v) => sum(v, (r) => r.qty), (r) => r.date, (r) => r.line);
    const table = dates.map((d) => {
      const o: Record<string, number | string> = { date: d };
      for (const l of lines) o[String(l)] = by.get(d)?.get(l) ?? 0;
      return o;
    });
    return { dates, lines, table };
  }, [daily, plan, filters]);

  const { dates, lines, table } = model;
  const AW = 44, H = 240, mt = 10, mb = 24;
  const W = Math.max((width || 600) - AW, dates.length * 18, 200);
  const x = scaleBand<string>().domain(dates).range([0, W]).padding(0.2);
  const yMax = d3max(table, (o) => sum(lines, (l) => o[String(l)] as number)) || 1;
  const y = scaleLinear().domain([0, yMax]).range([H - mb, mt]).nice();
  const yTicks = y.ticks(4);
  const series = stack<Record<string, number | string>>().keys(lines.map(String))(table);
  const step = Math.max(1, Math.ceil(48 / x.step()));
  const labels = dates.filter((d, i) => i % step === 0 && (x(d) ?? 0) + 44 <= W);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const t = todayIso();
    const i = dates.findIndex((d) => d >= t);
    if (i > 3) el.scrollLeft = (x(dates[i]) ?? 0) - 60;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates.length, width]);

  if (!dates.length) return <p className="sl-fail">Nothing matches these filters.</p>;

  return (
    <div className="sl-chart" ref={boxRef}>
      <div className="sl-legend">
        {lines.map((l) => <span key={l}><i style={{ background: lineColor(l) }} />Line {l}</span>)}
      </div>
      <div className="sl-gwrap" ref={wrapRef}>
        <svg width={AW} height={H} aria-hidden="true">
          {yTicks.map((t) => <text key={t} x={AW - 6} y={y(t)} dy="0.35em" textAnchor="end">{short(t)}</text>)}
        </svg>
        <div className="sl-scroll" ref={scrollRef} onScroll={hide}>
          <svg width={W} height={H} role="img" aria-label={`Planned pieces per day over ${dates.length} working days, stacked by line`}>
            {yTicks.map((t) => <line key={t} className="sl-grid" x1={0} x2={W} y1={y(t)} y2={y(t)} />)}
            {series.map((s) => (
              <g key={s.key} style={{ fill: lineColor(Number(s.key)) }}>
                {s.map((p) => (
                  <rect key={String(p.data.date)} x={x(String(p.data.date))} width={x.bandwidth()} y={y(p[1])} height={Math.max(0, y(p[0]) - y(p[1]))} />
                ))}
              </g>
            ))}
            {labels.map((d) => <text key={d} x={x(d)} y={H - 8}>{fd(d)}</text>)}
            {table.map((o) => {
              const d = String(o.date);
              const parts = lines.filter((l) => (o[String(l)] as number) > 0).map((l) => `Line ${l}: ${int(o[String(l)] as number)} pcs`);
              const total = sum(lines, (l) => o[String(l)] as number);
              return (
                <rect key={'h' + d} x={x(d)} width={x.bandwidth()} y={0} height={H - mb} style={{ fill: 'transparent' }}
                  onPointerMove={(e) => show(e, `${fd(d)} · ${int(total)} pcs`, parts)} onClick={(e) => show(e, `${fd(d)} · ${int(total)} pcs`, parts)}
                  onPointerLeave={hide} />
              );
            })}
          </svg>
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

/* ---------- Planned efficiency heatmap: line × day ---------- */
export function Heatmap({ load, filters }: { load: LineLoad[]; filters: Filters }) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const { boxRef, tip, show, hide } = useTooltip<HTMLDivElement>();
  const rows = useMemo(() => load.filter((r) => r.availMin > 0 && (filters.line === 'All' || String(r.line) === filters.line)), [load, filters.line]);
  const dates = useMemo(() => [...new Set(rows.map((r) => r.date))].sort(), [rows]);
  const lines = useMemo(() => [...new Set(rows.map((r) => r.line))].sort((a, b) => a - b), [rows]);

  if (!rows.length) return <p className="sl-fail">Nothing matches these filters.</p>;

  const cw = 16, ch = 18, mt = 22, LW = 56;
  const W = Math.max((width || 600) - LW, dates.length * cw, 200);
  const H = mt + lines.length * ch + 4;
  const x = scaleBand<string>().domain(dates).range([0, W]).paddingInner(0.1);
  const y = scaleBand<number>().domain(lines).range([mt, mt + lines.length * ch]).paddingInner(0.14);
  const shown: string[] = [];
  let lastX = -99;
  dates.forEach((d, i) => {
    if (i !== 0 && toDate(d).getUTCDay() !== 1) return;
    const px = x(d) ?? 0;
    if (px - lastX >= 44 && px + 44 <= W) { shown.push(d); lastX = px; }
  });

  return (
    <div className="sl-chart" ref={boxRef}>
      <div className="sl-gwrap" ref={wrapRef}>
        <svg width={LW} height={H} aria-hidden="true">
          {lines.map((l) => <text key={l} x={0} y={(y(l) ?? 0) + y.bandwidth() / 2} dy="0.35em">Line {l}</text>)}
        </svg>
        <div className="sl-scroll" onScroll={hide}>
          <svg width={W} height={H} role="img" aria-label={`Planned efficiency for ${lines.length} lines over ${dates.length} working days`}>
            {shown.map((d) => <text key={d} x={x(d)} y={14}>{fd(d)}</text>)}
            {rows.map((r) => {
              const idle = r.planMin === 0;
              const over = (r.eff ?? 0) > 1;
              const fill = idle ? 'var(--cds-chart-grid)' : over ? 'var(--cds-chart-status-critical)' : COLORS[0];
              const opacity = idle ? 0.6 : over ? 1 : 0.22 + 0.78 * Math.min(1, r.eff ?? 0);
              const lines2 = [
                idle ? 'Nothing planned' : `Planned efficiency ${pct(r.eff ?? 0)}`,
                `${int(r.planQty)} pcs · ${int(r.planMin)} of ${int(r.availMin)} min`,
                `${r.mp} operators × ${r.wh} h${r.nptMin ? ` · NPT ${r.nptMin} min` : ''}`
              ];
              const title = `Line ${r.line} · ${fd(r.date)}`;
              return (
                <rect key={r.key} x={x(r.date)} y={y(r.line)} width={x.bandwidth()} height={y.bandwidth()} rx={2}
                  style={{ fill, fillOpacity: opacity, cursor: 'pointer' }}
                  onPointerMove={(e) => show(e, title, lines2)} onClick={(e) => show(e, title, lines2)} onPointerLeave={hide} />
              );
            })}
          </svg>
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}
