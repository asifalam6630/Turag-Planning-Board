import { useLayoutEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { bisectLeft, bisectRight, group, sum, utcDay, utcDays, utcFormat } from 'd3';
import type { BoardState, Filters, PlanRow, PoView } from '../types';
import { matchesFilters } from '../lib/calcs';
import { COLORS, fd, fdLong, int, statusColor, toDate, todayIso } from '../lib/format';
import { useTooltip } from '../hooks';
import type { PlanCardTipData } from '../hooks';
import { Tooltip } from './Tooltip';

interface Props {
  plan: PlanRow[];
  pv: Map<string, PoView>;
  calendar: string[];     // sorted working days
  lines: number[];        // all lines, in order
  filters: Filters;
  board: BoardState;
  onCardClick?: (r: PlanRow) => void;
  onOpenLineAllocation?: () => void;
}

interface Card {
  r: PlanRow;
  x: number;
  w: number;
  lane: number;
  cutL: boolean;
  cutR: boolean;
  days: number;
}

const byPsd = (a: PlanRow, b: PlanRow) => ((a.psd ?? '') < (b.psd ?? '') ? -1 : (a.psd ?? '') > (b.psd ?? '') ? 1 : 0);

export function PlanningBoard({ plan, pv, calendar, lines, filters, board, onCardClick, onOpenLineAllocation }: Props) {
  const { boxRef, tip, show, hide } = useTooltip<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cornerRef = useRef<HTMLDivElement>(null);
  const leftIdx = useRef<number | null>(null);
  const lastTodayTick = useRef(-1);
  const todayS = todayIso();

  const model = useMemo(() => {
    const all = plan.filter((r) => r.psd && r.ped);
    const runOf = (r: PlanRow) => ((r.ped ?? '') < todayS ? 'Finished' : (r.psd ?? '') > todayS ? 'Not started' : 'Running');
    const q = board.q.trim().toLowerCase();
    const shown = all.filter((r) => matchesFilters(r, filters)
      && (board.run === 'All' || runOf(r) === board.run)
      && (!q || [r.style, r.po, r.buyer, r.color].some((v) => String(v ?? '').toLowerCase().includes(q))));

    // Working-day columns
    const minPsd = all.reduce<string | null>((m, r) => (!m || (r.psd as string) < m ? (r.psd as string) : m), null) ?? todayS;
    const maxPed = all.reduce<string | null>((m, r) => (!m || (r.ped as string) > m ? (r.ped as string) : m), null) ?? todayS;
    let lo = board.from ?? (minPsd < todayS ? minPsd : todayS);
    let hi = board.to ?? (maxPed > todayS ? maxPed : todayS);
    if (hi < lo) [lo, hi] = [hi, lo];
    let days = calendar.filter((d) => d >= lo && d <= hi);
    if (!board.to) days = days.concat(calendar.filter((d) => d > hi).slice(0, 3));
    if (days.length < 2) days = utcDays(toDate(lo), utcDay.offset(toDate(hi), 4)).map((d) => d.toISOString().slice(0, 10));

    // Sequence on each line and colour groups, from the whole plan so they stay put while filtering
    const seq = new Map<string, number>();
    const grp = new Map<string, number>();
    for (const [, rs] of group(all, (r) => r.line)) {
      let g = 0;
      let prev: PlanRow | null = null;
      [...rs].sort(byPsd).forEach((r, i) => {
        if (prev && (prev.style !== r.style || prev.buyer !== r.buyer)) g++;
        seq.set(r.id, i + 1);
        grp.set(r.id, g);
        prev = r;
      });
    }
    return { all, shown, days, seq, grp, runOf };
  }, [plan, filters, board.q, board.run, board.from, board.to, calendar, todayS]);

  const { days, seq, grp, runOf } = model;
  const n = days.length;
  const px = board.px;
  const W = n * px;
  const tall = px >= 60;
  const laneH = tall ? 50 : 30;
  const gap = 6;
  const pad = 8;
  const ti = days.indexOf(todayS);
  const buyers = useMemo(() => [...new Set(plan.map((r) => r.buyer))].sort(), [plan]);
  const styles = useMemo(() => [...new Set(plan.map((r) => r.style))].sort(), [plan]);
  const orders = useMemo(() => [...new Set(plan.map((r) => r.po))].sort(), [plan]);
  const late = (r: PlanRow) => (pv.get(r.id)?.devDays ?? 0) > 0;
  const colorOf = (r: PlanRow): string => {
    if (board.color === 'style') return COLORS[styles.indexOf(r.style) % COLORS.length];
    if (board.color === 'order') return COLORS[orders.indexOf(r.po) % COLORS.length];
    if (board.color === 'status') return statusColor(r.status);
    if (board.color === 'buyer') return COLORS[buyers.indexOf(r.buyer) % COLORS.length];
    if (board.color === 'risk') return late(r) ? 'var(--color-bad)' : 'var(--color-ok)';
    return COLORS[(grp.get(r.id) ?? 0) % COLORS.length];
  };
  const workDays = (a: string, b: string) => (calendar.length ? bisectRight(calendar, b) - bisectLeft(calendar, a) : utcDay.count(toDate(a), toDate(b)) + 1);

  // Month bands
  const months: Array<{ key: string; label: string; width: number }> = [];
  const monthFmt = utcFormat(px * 8 > 120 ? '%B %Y' : '%b %y');
  for (let i = 0; i < n;) {
    let j = i;
    while (j < n && days[j].slice(0, 7) === days[i].slice(0, 7)) j++;
    months.push({ key: days[i].slice(0, 7), label: (j - i) * px >= 50 ? monthFmt(toDate(days[i])).toUpperCase() : '', width: (j - i) * px });
    i = j;
  }
  const weekday = utcFormat('%a');

  const visibleLines = lines.filter((l) => filters.line === 'All' || String(l) === filters.line);
  const byLine = group(model.shown, (r) => r.line);
  const narrowed = !!board.q.trim() || board.run !== 'All' || filters.buyer !== 'All' || filters.status !== 'All';

  // Keep the reader's place; jump to today on first load or when asked
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const lw = cornerRef.current?.offsetWidth ?? 0;
    if (lastTodayTick.current !== board.todayTick && ti >= 0) {
      el.scrollLeft = Math.max(0, ti * px - (el.clientWidth - lw) / 3);
      lastTodayTick.current = board.todayTick;
    } else if (leftIdx.current != null) {
      el.scrollLeft = leftIdx.current * px;
    }
    leftIdx.current = el.scrollLeft / px;
  }, [px, board.todayTick, ti, n]);

  const cardDataFor = (r: PlanRow, wd: number): PlanCardTipData => {
    const pcsPerDay = Math.round((r.planQty ?? 0) / Math.max(1, wd));
    return {
      line: r.line,
      badge: r.status || 'Plan',
      buyer: r.buyer || '—',
      style: r.style || '—',
      po: r.po || '—',
      psdText: r.running ? 'Running' : fdLong(r.psd),
      pedText: fdLong(r.ped),
      durationText: `${wd} Days`,
      planQtyText: `${int(r.planQty ?? 0)} pcs`,
      status: r.status || 'Plan',
      reqOutputText: `${int(r.reqPerDay ?? pcsPerDay)} pcs/day`,
      updatedEtdText: fdLong(r.updEtd || r.poEtd),
    };
  };

  const tipFor = (r: PlanRow, wd: number): [string, string[]] => {
    const v = pv.get(r.id);
    const dd = v?.devDays ?? null;
    return [
      `Line ${r.line} · #${seq.get(r.id)} · ${r.buyer} · Style ${r.style}`,
      [
        `PO ${r.po}${r.color ? ' · ' + r.color : ''}${r.product ? ' · ' + r.product : ''}`,
        `${int(r.planQty ?? 0)} pcs · SMV ${r.smv ?? '—'} · ${int(Math.round((r.planQty ?? 0) / Math.max(1, wd)))} pcs/day`,
        v && v.sewn ? `Sewn ${int(v.sewn)} · balance ${int(v.sewBal)} pcs` : '',
        `Sewing ${r.running ? 'running' : fd(r.psd)} to ${fd(r.ped)} · ${wd} working days · ${runOf(r)}`,
        `Plan ETD ${fd(r.planEtd)} · Updated ETD ${fd(r.updEtd)}`,
        dd == null ? '' : dd > 0 ? `Ships ${dd} days after the updated ETD` : `${-dd} days ahead of the updated ETD`,
        `Present status: ${r.status}${r.remarks ? ' · ' + r.remarks : ''}`
      ]
    ];
  };

  return (
    <div className="pb-board" ref={boxRef}>
      <div className="pb-scroll" ref={scrollRef} onScroll={(e) => { leftIdx.current = e.currentTarget.scrollLeft / px; hide(); }}>
        <div className="pb-grid" style={{ width: `calc(var(--lw) + ${W}px)` }}>
          <div className="pb-head">
            <div className="pb-corner" ref={cornerRef}>
              <div className="t">SEWING LINES<span className="c">{visibleLines.length} lines</span></div>
              <div className="s">{board.multi ? 'Parallel tracks' : 'Single track'}</div>
              {/* Line Allocation Button in downside */}
              {onOpenLineAllocation && (
                <button
                  type="button"
                  onClick={onOpenLineAllocation}
                  className="mt-0.5 flex items-center justify-between gap-1.5 px-2 py-1 text-[11px] font-bold rounded-md bg-[var(--color-bg)] text-[var(--color-fg)] hover:opacity-90 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer shadow-xs border border-[color-mix(in_srgb,var(--color-bg)_35%,transparent)]"
                  title="Open Line Allocation Workspace"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs">🔄</span>
                    <span>Line Allocation</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-[var(--color-panel)] text-[var(--color-fg-muted)] border border-[var(--color-border-line)]">
                    {visibleLines.length} Lines
                  </span>
                </button>
              )}
            </div>
            <div className="pb-cols" style={{ width: W }}>
              <div className="pb-months">
                {months.map((m) => <div key={m.key} className="pb-month" style={{ width: m.width }}>{m.label}</div>)}
              </div>
              <div className="pb-days">
                {days.map((d, i) => (
                  <div key={d} className={'pb-day' + (i === ti ? ' is-today' : '')} style={{ width: px }}>
                    {i === ti && px >= 40 && <span className="pb-pill">TODAY</span>}
                    <span>{d.slice(8, 10)}</span>
                    <small>{px >= 34 ? weekday(toDate(d)) : weekday(toDate(d)).slice(0, 1)}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {visibleLines.map((l) => {
            const rs = [...(byLine.get(l) ?? [])].sort(byPsd);
            const cards: Card[] = [];
            for (const r of rs) {
              const s = bisectLeft(days, r.psd as string);
              const e = bisectRight(days, r.ped as string) - 1;
              if (e < 0 || s >= n || e < s) continue;
              cards.push({ r, x: s * px + 2, w: Math.max(8, (e - s + 1) * px - 4), lane: 0, cutL: (r.psd as string) < days[0], cutR: (r.ped as string) > days[n - 1], days: workDays(r.psd as string, r.ped as string) });
            }
            const ends: number[] = [];
            for (const c of cards) {
              if (!board.multi) { c.lane = 0; ends[0] = 0; continue; }
              let k = ends.findIndex((end) => end <= c.x - 1);
              if (k < 0) { k = ends.length; ends.push(0); }
              ends[k] = c.x + c.w;
              c.lane = k;
            }
            const nl = Math.max(1, ends.length);
            const h = pad * 2 + nl * laneH + (nl - 1) * gap;
            const total = sum(rs, (r) => r.planQty ?? 0);

            return (
              <div className="pb-row" key={l}>
                <div className="pb-left">
                  <div className="pb-lt">
                    <span className="pb-lnum">{l}</span>
                    <span>Line {l}</span>
                    <span className="pb-badge">{rs.length} {rs.length === 1 ? 'order' : 'orders'}</span>
                  </div>
                  <div className="pb-kv"><span>Total planned</span><b>{int(total)} pcs</b></div>
                  {board.multi && cards.length > 0 && (
                    <div className="pb-tracks"><span>Parallel tracks</span><b>{nl} active {nl === 1 ? 'lane' : 'lanes'}</b></div>
                  )}
                </div>
                <div className="pb-lane" style={{ width: W, height: h, backgroundSize: `${px}px 100%` }}>
                  {ti >= 0 && <div className="pb-todaycol" style={{ left: ti * px, width: px }} />}
                  {ti >= 0 && <div className="pb-todayline" style={{ left: ti * px + px / 2 }} />}
                  {!cards.length && (
                    <span className="pb-empty">{rs.length ? 'No POs in this date range' : narrowed ? 'No POs match these filters' : 'No POs loaded'}</span>
                  )}
                  {cards.map((c) => {
                    const r = c.r;
                    const style = { '--c': colorOf(r), left: c.x, width: c.w, top: pad + c.lane * (laneH + gap), height: laneH } as CSSProperties;
                    const [title, tipLines] = tipFor(r, c.days);
                    const cardTip = cardDataFor(r, c.days);
                    return (
                      <div key={r.id} className="pb-card group/card" style={style} tabIndex={0} role="button"
                        aria-label={`Line ${l}, ${r.buyer} style ${r.style}, PO ${r.po}, ${int(r.planQty ?? 0)} pieces, ${fd(r.psd)} to ${fd(r.ped)}. Click to split line.`}
                        onPointerMove={(e) => show(e, title, tipLines, cardTip)}
                        onClick={(e) => {
                          e.stopPropagation();
                          hide();
                          if (onCardClick) onCardClick(r);
                        }}
                        onFocus={(e) => show(e, title, tipLines, cardTip)} onPointerLeave={hide} onBlur={hide}>
                        <div className="pb-r">
                          {c.cutL && <span className="pb-dim">◂</span>}
                          <span className="pb-chip pb-n">#{seq.get(r.id)}</span>
                          {r.isSplit && (
                            <span className="pb-chip font-bold text-[10px] bg-[var(--series-4)] text-white border-[var(--series-4)]">
                              ✂ {r.splitPart ? `P${r.splitPart}` : 'Split'}
                            </span>
                          )}
                          {tall && <span className="pb-chip">{r.buyer}</span>}
                          <span className="pb-chip">{tall ? `Style: ${r.style}` : r.style}</span>
                          {tall && r.running && <span className="pb-chip pb-run">RUNNING</span>}
                          <span className="pb-sp" />
                          {late(r) && <span className="pb-late" title="Plan ETD after updated ETD" />}
                          <span className="pb-chip pb-qty">{int(r.planQty ?? 0)} pcs</span>
                          {c.cutR && <span className="pb-dim">▸</span>}
                        </div>
                        {tall && (
                          <div className="pb-r">
                            <span className="pb-chip">PO: {r.po}</span>
                            <span className="pb-sp" />
                            <span className="pb-chip pb-start">{r.running ? 'Running' : fd(r.psd)}</span>
                            <span className="pb-dim">→</span>
                            <span className="pb-chip pb-end">{fd(r.ped)}</span>
                            <span className="pb-dim">({c.days}d)</span>
                            <span className="pb-chip pb-rate">{int(Math.round((r.planQty ?? 0) / Math.max(1, c.days)))} pcs/d</span>
                            <span
                              className="pb-chip font-bold hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] transition-colors ml-1 cursor-pointer"
                              title="Click to split this order across two lines"
                            >
                              ✂ Split
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

export function BoardLegend({ plan, mode }: { plan: PlanRow[]; mode: BoardState['color'] }) {
  if (mode === 'style') {
    const styles = [...new Set(plan.map((r) => r.style))].sort();
    return (
      <div className="sl-legend">
        {styles.slice(0, 14).map((st, i) => (
          <span key={st}>
            <i style={{ background: COLORS[i % COLORS.length] }} />Style {st}
          </span>
        ))}
        {styles.length > 14 && <span className="text-[var(--color-fg-muted)]">+{styles.length - 14} more styles</span>}
      </div>
    );
  }
  if (mode === 'order') {
    const orders = [...new Set(plan.map((r) => r.po))].sort();
    return (
      <div className="sl-legend">
        {orders.slice(0, 14).map((po, i) => (
          <span key={po}>
            <i style={{ background: COLORS[i % COLORS.length] }} />PO {po}
          </span>
        ))}
        {orders.length > 14 && <span className="text-[var(--color-fg-muted)]">+{orders.length - 14} more POs</span>}
      </div>
    );
  }
  if (mode === 'status') {
    return <div className="sl-legend">{[...new Set(plan.map((r) => r.status))].map((s) => <span key={s}><i style={{ background: statusColor(s) }} />{s}</span>)}</div>;
  }
  if (mode === 'buyer') {
    return <div className="sl-legend">{[...new Set(plan.map((r) => r.buyer))].sort().map((b, i) => <span key={b}><i style={{ background: COLORS[i % COLORS.length] }} />{b}</span>)}</div>;
  }
  if (mode === 'risk') {
    return (
      <div className="sl-legend">
        <span><i style={{ background: 'var(--color-bad)' }} />Plan ETD after updated ETD</span>
        <span><i style={{ background: 'var(--color-ok)' }} />Plan ETD on or before updated ETD</span>
      </div>
    );
  }
  return null;
}
