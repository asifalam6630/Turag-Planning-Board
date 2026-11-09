import { useMemo, useState } from 'react';
import type { PlanRow } from '../types';
import { fdLong, int, usd } from '../lib/format';
import * as XLSX from 'xlsx';

interface KpiDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  records: PlanRow[];
  filterContext?: string;
}

export function KpiDrillDownModal({
  isOpen,
  onClose,
  title,
  subtitle,
  records,
  filterContext,
}: KpiDrillDownModalProps) {
  const [search, setSearch] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('All');
  const [lineFilter, setLineFilter] = useState('All');

  const buyers = useMemo(() => ['All', ...new Set(records.map((r) => r.buyer))].sort(), [records]);
  const lines = useMemo(
    () => ['All', ...new Set(records.map((r) => String(r.line)))].sort((a, b) => Number(a) - Number(b)),
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch =
        !q ||
        [r.po, r.style, r.buyer, r.status, r.color, r.product].some((v) =>
          String(v ?? '').toLowerCase().includes(q)
        );
      const matchBuyer = buyerFilter === 'All' || r.buyer === buyerFilter;
      const matchLine = lineFilter === 'All' || String(r.line) === lineFilter;
      return matchSearch && matchBuyer && matchLine;
    });
  }, [records, search, buyerFilter, lineFilter]);

  const summary = useMemo(() => {
    const totalQty = filtered.reduce((acc, r) => acc + (r.planQty ?? 0), 0);
    const totalSewn = filtered.reduce((acc, r) => acc + (r.sewQty ?? 0), 0);
    const totalFob = filtered.reduce((acc, r) => acc + (r.fob ?? 0) * (r.planQty ?? 0), 0);
    const totalProduceMin = filtered.reduce((acc, r) => acc + (r.planQty ?? 0) * (r.smv ?? 0), 0);
    return { totalQty, totalSewn, totalFob, totalProduceMin };
  }, [filtered]);

  const exportToExcel = () => {
    const dataToExport = filtered.map((r, i) => ({
      'SL': i + 1,
      'Line No': r.line,
      'PO Number': r.po,
      'Buyer': r.buyer,
      'Style': r.style,
      'Color / Combo': r.color || r.combo || '—',
      'Plan Qty (Pcs)': r.planQty ?? 0,
      'Sewn Qty': r.sewQty ?? 0,
      'Sewing Balance': (r.planQty ?? 0) - (r.sewQty ?? 0),
      'SMV': r.smv ?? 0,
      'Produce Minutes': (r.planQty ?? 0) * (r.smv ?? 0),
      'FOB ($)': r.fob ?? 0,
      'FOB Value ($)': (r.fob ?? 0) * (r.planQty ?? 0),
      'Sewing Start (PSD)': fdLong(r.psd),
      'Sewing End (PED)': fdLong(r.ped),
      'Plan ETD': fdLong(r.planEtd),
      'Updated ETD': fdLong(r.updEtd),
      'Status': r.status,
      'Remarks': r.remarks || '—',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Source Records');
    XLSX.writeFile(wb, `${title.replace(/[^a-zA-Z0-9]/g, '_')}_Source_Records.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-[var(--color-bg)] text-[var(--color-fg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-line)] bg-[var(--color-panel)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-fg)]" />
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)]">
                {filtered.length} of {records.length} records
              </span>
            </div>
            <p className="text-xs text-[var(--color-fg-muted)] mt-0.5">
              {subtitle} {filterContext && `· Active scope: ${filterContext}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>📊 Export Excel</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Aggregate stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 border-b border-[var(--color-border-line)] bg-[var(--color-bg)] text-xs">
          <div className="p-2 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
            <span className="text-[var(--color-fg-muted)] block text-[11px]">Filtered Quantity</span>
            <span className="text-base font-bold">{int(summary.totalQty)} pcs</span>
          </div>
          <div className="p-2 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
            <span className="text-[var(--color-fg-muted)] block text-[11px]">Total Sewn</span>
            <span className="text-base font-bold text-[var(--color-ok)]">{int(summary.totalSewn)} pcs</span>
          </div>
          <div className="p-2 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
            <span className="text-[var(--color-fg-muted)] block text-[11px]">Produce Minutes</span>
            <span className="text-base font-bold">{int(summary.totalProduceMin)} min</span>
          </div>
          <div className="p-2 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
            <span className="text-[var(--color-fg-muted)] block text-[11px]">FOB Total</span>
            <span className="text-base font-bold">{usd(summary.totalFob)}</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 border-b border-[var(--color-border-line)] bg-[var(--color-panel)]/50">
          <input
            type="search"
            placeholder="Search PO, style, buyer, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
          />
          <div className="flex items-center gap-2">
            <select
              value={buyerFilter}
              onChange={(e) => setBuyerFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
            >
              {buyers.map((b) => (
                <option key={b} value={b}>
                  Buyer: {b}
                </option>
              ))}
            </select>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
            >
              {lines.map((l) => (
                <option key={l} value={l}>
                  Line: {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-5">
          <div className="border border-[var(--color-border-line)] rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] sticky top-0 border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-2.5 font-semibold">Line</th>
                  <th className="p-2.5 font-semibold">PO #</th>
                  <th className="p-2.5 font-semibold">Buyer</th>
                  <th className="p-2.5 font-semibold">Style</th>
                  <th className="p-2.5 font-semibold text-right">Plan Qty</th>
                  <th className="p-2.5 font-semibold text-right">Sewn</th>
                  <th className="p-2.5 font-semibold text-right">SMV</th>
                  <th className="p-2.5 font-semibold">PSD</th>
                  <th className="p-2.5 font-semibold">PED</th>
                  <th className="p-2.5 font-semibold">Status</th>
                  <th className="p-2.5 font-semibold">Updated ETD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-[var(--color-fg-muted)]">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const isLate = r.updEtd && r.planEtd && r.planEtd > r.updEtd;
                    return (
                      <tr key={r.id} className="hover:bg-[var(--color-panel)]/60 transition-colors">
                        <td className="p-2.5 font-bold">Line {r.line}</td>
                        <td className="p-2.5 font-semibold text-sky-500">{r.po}</td>
                        <td className="p-2.5">{r.buyer}</td>
                        <td className="p-2.5 font-medium">{r.style}</td>
                        <td className="p-2.5 text-right font-bold">{int(r.planQty ?? 0)}</td>
                        <td className="p-2.5 text-right text-[var(--color-ok)]">{int(r.sewQty ?? 0)}</td>
                        <td className="p-2.5 text-right">{r.smv ?? '—'}</td>
                        <td className="p-2.5 whitespace-nowrap">{fdLong(r.psd)}</td>
                        <td className="p-2.5 whitespace-nowrap">{fdLong(r.ped)}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={isLate ? 'text-[var(--color-bad)] font-bold' : ''}>
                            {fdLong(r.updEtd)}
                            {isLate && ' ⚠️'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-line)] bg-[var(--color-panel)] text-xs text-[var(--color-fg-muted)]">
          <span>Centralized ERP Database · Real-time filtered source records</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
