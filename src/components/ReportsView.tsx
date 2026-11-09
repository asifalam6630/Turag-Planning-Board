import { useMemo, useState } from 'react';
import type { LineLoad, LineSummary, OrderRow, PlanRow } from '../types';
import { fdLong, int, usd } from '../lib/format';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
  orders: OrderRow[];
  plan: PlanRow[];
  summary: LineSummary[];
  load: LineLoad[];
}

type ReportType = 'order-summary' | 'line-allocation' | 'capacity-utilization' | 'monthly-plan';

export function ReportsView({ orders, plan, summary, load }: ReportsViewProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('order-summary');
  const [buyerFilter, setBuyerFilter] = useState('All');

  const buyers = useMemo(() => ['All', ...new Set(orders.map((r) => r.buyer))].sort(), [orders]);

  const filteredOrders = useMemo(() => {
    if (buyerFilter === 'All') return orders;
    return orders.filter((o) => o.buyer === buyerFilter);
  }, [orders, buyerFilter]);

  const filteredPlan = useMemo(() => {
    if (buyerFilter === 'All') return plan;
    return plan.filter((p) => p.buyer === buyerFilter);
  }, [plan, buyerFilter]);

  const exportExcelReport = () => {
    const wb = XLSX.utils.book_new();

    if (selectedReport === 'order-summary') {
      const rows = filteredOrders.map((o, idx) => ({
        'SL': idx + 1,
        'Buyer': o.buyer,
        'PO Number': o.po,
        'Style': o.style,
        'Category': o.category || '—',
        'Order Qty (Pcs)': o.orderQty,
        'SMV': o.smv ?? 0,
        'Produce Mins': Math.round((o.smv ?? 0) * o.orderQty),
        'FOB ($)': o.fob ?? 0,
        'FOB Value ($)': Math.round((o.fob ?? 0) * o.orderQty),
        'CM ($)': o.cm ?? 0,
        'CM Value ($)': Math.round((o.cm ?? 0) * o.orderQty),
        'PO ETD': fdLong(o.poEtd),
        'Updated ETD': fdLong(o.updEtd),
        'Status': o.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Order Summary');
      XLSX.writeFile(wb, `Turag_Order_Summary_Report.xlsx`);
    } else if (selectedReport === 'line-allocation') {
      const rows = filteredPlan.map((p, idx) => ({
        'SL': idx + 1,
        'Line No': p.line,
        'PO Number': p.po,
        'Buyer': p.buyer,
        'Style': p.style,
        'Plan Qty (Pcs)': p.planQty ?? 0,
        'SMV': p.smv ?? 0,
        'PSD (Start)': fdLong(p.psd),
        'PED (End)': fdLong(p.ped),
        'Plan ETD': fdLong(p.planEtd),
        'Updated ETD': fdLong(p.updEtd),
        'Status': p.status,
        'Split Allocation': p.isSplit ? `Part ${p.splitPart || 1}` : 'Single',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Line Allocation');
      XLSX.writeFile(wb, `Turag_Line_Allocation_Report.xlsx`);
    } else if (selectedReport === 'capacity-utilization') {
      const rows = summary.map((s, idx) => ({
        'SL': idx + 1,
        'Line No': s.line,
        'Loaded POs': s.pos,
        'Total Planned Qty': s.planQty,
        'Produce Minutes': s.planMin,
        'Sewing Start': fdLong(s.start),
        'Sewing End': fdLong(s.end),
        'Free From': fdLong(s.freeFrom),
        'Planned Efficiency (%)': s.eff ? `${Math.round(s.eff * 100)}%` : '—',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Capacity Utilization');
      XLSX.writeFile(wb, `Turag_Capacity_Utilization_Report.xlsx`);
    } else {
      // Monthly plan
      const rows = filteredPlan.map((p, idx) => ({
        'SL': idx + 1,
        'Line': p.line,
        'PO': p.po,
        'Buyer': p.buyer,
        'Style': p.style,
        'Quantity': p.planQty ?? 0,
        'Sewing Window': `${fdLong(p.psd)} to ${fdLong(p.ped)}`,
        'ETD': fdLong(p.updEtd),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Schedule');
      XLSX.writeFile(wb, `Turag_Monthly_Production_Plan.xlsx`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Executive Reporting &amp; Data Export</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Generate printable PDF reports and download standardized Excel spreadsheets for line allocation, order summaries, and capacity audits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-border-line)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🖨️ Print / PDF Preview</span>
          </button>
          <button
            type="button"
            onClick={exportExcelReport}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>📥 Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'order-summary', label: '1. Order Summary Report' },
            { id: 'line-allocation', label: '2. Line Allocation Report' },
            { id: 'capacity-utilization', label: '3. Capacity Utilization Matrix' },
            { id: 'monthly-plan', label: '4. Monthly Production Plan' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedReport(r.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                selectedReport === r.id
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)] shadow-xs'
                  : 'bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label className="text-[var(--color-fg-muted)]">Buyer Filter:</label>
          <select
            value={buyerFilter}
            onChange={(e) => setBuyerFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
          >
            {buyers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Report Sheet Layout */}
      <div className="p-6 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-bg)] shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Report Header */}
        <div className="border-b border-[var(--color-border-line)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-[var(--color-fg-muted)] font-bold">
              TURAG GARMENTS &amp; HOSIERY MILLS LTD.
            </div>
            <h3 className="text-lg font-bold">
              {selectedReport === 'order-summary' && 'Master Order Summary Report'}
              {selectedReport === 'line-allocation' && 'Sewing Line Allocation & Scheduling Report'}
              {selectedReport === 'capacity-utilization' && 'Line Capacity & Planned Efficiency Utilization'}
              {selectedReport === 'monthly-plan' && 'Monthly Production Plan Master Schedule'}
            </h3>
            <span className="text-xs text-[var(--color-fg-muted)]">
              Scope: {buyerFilter === 'All' ? 'All Registered Buyers' : `Buyer: ${buyerFilter}`} · Generated on {new Date().toLocaleDateString()}
            </span>
          </div>

          <div className="text-right text-xs">
            <span className="font-bold block text-sm">ERP Production Planning System</span>
            <span className="text-[var(--color-ok)] font-semibold">Official Export Document</span>
          </div>
        </div>

        {/* Report 1: Order Summary */}
        {selectedReport === 'order-summary' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2.5 font-semibold">SL</th>
                  <th className="p-2.5 font-semibold">PO #</th>
                  <th className="p-2.5 font-semibold">Buyer</th>
                  <th className="p-2.5 font-semibold">Style</th>
                  <th className="p-2.5 font-semibold text-right">Order Qty</th>
                  <th className="p-2.5 font-semibold text-right">SMV</th>
                  <th className="p-2.5 font-semibold text-right">FOB ($)</th>
                  <th className="p-2.5 font-semibold text-right">FOB Value</th>
                  <th className="p-2.5 font-semibold">Updated ETD</th>
                  <th className="p-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {filteredOrders.map((o, i) => (
                  <tr key={o.id} className="hover:bg-[var(--color-panel)]/40">
                    <td className="p-2.5 text-[var(--color-fg-muted)]">{i + 1}</td>
                    <td className="p-2.5 font-bold text-sky-500">{o.po}</td>
                    <td className="p-2.5 font-medium">{o.buyer}</td>
                    <td className="p-2.5 font-semibold">{o.style}</td>
                    <td className="p-2.5 text-right font-bold">{int(o.orderQty)}</td>
                    <td className="p-2.5 text-right">{o.smv ?? '—'}</td>
                    <td className="p-2.5 text-right">${o.fob ? o.fob.toFixed(2) : '—'}</td>
                    <td className="p-2.5 text-right font-bold">{usd((o.fob ?? 0) * o.orderQty)}</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(o.updEtd || o.poEtd)}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 2: Line Allocation */}
        {selectedReport === 'line-allocation' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2.5 font-semibold">Line</th>
                  <th className="p-2.5 font-semibold">PO #</th>
                  <th className="p-2.5 font-semibold">Buyer</th>
                  <th className="p-2.5 font-semibold">Style</th>
                  <th className="p-2.5 font-semibold text-right">Plan Qty</th>
                  <th className="p-2.5 font-semibold">Sewing Start (PSD)</th>
                  <th className="p-2.5 font-semibold">Sewing End (PED)</th>
                  <th className="p-2.5 font-semibold">Plan ETD</th>
                  <th className="p-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {filteredPlan.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-panel)]/40">
                    <td className="p-2.5 font-bold">Line {p.line}</td>
                    <td className="p-2.5 font-bold text-sky-500">{p.po}</td>
                    <td className="p-2.5">{p.buyer}</td>
                    <td className="p-2.5 font-semibold">{p.style}</td>
                    <td className="p-2.5 text-right font-bold">{int(p.planQty ?? 0)}</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(p.psd)}</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(p.ped)}</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(p.planEtd)}</td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 3: Capacity Utilization */}
        {selectedReport === 'capacity-utilization' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2.5 font-semibold">Line #</th>
                  <th className="p-2.5 font-semibold text-right">Loaded Orders</th>
                  <th className="p-2.5 font-semibold text-right">Total Planned Pcs</th>
                  <th className="p-2.5 font-semibold text-right">Produce Minutes</th>
                  <th className="p-2.5 font-semibold">First Start</th>
                  <th className="p-2.5 font-semibold">Last End</th>
                  <th className="p-2.5 font-semibold">Free From Date</th>
                  <th className="p-2.5 font-semibold text-right">Planned Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {summary.map((s) => (
                  <tr key={s.line} className="hover:bg-[var(--color-panel)]/40">
                    <td className="p-2.5 font-bold">Line {s.line}</td>
                    <td className="p-2.5 text-right font-medium">{s.pos} POs</td>
                    <td className="p-2.5 text-right font-bold">{int(s.planQty)} pcs</td>
                    <td className="p-2.5 text-right">{int(s.planMin)} min</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(s.start)}</td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(s.end)}</td>
                    <td className="p-2.5 whitespace-nowrap font-bold text-sky-500">{fdLong(s.freeFrom)}</td>
                    <td className="p-2.5 text-right font-bold text-[var(--color-ok)]">
                      {s.eff ? `${Math.round(s.eff * 100)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Report 4: Monthly Plan */}
        {selectedReport === 'monthly-plan' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2.5 font-semibold">Line</th>
                  <th className="p-2.5 font-semibold">PO #</th>
                  <th className="p-2.5 font-semibold">Buyer</th>
                  <th className="p-2.5 font-semibold">Style</th>
                  <th className="p-2.5 font-semibold text-right">Batch Quantity</th>
                  <th className="p-2.5 font-semibold">Scheduled Sewing Run</th>
                  <th className="p-2.5 font-semibold">Shipment ETD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {filteredPlan.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--color-panel)]/40">
                    <td className="p-2.5 font-bold">Line {p.line}</td>
                    <td className="p-2.5 font-bold text-sky-500">{p.po}</td>
                    <td className="p-2.5">{p.buyer}</td>
                    <td className="p-2.5 font-semibold">{p.style}</td>
                    <td className="p-2.5 text-right font-bold">{int(p.planQty ?? 0)}</td>
                    <td className="p-2.5 whitespace-nowrap">
                      {fdLong(p.psd)} to {fdLong(p.ped)}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">{fdLong(p.updEtd || p.poEtd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
