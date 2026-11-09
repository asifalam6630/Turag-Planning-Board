import { useMemo, useState } from 'react';
import type { OrderRow, PlanRow } from '../types';
import { fdLong, int, usd } from '../lib/format';
import * as XLSX from 'xlsx';

interface OrderDatabaseViewProps {
  orders: OrderRow[];
  plan: PlanRow[];
  onAddOrder: (order: OrderRow) => void;
  onUpdateOrder: (order: OrderRow) => void;
  onAssignToLine: (order: OrderRow) => void;
}

export function OrderDatabaseView({
  orders,
  plan,
  onAddOrder,
  onUpdateOrder,
  onAssignToLine,
}: OrderDatabaseViewProps) {
  const [search, setSearch] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);

  // New Order Form state
  const [newOrder, setNewOrder] = useState<Partial<OrderRow>>({
    buyer: '',
    style: '',
    po: '',
    category: 'Knit Tops',
    color: '',
    orderQty: 5000,
    smv: 12.5,
    fob: 4.8,
    cm: 1.2,
    poEtd: '',
    updEtd: '',
    status: 'Running',
    remarks: '',
  });

  const buyers = useMemo(() => ['All', ...new Set(orders.map((r) => r.buyer))].sort(), [orders]);
  const statuses = useMemo(() => ['All', ...new Set(orders.map((r) => r.status))].sort(), [orders]);
  const categories = useMemo(
    () => ['All', ...new Set(orders.map((r) => r.category).filter(Boolean) as string[])].sort(),
    [orders]
  );

  // Map to check which lines orders are planned on
  const plannedMap = useMemo(() => {
    const map = new Map<string, { lines: number[]; totalPlanQty: number }>();
    for (const p of plan) {
      const cur = map.get(p.po) ?? { lines: [], totalPlanQty: 0 };
      if (!cur.lines.includes(p.line)) cur.lines.push(p.line);
      cur.totalPlanQty += p.planQty ?? 0;
      map.set(p.po, cur);
    }
    return map;
  }, [plan]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((r) => {
      const matchSearch =
        !q ||
        [r.po, r.style, r.buyer, r.color, r.category, r.product].some((v) =>
          String(v ?? '').toLowerCase().includes(q)
        );
      const matchBuyer = buyerFilter === 'All' || r.buyer === buyerFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchCategory = categoryFilter === 'All' || r.category === categoryFilter;
      return matchSearch && matchBuyer && matchStatus && matchCategory;
    });
  }, [orders, search, buyerFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalPcs = filteredOrders.reduce((sum, r) => sum + (r.orderQty || 0), 0);
    const totalShipped = filteredOrders.reduce((sum, r) => sum + (r.shippedQty || 0), 0);
    const totalFob = filteredOrders.reduce((sum, r) => sum + (r.fob || 0) * (r.orderQty || 0), 0);
    const totalCm = filteredOrders.reduce((sum, r) => sum + (r.cm || 0) * (r.orderQty || 0), 0);
    return { totalOrders, totalPcs, totalShipped, totalFob, totalCm };
  }, [filteredOrders]);

  const handleExportExcel = () => {
    const data = filteredOrders.map((o, idx) => {
      const alloc = plannedMap.get(o.po);
      return {
        'SL': idx + 1,
        'Buyer': o.buyer,
        'PO Number': o.po,
        'Style': o.style,
        'Category': o.category || '—',
        'Color': o.color || '—',
        'Order Qty (Pcs)': o.orderQty,
        'SMV': o.smv ?? 0,
        'Produce Mins': Math.round((o.smv ?? 0) * o.orderQty),
        'FOB ($)': o.fob ?? 0,
        'FOB Value ($)': Math.round((o.fob ?? 0) * o.orderQty),
        'CM ($)': o.cm ?? 0,
        'PO ETD': fdLong(o.poEtd),
        'Updated ETD': fdLong(o.updEtd),
        'Shipped Qty': o.shippedQty ?? 0,
        'Ship Balance': o.shipBal ?? o.orderQty - (o.shippedQty ?? 0),
        'Status': o.status,
        'Allocated Lines': alloc ? alloc.lines.map((l) => `Line ${l}`).join(', ') : 'Unplanned',
        'Allocated Qty': alloc ? alloc.totalPlanQty : 0,
        'Remarks': o.remarks || '—',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order Database');
    XLSX.writeFile(wb, `Turag_Centralized_Order_Database.xlsx`);
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.po || !newOrder.buyer || !newOrder.style || !newOrder.orderQty) {
      alert('Please fill in required fields (Buyer, PO Number, Style, Order Qty)');
      return;
    }
    const created: OrderRow = {
      id: `ord_${Date.now()}`,
      orderDate: new Date().toISOString().slice(0, 10),
      buyer: newOrder.buyer!,
      style: newOrder.style!,
      po: newOrder.po!,
      category: newOrder.category || null,
      product: newOrder.product || null,
      combo: newOrder.combo || null,
      color: newOrder.color || null,
      orderQty: Number(newOrder.orderQty),
      poEtd: newOrder.poEtd || null,
      updEtd: newOrder.updEtd || newOrder.poEtd || null,
      smv: newOrder.smv ? Number(newOrder.smv) : null,
      fob: newOrder.fob ? Number(newOrder.fob) : null,
      cm: newOrder.cm ? Number(newOrder.cm) : null,
      shippedQty: 0,
      shipBal: Number(newOrder.orderQty),
      status: newOrder.status || 'Planned',
      remarks: newOrder.remarks || null,
    };
    onAddOrder(created);
    setIsNewOrderModalOpen(false);
    setNewOrder({
      buyer: '',
      style: '',
      po: '',
      category: 'Knit Tops',
      color: '',
      orderQty: 5000,
      smv: 12.5,
      fob: 4.8,
      cm: 1.2,
      poEtd: '',
      updEtd: '',
      status: 'Planned',
      remarks: '',
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Centralized Order Database</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Master buyer orders registry with real-time sewing line allocation and shipment tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-border-line)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📥 Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewOrderModalOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <span>+ Create New Order</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-medium">
            Total Orders
          </span>
          <span className="text-xl font-bold font-serif">{int(stats.totalOrders)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-medium">
            Total Pieces
          </span>
          <span className="text-xl font-bold font-serif">{int(stats.totalPcs)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-medium">
            Shipped Quantity
          </span>
          <span className="text-xl font-bold font-serif text-[var(--color-ok)]">
            {int(stats.totalShipped)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-medium">
            FOB Order Value
          </span>
          <span className="text-xl font-bold font-serif">{usd(stats.totalFob)}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)]">
          <span className="text-[11px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-medium">
            CM Value
          </span>
          <span className="text-xl font-bold font-serif">{usd(stats.totalCm)}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)] flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          placeholder="Search PO, style, buyer, color, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)]"
        />
        <select
          value={buyerFilter}
          onChange={(e) => setBuyerFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
        >
          {buyers.map((b) => (
            <option key={b} value={b}>
              Buyer: {b}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              Category: {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              Status: {s}
            </option>
          ))}
        </select>
        {(search || buyerFilter !== 'All' || statusFilter !== 'All' || categoryFilter !== 'All') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setBuyerFilter('All');
              setStatusFilter('All');
              setCategoryFilter('All');
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] hover:bg-[var(--color-panel)] text-[var(--color-fg-muted)]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] sticky top-0 border-b border-[var(--color-border-line)] z-10">
              <tr>
                <th className="p-3 font-semibold">PO #</th>
                <th className="p-3 font-semibold">Buyer</th>
                <th className="p-3 font-semibold">Style</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold text-right">Order Qty</th>
                <th className="p-3 font-semibold text-right">SMV</th>
                <th className="p-3 font-semibold text-right">FOB</th>
                <th className="p-3 font-semibold">Updated ETD</th>
                <th className="p-3 font-semibold">Line Allocation</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-[var(--color-fg-muted)]">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const alloc = plannedMap.get(o.po);
                  const isAllocated = alloc && alloc.lines.length > 0;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-[var(--color-panel)]/60 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOrder(o)}
                    >
                      <td className="p-3 font-bold text-sky-500 whitespace-nowrap">{o.po}</td>
                      <td className="p-3 whitespace-nowrap font-medium">{o.buyer}</td>
                      <td className="p-3 whitespace-nowrap font-semibold">{o.style}</td>
                      <td className="p-3 whitespace-nowrap text-[var(--color-fg-muted)]">
                        {o.category || '—'}
                      </td>
                      <td className="p-3 text-right font-bold whitespace-nowrap">
                        {int(o.orderQty)} pcs
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">{o.smv ?? '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap font-medium">
                        {o.fob ? `$${o.fob.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium">{fdLong(o.updEtd || o.poEtd)}</td>
                      <td className="p-3 whitespace-nowrap">
                        {isAllocated ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {alloc.lines.map((l) => (
                              <span
                                key={l}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-ok)]/15 text-[var(--color-ok)] border border-[var(--color-ok)]/30"
                              >
                                Line {l}
                              </span>
                            ))}
                            <span className="text-[10px] text-[var(--color-fg-muted)]">
                              ({int(alloc.totalPlanQty)} pcs)
                            </span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            Unallocated
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                          {o.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(o)}
                            className="px-2 py-1 text-[11px] rounded border border-[var(--color-border-line)] hover:bg-[var(--color-panel)] cursor-pointer"
                            title="View Full Order Details"
                          >
                            Details
                          </button>
                          {!isAllocated && (
                            <button
                              type="button"
                              onClick={() => onAssignToLine(o)}
                              className="px-2 py-1 text-[11px] font-bold rounded bg-sky-500 text-white hover:bg-sky-600 transition-colors cursor-pointer"
                              title="Assign to Sewing Line"
                            >
                              Assign Line
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border-line)]">
              <div>
                <span className="text-xs text-[var(--color-fg-muted)] block">Order File Detail</span>
                <h3 className="text-lg font-bold">
                  PO: {selectedOrder.po} · Style {selectedOrder.style}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">Buyer</span>
                <span className="font-bold text-sm">{selectedOrder.buyer}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">Order Quantity</span>
                <span className="font-bold text-sm">{int(selectedOrder.orderQty)} pcs</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">SMV (Standard Min)</span>
                <span className="font-bold text-sm">{selectedOrder.smv ?? '—'}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">FOB Price</span>
                <span className="font-bold text-sm">${selectedOrder.fob ? selectedOrder.fob.toFixed(2) : '—'}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">CM Value</span>
                <span className="font-bold text-sm">${selectedOrder.cm ? selectedOrder.cm.toFixed(2) : '—'}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">Total FOB Amount</span>
                <span className="font-bold text-sm">{usd((selectedOrder.fob ?? 0) * selectedOrder.orderQty)}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">PO ETD</span>
                <span className="font-semibold">{fdLong(selectedOrder.poEtd)}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">Updated ETD</span>
                <span className="font-semibold">{fdLong(selectedOrder.updEtd)}</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--color-panel)] border border-[var(--color-border-line)]">
                <span className="text-[var(--color-fg-muted)] block">Present Status</span>
                <span className="font-semibold">{selectedOrder.status}</span>
              </div>
            </div>

            {/* Line plan allocation breakdown */}
            <div className="p-3 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)]/50 text-xs space-y-2">
              <span className="font-bold block">Production Line Allocations</span>
              {plannedMap.get(selectedOrder.po)?.lines.length ? (
                <div className="space-y-1">
                  {plan
                    .filter((p) => p.po === selectedOrder.po)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)]"
                      >
                        <span className="font-bold text-sky-500">Line {p.line}</span>
                        <span>{int(p.planQty ?? 0)} pcs</span>
                        <span>
                          {fdLong(p.psd)} → {fdLong(p.ped)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[var(--color-panel)] text-[10px]">
                          {p.status}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-fg-muted)]">
                    This order has not yet been assigned to a sewing line.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const o = selectedOrder;
                      setSelectedOrder(null);
                      onAssignToLine(o);
                    }}
                    className="px-3 py-1.5 font-bold rounded bg-sky-500 text-white cursor-pointer"
                  >
                    Assign to Line Now
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--color-border-line)]">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold rounded bg-[var(--color-fg)] text-[var(--color-bg)] cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {isNewOrderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsNewOrderModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Create New Buyer Order</h3>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Buyer Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.buyer}
                    onChange={(e) => setNewOrder({ ...newOrder, buyer: e.target.value })}
                    placeholder="e.g. H&M, Zara, Target"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Style Code *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.style}
                    onChange={(e) => setNewOrder({ ...newOrder, style: e.target.value })}
                    placeholder="e.g. TR-2026-X"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.po}
                    onChange={(e) => setNewOrder({ ...newOrder, po: e.target.value })}
                    placeholder="e.g. PO-8849"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    value={newOrder.category ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, category: e.target.value })}
                    placeholder="e.g. Knit Tops"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Order Qty (Pcs) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newOrder.orderQty ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, orderQty: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">SMV</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newOrder.smv ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, smv: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">FOB ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.fob ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, fob: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">PO ETD (Shipment)</label>
                  <input
                    type="date"
                    value={newOrder.poEtd ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, poEtd: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Updated ETD</label>
                  <input
                    type="date"
                    value={newOrder.updEtd ?? ''}
                    onChange={(e) => setNewOrder({ ...newOrder, updEtd: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
