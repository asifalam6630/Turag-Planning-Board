import type {
  BookStatus, CapRow, DailyRow, Filters, LineLoad, LineSummary, OrderRow, PlanRow, PoView, ScopeKpi
} from '../types';
import { daysBetween } from './csv';

/** Per PO: sewn, balance, ETD gap, minutes and value. */
export function poView(plan: PlanRow[]): Map<string, PoView> {
  const out = new Map<string, PoView>();
  for (const r of plan) {
    const qty = r.planQty ?? 0;
    const sewn = r.sewQty ?? r.producedBefore ?? 0;
    out.set(r.id, {
      id: r.id,
      sewn,
      sewBal: Math.max(0, qty - sewn),
      devDays: r.planEtd && r.updEtd ? daysBetween(r.updEtd, r.planEtd) : null,
      planMin: Math.round(qty * (r.smv ?? 0)),
      fobValue: Math.round(qty * (r.fob ?? 0)),
      cmValue: Math.round(qty * (r.cm ?? 0))
    });
  }
  return out;
}

export function matchesFilters(r: { line: number; buyer: string; status: string }, f: Filters): boolean {
  return (f.line === 'All' || String(r.line) === f.line)
    && (f.buyer === 'All' || r.buyer === f.buyer)
    && (f.status === 'All' || r.status === f.status);
}

/** Headline totals for the POs that pass the filters. */
export function scopeKpi(plan: PlanRow[], pv: Map<string, PoView>, f: Filters): ScopeKpi {
  const rs = plan.filter((r) => matchesFilters(r, f));
  const sum = (fn: (r: PlanRow) => number | null | undefined) => rs.reduce((a, r) => a + (fn(r) ?? 0), 0);
  const peds = rs.map((r) => r.ped).filter((d): d is string => !!d).sort();
  return {
    pos: rs.length,
    lines: new Set(rs.map((r) => r.line)).size,
    planQty: sum((r) => r.planQty),
    sewn: sum((r) => pv.get(r.id)?.sewn),
    sewBal: sum((r) => pv.get(r.id)?.sewBal),
    planMin: sum((r) => pv.get(r.id)?.planMin),
    fobValue: sum((r) => pv.get(r.id)?.fobValue),
    cmValue: sum((r) => pv.get(r.id)?.cmValue),
    late: rs.filter((r) => (pv.get(r.id)?.devDays ?? 0) > 0).length,
    lastPed: peds.length ? peds[peds.length - 1] : null
  };
}

/** For each line and working day in the plan horizon: capacity vs planned minutes. */
export function lineLoad(plan: PlanRow[], daily: DailyRow[], manpower: CapRow[], hours: CapRow[], npt: CapRow[]): LineLoad[] {
  if (!daily.length) return [];
  const smv = new Map(plan.map((r) => [r.id, r.smv ?? 0]));
  const key = (line: number, date: string) => `${line}|${date}`;
  const load = new Map<string, { q: number; m: number }>();
  for (const r of daily) {
    const k = key(r.line, r.date);
    const o = load.get(k) ?? { q: 0, m: 0 };
    o.q += r.qty;
    o.m += r.qty * (smv.get(r.id) ?? 0);
    load.set(k, o);
  }
  const dates = daily.map((r) => r.date).sort();
  const from = dates[0];
  const to = dates[dates.length - 1];
  const hm = new Map(hours.map((r) => [key(r.line, r.date), r.value]));
  const nm = new Map(npt.map((r) => [key(r.line, r.date), r.value]));
  return manpower
    .filter((r) => r.date >= from && r.date <= to)
    .map((r) => {
      const k = key(r.line, r.date);
      const wh = hm.get(k) ?? 0;
      const lost = nm.get(k) ?? 0;
      const o = load.get(k) ?? { q: 0, m: 0 };
      const availMin = Math.max(0, r.value * (wh * 60 - lost));
      return { key: k, line: r.line, date: r.date, mp: r.value, wh, nptMin: lost, availMin, planQty: o.q, planMin: Math.round(o.m), eff: availMin > 0 ? o.m / availMin : null };
    });
}

/** Per line: POs, pieces, first start, last end, next free day, planned efficiency. */
export function lineSummary(plan: PlanRow[], load: LineLoad[]): LineSummary[] {
  const lines = [...new Set([...load.map((r) => r.line), ...plan.map((r) => r.line)])].sort((a, b) => a - b);
  return lines.map((line) => {
    const rs = plan.filter((r) => r.line === line);
    const days = load.filter((r) => r.line === line).sort((a, b) => (a.date < b.date ? -1 : 1));
    const starts = rs.map((r) => r.psd).filter((d): d is string => !!d).sort();
    const ends = rs.map((r) => r.ped).filter((d): d is string => !!d).sort();
    const start = starts[0] ?? null;
    const end = ends[ends.length - 1] ?? null;
    const span = days.filter((r) => start && end && r.date >= start && r.date <= end);
    const pm = span.reduce((a, r) => a + r.planMin, 0);
    const am = span.reduce((a, r) => a + r.availMin, 0);
    const next = end ? days.find((r) => r.date > end) : undefined;
    return {
      line,
      pos: rs.length,
      planQty: rs.reduce((a, r) => a + (r.planQty ?? 0), 0),
      planMin: Math.round(rs.reduce((a, r) => a + (r.planQty ?? 0) * (r.smv ?? 0), 0)),
      start,
      end,
      freeFrom: next ? next.date : null,
      eff: am > 0 ? pm / am : null
    };
  });
}

export function bookStatus(orders: OrderRow[]): BookStatus[] {
  const m = new Map<string, BookStatus>();
  for (const r of orders) {
    const o = m.get(r.status) ?? { status: r.status, orders: 0, orderQty: 0, shipBal: 0 };
    o.orders++;
    o.orderQty += r.orderQty;
    o.shipBal += r.shipBal ?? 0;
    m.set(r.status, o);
  }
  return [...m.values()].sort((a, b) => b.orderQty - a.orderQty);
}

/** Open (not shipped) orders whose PO + colour is not on any line. */
export function unplanned(orders: OrderRow[], plan: PlanRow[]): OrderRow[] {
  const onLine = new Set(plan.map((r) => `${r.po}|${r.color ?? ''}`));
  return orders.filter((r) => !/ship/i.test(r.status) && !onLine.has(`${r.po}|${r.color ?? ''}`));
}

/** Working days from a to b inclusive, using the sorted working-day calendar. */
export function workingDays(cal: string[], a: string, b: string, bisectLeft: (arr: string[], x: string) => number, bisectRight: (arr: string[], x: string) => number): number {
  if (!cal.length) return daysBetween(a, b) + 1;
  return bisectRight(cal, b) - bisectLeft(cal, a);
}
