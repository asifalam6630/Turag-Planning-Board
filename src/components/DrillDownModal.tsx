import { useState } from 'react';
import type { PlanRow } from '../types';
import { fd, int, usd } from '../lib/format';
import * as XLSX from 'xlsx';

interface Props {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  records: PlanRow[];
  onClose: () => void;
  onCardClick?: (r: PlanRow) => void;
}

export function DrillDownModal({ isOpen, title, subtitle, records, onClose, onCardClick }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  if (!isOpen) return null;

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchQ = !q || [r.buyer, r.style, r.po, String(r.line), r.color, r.status]
      .some((v) => String(v ?? '').toLowerCase().includes(q));
    const matchStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchQ && matchStatus;
  });

  const totalQty = filtered.reduce((acc, r) => acc + (r.planQty ?? 0), 0);
  const totalMin = filtered.reduce((acc, r) => acc + (r.planQty ?? 0) * (r.smv ?? 0), 0);
  const totalFob = filtered.reduce((acc, r) => acc + (r.planQty ?? 0) * (r.fob ?? 0), 0);
  const lateCount = filtered.filter((r) => r.planEtd && r.updEtd && r.planEtd > r.updEtd).length;

  const exportToExcel = () => {
    const data = filtered.map((r) => ({
      'Line': r.line,
      'Buyer': r.buyer,
      'Style': r.style,
      'PO Number': r.po,
      'Color/Combo': r.color || r.combo || '—',
      'Plan Qty (Pcs)': r.planQty ?? 0,
      'SMV': r.smv ?? 0,
      'Produce Minutes': (r.planQty ?? 0) * (r.smv ?? 0),
      'FOB ($)': r.fob ?? 0,
      'PSD (Start)': r.psd || '—',
      'PED (End)': r.ped || '—',
      'Updated ETD': r.updEtd || '—',
      'Plan ETD': r.planEtd || '—',
      'Status': r.status,
      'Late Ship': r.planEtd && r.updEtd && r.planEtd > r.updEtd ? 'YES' : 'NO',
      'Remarks': r.remarks || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Source Records');
    XLSX.writeFile(wb, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_records.xlsx`);
  };

  const statuses = [...new Set(records.map((r) => r.status))].sort();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-[var(--color-bg)] text-[var(--color-fg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-5 my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-line)] pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">
                Drill-Down Details
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
            </div>
            {subtitle && <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Aggregated Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border-line)] mb-3 text-xs">
          <div>
            <span className="text-[var(--color-fg-muted)] block">Filtered Orders:</span>
            <span className="font-bold text-sm text-[var(--color-fg)]">{filtered.length} POs</span>
          </div>
          <div>
            <span className="text-[var(--color-fg-muted)] block">Total Plan Quantity:</span>
            <span className="font-bold text-sm text-[var(--color-fg)]">{int(totalQty)} pcs</span>
          </div>
          <div>
            <span className="text-[var(--color-fg-muted)] block">Produce Minutes:</span>
            <span className="font-bold text-sm text-[var(--color-fg)]">{int(Math.round(totalMin))} min</span>
          </div>
          <div>
            <span className="text-[var(--color-fg-muted)] block">Value & Risk:</span>
            <span className="font-bold text-sm text-[var(--color-fg)]">{usd(totalFob)}</span>
            {lateCount > 0 && (
              <span className="text-xs font-semibold text-rose-500 block">
                {lateCount} POs at risk of delay
              </span>
            )}
          </div>
        </div>

        {/* Search, Filter & Export Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <input
              type="search"
              placeholder="Filter by PO, style, buyer, line..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] flex-1 min-w-[180px]"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="dash-select text-xs py-1.5"
            >
              <option value="All">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-700 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
          >
            <span>📥 Export to Excel</span>
          </button>
        </div>

        {/* Table View */}
        <div className="flex-1 overflow-auto border border-[var(--color-border-line)] rounded-lg min-h-[240px]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-panel)] sticky top-0 border-b border-[var(--color-border-line)] z-10">
              <tr>
                <th className="p-2 text-left">Line</th>
                <th className="p-2 text-left">Buyer</th>
                <th className="p-2 text-left">Style</th>
                <th className="p-2 text-left">PO No.</th>
                <th className="p-2 text-right">Plan Qty</th>
                <th className="p-2 text-right">SMV</th>
                <th className="p-2 text-left">Sewing (PSD → PED)</th>
                <th className="p-2 text-left">Updated ETD</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-[var(--color-fg-muted)]">
                    No matching source records found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const isLate = r.planEtd && r.updEtd && r.planEtd > r.updEtd;
                  return (
                    <tr key={r.id} className="hover:bg-[var(--color-panel)]/60 transition-colors">
                      <td className="p-2 font-bold text-sky-600 dark:text-sky-400">Line {r.line}</td>
                      <td className="p-2 font-semibold">{r.buyer}</td>
                      <td className="p-2">{r.style}</td>
                      <td className="p-2 font-mono">{r.po}</td>
                      <td className="p-2 text-right font-semibold">{int(r.planQty ?? 0)}</td>
                      <td className="p-2 text-right">{r.smv ?? '—'}</td>
                      <td className="p-2">{fd(r.psd)} → {fd(r.ped)}</td>
                      <td className="p-2">
                        <span className={isLate ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                          {fd(r.updEtd)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onCardClick?.(r);
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold rounded bg-sky-700 text-white hover:bg-sky-600 cursor-pointer"
                          title="Open Split / Line Reassignment"
                        >
                          Split / Assign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-border-line)] text-xs text-[var(--color-fg-muted)]">
          <span>Showing {filtered.length} of {records.length} records</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-border-line)] font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
