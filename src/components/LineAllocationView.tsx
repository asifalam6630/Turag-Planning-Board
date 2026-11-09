import { useMemo, useState } from 'react';
import type { OrderRow, PlanRow } from '../types';
import { fdLong, int } from '../lib/format';

interface LineAllocationViewProps {
  orders: OrderRow[];
  plan: PlanRow[];
  lines: number[];
  onAssignOrderToLine: (order: OrderRow, line: number, psd: string, ped: string, qty: number) => void;
  onRemovePlanCard: (cardId: string) => void;
  onTriggerSplit: (planRow: PlanRow) => void;
}

export function LineAllocationView({
  orders,
  plan,
  lines,
  onAssignOrderToLine,
  onRemovePlanCard,
  onTriggerSplit,
}: LineAllocationViewProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [targetLine, setTargetLine] = useState<number>(lines[0] || 1);
  const [allocQty, setAllocQty] = useState<number>(0);
  const [allocPsd, setAllocPsd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [allocPed, setAllocPed] = useState<string>(new Date().toISOString().slice(0, 10));

  const [activeLineFilter, setActiveLineFilter] = useState<number | 'All'>('All');
  const [search, setSearch] = useState('');

  // Determine unallocated orders
  const allocatedPoSet = new Set(plan.map((p) => p.po));
  const unallocatedOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q || [o.po, o.style, o.buyer].some((v) => String(v ?? '').toLowerCase().includes(q));
      return matchSearch;
    });
  }, [orders, search]);

  // Aggregate line metrics
  const lineStats = useMemo(() => {
    const map = new Map<
      number,
      { pos: number; totalQty: number; runningPos: number; lastPed: string | null }
    >();
    for (const l of lines) {
      const rs = plan.filter((p) => p.line === l);
      const totalQty = rs.reduce((acc, r) => acc + (r.planQty ?? 0), 0);
      const runningPos = rs.filter((r) => r.running).length;
      const lastPed = rs.reduce<string | null>(
        (m, r) => (!m || (r.ped && r.ped > m) ? r.ped : m),
        null
      );
      map.set(l, { pos: rs.length, totalQty, runningPos, lastPed });
    }
    return map;
  }, [plan, lines]);

  const openAssignModal = (order: OrderRow) => {
    setSelectedOrder(order);
    setAllocQty(order.orderQty);
    setTargetLine(lines[0] || 1);
    const today = new Date().toISOString().slice(0, 10);
    setAllocPsd(today);
    // calculate default PED assuming ~500 pcs/day
    const daysNeeded = Math.max(1, Math.ceil(order.orderQty / 500));
    const pedDate = new Date();
    pedDate.setDate(pedDate.getDate() + daysNeeded);
    setAllocPed(pedDate.toISOString().slice(0, 10));
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    onAssignOrderToLine(selectedOrder, targetLine, allocPsd, allocPed, allocQty);
    setSelectedOrder(null);
  };

  const filteredPlanRows = useMemo(() => {
    if (activeLineFilter === 'All') return plan;
    return plan.filter((p) => p.line === activeLineFilter);
  }, [plan, activeLineFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Production Line Assignment &amp; Scheduling</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Allocate unassigned orders to sewing lines, balance factory line capacities, and schedule batch runs
          </p>
        </div>
      </div>

      {/* Sewing Lines Capacity Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {lines.map((lineNo) => {
          const stat = lineStats.get(lineNo) ?? { pos: 0, totalQty: 0, runningPos: 0, lastPed: null };
          const isSelected = activeLineFilter === lineNo;
          return (
            <div
              key={lineNo}
              onClick={() => setActiveLineFilter(isSelected ? 'All' : lineNo)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                  : 'border-[var(--color-border-line)] bg-[var(--color-panel)] hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Line {lineNo}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)]">
                  {stat.pos} POs
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[var(--color-fg-muted)]">
                  <span>Planned:</span>
                  <span className="font-bold text-[var(--color-fg)]">{int(stat.totalQty)}</span>
                </div>
                <div className="flex justify-between text-[var(--color-fg-muted)]">
                  <span>Booked Until:</span>
                  <span className="font-semibold text-[var(--color-fg)]">{fdLong(stat.lastPed)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Assignment Workspace Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Unassigned Orders Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3.5 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Unallocated Order Queue</h3>
                <span className="text-xs text-[var(--color-fg-muted)]">
                  {unallocatedOrders.length} orders in queue
                </span>
              </div>
              <input
                type="search"
                placeholder="Filter queue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-36 px-2.5 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
              />
            </div>

            <div className="overflow-y-auto max-h-[500px] space-y-2 pr-1">
              {unallocatedOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--color-fg-muted)]">
                  No orders found in queue.
                </div>
              ) : (
                unallocatedOrders.map((ord) => {
                  const isAllocated = allocatedPoSet.has(ord.po);
                  return (
                    <div
                      key={ord.id}
                      className="p-3 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-panel)]/80 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sky-500 text-xs">PO {ord.po}</span>
                            <span className="text-xs font-semibold">{ord.style}</span>
                          </div>
                          <span className="text-[11px] text-[var(--color-fg-muted)] block">
                            {ord.buyer} · SMV: {ord.smv ?? '—'}
                          </span>
                        </div>
                        <span className="font-bold text-xs">{int(ord.orderQty)} pcs</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-line)]/60 text-[11px]">
                        <span className="text-[var(--color-fg-muted)]">
                          Ship: {fdLong(ord.updEtd || ord.poEtd)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isAllocated ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-ok)]/15 text-[var(--color-ok)] font-medium">
                              Already on Line
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAssignModal(ord)}
                              className="px-2.5 py-1 font-bold text-[11px] rounded bg-sky-500 text-white hover:bg-sky-600 transition-colors cursor-pointer"
                            >
                              Assign Line
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scheduled Line Plans */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-3.5 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">
                  Scheduled Line Assignments {activeLineFilter !== 'All' && `(Line ${activeLineFilter})`}
                </h3>
                <span className="text-xs text-[var(--color-fg-muted)]">
                  {filteredPlanRows.length} active scheduled batches
                </span>
              </div>
              {activeLineFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setActiveLineFilter('All')}
                  className="text-xs text-sky-500 hover:underline cursor-pointer"
                >
                  Show All Lines
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[var(--color-panel)] sticky top-0 border-b border-[var(--color-border-line)]">
                  <tr>
                    <th className="p-2.5 font-semibold">Line</th>
                    <th className="p-2.5 font-semibold">PO</th>
                    <th className="p-2.5 font-semibold">Buyer &amp; Style</th>
                    <th className="p-2.5 font-semibold text-right">Qty</th>
                    <th className="p-2.5 font-semibold">Sewing Dates</th>
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-line)]">
                  {filteredPlanRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--color-fg-muted)]">
                        No orders scheduled for this line.
                      </td>
                    </tr>
                  ) : (
                    filteredPlanRows.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--color-panel)]/50">
                        <td className="p-2.5 font-bold whitespace-nowrap">Line {r.line}</td>
                        <td className="p-2.5 font-bold text-sky-500 whitespace-nowrap">
                          {r.po}
                          {r.isSplit && (
                            <span className="ml-1 px-1 py-0.2 rounded text-[9px] bg-[var(--series-4)] text-white">
                              Split
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-semibold block">{r.style}</span>
                          <span className="text-[11px] text-[var(--color-fg-muted)]">{r.buyer}</span>
                        </td>
                        <td className="p-2.5 text-right font-bold whitespace-nowrap">
                          {int(r.planQty ?? 0)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          {fdLong(r.psd)} → {fdLong(r.ped)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-panel)] border border-[var(--color-border-line)] font-medium">
                            {r.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onTriggerSplit(r)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded border border-[var(--color-border-line)] hover:bg-[var(--color-panel)] cursor-pointer"
                              title="Split this allocation across two lines"
                            >
                              ✂ Split
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemovePlanCard(r.id)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded text-[var(--color-bad)] hover:bg-[var(--color-bad)]/10 cursor-pointer"
                              title="Remove allocation"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Modal Dialog */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-lg bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <div>
                <h3 className="text-base font-bold">Assign Order to Production Line</h3>
                <span className="text-xs text-[var(--color-fg-muted)]">
                  PO: {selectedOrder.po} · {selectedOrder.style} ({selectedOrder.buyer})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border-line)] grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[var(--color-fg-muted)] block">Order Qty</span>
                  <span className="font-bold text-sm">{int(selectedOrder.orderQty)} pcs</span>
                </div>
                <div>
                  <span className="text-[var(--color-fg-muted)] block">SMV</span>
                  <span className="font-bold text-sm">{selectedOrder.smv ?? '—'}</span>
                </div>
                <div>
                  <span className="text-[var(--color-fg-muted)] block">Updated ETD</span>
                  <span className="font-semibold">{fdLong(selectedOrder.updEtd || selectedOrder.poEtd)}</span>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Assign to Production Line:</label>
                <select
                  value={targetLine}
                  onChange={(e) => setTargetLine(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] font-bold text-sm cursor-pointer"
                >
                  {lines.map((l) => (
                    <option key={l} value={l}>
                      Line {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Allocated Quantity (pcs):</label>
                <input
                  type="number"
                  min="1"
                  max={selectedOrder.orderQty}
                  value={allocQty}
                  onChange={(e) => setAllocQty(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Sewing Start Date (PSD):</label>
                  <input
                    type="date"
                    value={allocPsd}
                    onChange={(e) => setAllocPsd(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Sewing End Date (PED):</label>
                  <input
                    type="date"
                    value={allocPed}
                    onChange={(e) => setAllocPed(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] cursor-pointer"
                >
                  Confirm Line Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
