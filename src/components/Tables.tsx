import { useMemo, useState } from 'react';
import type { BookStatus, Filters, LineSummary, OrderRow, PlanRow, PoView } from '../types';
import { matchesFilters } from '../lib/calcs';
import { fd, int, pct, statusColor } from '../lib/format';

/* ---------- Line status ---------- */
export function LineStatusTable({ rows, filters }: { rows: LineSummary[]; filters: Filters }) {
  const shown = rows.filter((r) => filters.line === 'All' || String(r.line) === filters.line);
  return (
    <div className="sl-tablewrap">
      <table id="line-table">
        <thead>
          <tr>
            <th>Line</th><th className="n">POs</th><th className="n">Plan qty</th><th className="n">Plan minutes</th>
            <th>Start</th><th>End</th><th>Free from</th><th className="n">Planned eff.</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const idle = r.pos === 0;
            return (
              <tr key={r.line} className={idle ? 'sl-idle' : undefined}>
                <td>{r.line}</td>
                <td className="n">{r.pos}</td>
                <td className="n">{int(r.planQty)}</td>
                <td className="n">{int(r.planMin)}</td>
                <td>{fd(r.start)}</td>
                <td>{fd(r.end)}</td>
                <td>{idle ? 'Idle now' : r.freeFrom ? fd(r.freeFrom) : 'After ' + fd(r.end)}</td>
                <td className="n">{r.eff == null ? '—' : pct(r.eff)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- PO plan ---------- */
type SortKey = 'line' | 'buyer' | 'style' | 'po' | 'color' | 'planQty' | 'smv' | 'psd' | 'ped' | 'planEtd' | 'updEtd' | 'devDays' | 'status' | 'remarks';

const PO_COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'line', label: 'Line', numeric: true },
  { key: 'buyer', label: 'Buyer' },
  { key: 'style', label: 'Style' },
  { key: 'po', label: 'PO' },
  { key: 'color', label: 'Color' },
  { key: 'planQty', label: 'Plan qty', numeric: true },
  { key: 'smv', label: 'SMV', numeric: true },
  { key: 'psd', label: 'PSD' },
  { key: 'ped', label: 'PED' },
  { key: 'planEtd', label: 'Plan ETD' },
  { key: 'updEtd', label: 'Updated ETD' },
  { key: 'devDays', label: 'Days late', numeric: true },
  { key: 'status', label: 'Status' },
  { key: 'remarks', label: 'Remarks' }
];

export function PoTable({ plan, pv, filters }: { plan: PlanRow[]; pv: Map<string, PoView>; filters: Filters }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'psd', dir: 1 });
  const rows = useMemo(() => {
    const list = plan.filter((r) => matchesFilters(r, filters)).map((r) => ({ ...r, devDays: pv.get(r.id)?.devDays ?? null }));
    const { key, dir } = sort;
    return list.sort((a, b) => {
      const A = a[key] as unknown;
      const B = b[key] as unknown;
      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      const c = typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B), undefined, { numeric: true });
      return c * dir;
    });
  }, [plan, pv, filters, sort]);

  return (
    <div className="sl-tablewrap">
      <table id="po-table">
        <thead>
          <tr>
            {PO_COLUMNS.map((c) => (
              <th key={c.key} className={c.numeric ? 'n' : undefined}
                aria-sort={sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? (sort.dir === 1 ? -1 : 1) : 1 })}>{c.label}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="n">{r.line}</td>
              <td>{r.buyer}</td>
              <td>{r.style}</td>
              <td>{r.po}</td>
              <td>{r.color ?? ''}</td>
              <td className="n">{r.planQty == null ? '—' : int(r.planQty)}</td>
              <td className="n">{r.smv == null ? '—' : r.smv.toFixed(2)}</td>
              <td>{fd(r.psd)}</td>
              <td>{fd(r.ped)}</td>
              <td>{fd(r.planEtd)}</td>
              <td>{fd(r.updEtd)}</td>
              <td className={'n' + ((r.devDays ?? 0) > 0 ? ' sl-late' : '')}>{r.devDays == null ? '—' : r.devDays}</td>
              <td><span className="sl-chip" style={{ color: statusColor(r.status) }}>{r.status}</span></td>
              <td>{r.remarks ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Order book ---------- */
export function OrderBook({ book, open }: { book: BookStatus[]; open: OrderRow[] }) {
  const max = Math.max(1, ...book.map((r) => r.orderQty));
  return (
    <div className="sl-two">
      <div className="sl-sec" id="book-status">
        <p className="sl-cap">All orders in the ORDER SHEET by present status: order quantity and number of orders.</p>
        <div className="sl-bars">
          {book.map((r) => (
            <div key={r.status} style={{ display: 'contents' }}>
              <span>{r.status}</span>
              <span className="track"><i style={{ width: `${(100 * r.orderQty) / max}%`, background: statusColor(r.status) }} /></span>
              <span className="v">{int(r.orderQty)} pcs · {r.orders} {r.orders === 1 ? 'order' : 'orders'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sl-sec" id="unplanned">
        <p className="sl-cap">Open orders (not shipped) whose PO and color are not on any line yet.</p>
        <div className="sl-tablewrap">
          <table id="unplanned-table">
            <thead>
              <tr><th>Buyer</th><th>Style</th><th>PO</th><th>Color</th><th className="n">Order qty</th><th>Updated ETD</th><th>Status</th></tr>
            </thead>
            <tbody>
              {open.length === 0 && <tr><td colSpan={7}>Every open order is on a line.</td></tr>}
              {open.map((r) => (
                <tr key={r.id}>
                  <td>{r.buyer}</td><td>{r.style}</td><td>{r.po}</td><td>{r.color ?? ''}</td>
                  <td className="n">{int(r.orderQty)}</td><td>{fd(r.updEtd)}</td><td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
