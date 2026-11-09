import { useState } from 'react';
import type { BuyerMaster, CategoryMaster, MachineMaster, StyleMaster } from '../types';

interface MasterDataViewProps {
  buyers: BuyerMaster[];
  styles: StyleMaster[];
  categories: CategoryMaster[];
  machines: MachineMaster[];
  calendar: string[];
  onAddBuyer: (b: BuyerMaster) => void;
  onAddStyle: (s: StyleMaster) => void;
  onAddCategory: (c: CategoryMaster) => void;
  onAddMachine: (m: MachineMaster) => void;
  onDeleteBuyer: (id: string) => void;
  onDeleteStyle: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteMachine: (id: string) => void;
}

export function MasterDataView({
  buyers,
  styles,
  categories,
  machines,
  calendar,
  onAddBuyer,
  onAddStyle,
  onAddCategory,
  onAddMachine,
  onDeleteBuyer,
  onDeleteStyle,
  onDeleteCategory,
  onDeleteMachine,
}: MasterDataViewProps) {
  const [tab, setTab] = useState<'buyers' | 'styles' | 'categories' | 'machines' | 'calendar'>('buyers');
  const [search, setSearch] = useState('');

  // Modals
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);

  // New Buyer
  const [newBuyer, setNewBuyer] = useState<Partial<BuyerMaster>>({
    name: '',
    code: '',
    country: 'USA',
    contactEmail: '',
    paymentTerms: 'LC 90 Days',
    status: 'Active',
  });

  // New Style
  const [newStyle, setNewStyle] = useState<Partial<StyleMaster>>({
    styleCode: '',
    buyerName: buyers[0]?.name ?? 'ABC',
    category: 'Knit Tops',
    smv: 12.5,
    description: '',
  });

  // New Category
  const [newCategory, setNewCategory] = useState<Partial<CategoryMaster>>({
    name: '',
    code: '',
    defaultSmv: 14,
    description: '',
  });

  // New Machine
  const [newMachine, setNewMachine] = useState<Partial<MachineMaster>>({
    machineCode: '',
    type: 'Single Needle Lockstitch',
    brand: 'Juki',
    lineNo: 1,
    status: 'Operational',
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Centralized Master Data Management</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Configure global reference dictionaries for Buyers, Styles, Standard Allowed Minutes (SMV), Product Categories, Machines, and Working Calendar
          </p>
        </div>
        <div>
          {tab === 'buyers' && (
            <button
              type="button"
              onClick={() => setIsBuyerModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Buyer
            </button>
          )}
          {tab === 'styles' && (
            <button
              type="button"
              onClick={() => setIsStyleModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Style &amp; SMV
            </button>
          )}
          {tab === 'categories' && (
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Category
            </button>
          )}
          {tab === 'machines' && (
            <button
              type="button"
              onClick={() => setIsMachineModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Sewing Machine
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-line)] pb-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'buyers', label: `Buyers (${buyers.length})` },
            { id: 'styles', label: `Styles & SMV (${styles.length})` },
            { id: 'categories', label: `Categories (${categories.length})` },
            { id: 'machines', label: `Machines (${machines.length})` },
            { id: 'calendar', label: `Working Calendar (${calendar.length} Days)` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id as any);
                setSearch('');
              }}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search master data..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)]"
        />
      </div>

      {/* Buyers Tab */}
      {tab === 'buyers' && (
        <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
              <tr>
                <th className="p-3 font-semibold">Buyer Name</th>
                <th className="p-3 font-semibold">Buyer Code</th>
                <th className="p-3 font-semibold">Country</th>
                <th className="p-3 font-semibold">Contact Email</th>
                <th className="p-3 font-semibold">Payment Terms</th>
                <th className="p-3 font-semibold text-right">Active POs</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {buyers
                .filter(
                  (b) =>
                    !search ||
                    [b.name, b.code, b.country].some((v) =>
                      v.toLowerCase().includes(search.toLowerCase())
                    )
                )
                .map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--color-panel)]/50">
                    <td className="p-3 font-bold text-sky-500 whitespace-nowrap">{b.name}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{b.code}</td>
                    <td className="p-3 whitespace-nowrap">{b.country}</td>
                    <td className="p-3 whitespace-nowrap text-[var(--color-fg-muted)]">
                      {b.contactEmail}
                    </td>
                    <td className="p-3 whitespace-nowrap">{b.paymentTerms}</td>
                    <td className="p-3 text-right font-bold whitespace-nowrap">
                      {b.activeOrdersCount}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-ok)]/15 text-[var(--color-ok)]">
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteBuyer(b.id)}
                        className="text-[var(--color-bad)] hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Styles & SMV Tab */}
      {tab === 'styles' && (
        <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
              <tr>
                <th className="p-3 font-semibold">Style Code</th>
                <th className="p-3 font-semibold">Buyer</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold text-right">Standard Min (SMV)</th>
                <th className="p-3 font-semibold">Description</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {styles
                .filter(
                  (s) =>
                    !search ||
                    [s.styleCode, s.buyerName, s.category].some((v) =>
                      v.toLowerCase().includes(search.toLowerCase())
                    )
                )
                .map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--color-panel)]/50">
                    <td className="p-3 font-bold text-sky-500 whitespace-nowrap">{s.styleCode}</td>
                    <td className="p-3 font-medium whitespace-nowrap">{s.buyerName}</td>
                    <td className="p-3 whitespace-nowrap">{s.category}</td>
                    <td className="p-3 text-right font-bold whitespace-nowrap">{s.smv} min</td>
                    <td className="p-3 text-[var(--color-fg-muted)]">{s.description || '—'}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteStyle(s.id)}
                        className="text-[var(--color-bad)] hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories Tab */}
      {tab === 'categories' && (
        <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
              <tr>
                <th className="p-3 font-semibold">Category Name</th>
                <th className="p-3 font-semibold">Category Code</th>
                <th className="p-3 font-semibold text-right">Default SMV</th>
                <th className="p-3 font-semibold">Description</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-panel)]/50">
                  <td className="p-3 font-bold whitespace-nowrap">{c.name}</td>
                  <td className="p-3 font-medium whitespace-nowrap">{c.code}</td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">{c.defaultSmv} min</td>
                  <td className="p-3 text-[var(--color-fg-muted)]">{c.description || '—'}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onDeleteCategory(c.id)}
                      className="text-[var(--color-bad)] hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Machines Tab */}
      {tab === 'machines' && (
        <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
              <tr>
                <th className="p-3 font-semibold">Machine ID</th>
                <th className="p-3 font-semibold">Type</th>
                <th className="p-3 font-semibold">Brand / Manufacturer</th>
                <th className="p-3 font-semibold">Assigned Line</th>
                <th className="p-3 font-semibold">Operational Status</th>
                <th className="p-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-line)]">
              {machines.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--color-panel)]/50">
                  <td className="p-3 font-bold text-sky-500 whitespace-nowrap">{m.machineCode}</td>
                  <td className="p-3 font-medium whitespace-nowrap">{m.type}</td>
                  <td className="p-3 whitespace-nowrap">{m.brand}</td>
                  <td className="p-3 font-bold whitespace-nowrap">Line {m.lineNo}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-ok)]/15 text-[var(--color-ok)]">
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onDeleteMachine(m.id)}
                      className="text-[var(--color-bad)] hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar Tab */}
      {tab === 'calendar' && (
        <div className="p-4 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-bg)] space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border-line)]">
            <span className="font-bold text-sm">Active Factory Working Days ({calendar.length} Days)</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              Holidays already filtered out according to factory roster
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[400px] overflow-y-auto p-1">
            {calendar.map((d) => (
              <div
                key={d}
                className="p-2 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] text-center text-xs"
              >
                <span className="font-bold block">{d}</span>
                <span className="text-[10px] text-[var(--color-ok)] font-medium">Working Day</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isBuyerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsBuyerModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Buyer to Master Database</h3>
              <button
                type="button"
                onClick={() => setIsBuyerModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBuyer.name || !newBuyer.code) return;
                onAddBuyer({
                  id: `buy_${Date.now()}`,
                  name: newBuyer.name!,
                  code: newBuyer.code!,
                  country: newBuyer.country || 'USA',
                  contactEmail: newBuyer.contactEmail || 'contact@buyer.com',
                  paymentTerms: newBuyer.paymentTerms || 'LC 60 Days',
                  activeOrdersCount: 0,
                  status: 'Active',
                });
                setIsBuyerModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block mb-1 font-semibold">Buyer Brand Name *</label>
                <input
                  type="text"
                  required
                  value={newBuyer.name}
                  onChange={(e) => setNewBuyer({ ...newBuyer, name: e.target.value })}
                  placeholder="e.g. Next, Levi's, Tommy Hilfiger"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Buyer Code *</label>
                  <input
                    type="text"
                    required
                    value={newBuyer.code}
                    onChange={(e) => setNewBuyer({ ...newBuyer, code: e.target.value })}
                    placeholder="e.g. NXT, LVS"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Country</label>
                  <input
                    type="text"
                    value={newBuyer.country}
                    onChange={(e) => setNewBuyer({ ...newBuyer, country: e.target.value })}
                    placeholder="e.g. UK, Germany"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsBuyerModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)] cursor-pointer"
                >
                  Save Buyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Style Modal */}
      {isStyleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsStyleModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Style &amp; Standard SMV</h3>
              <button
                type="button"
                onClick={() => setIsStyleModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newStyle.styleCode) return;
                onAddStyle({
                  id: `sty_${Date.now()}`,
                  styleCode: newStyle.styleCode!,
                  buyerName: newStyle.buyerName || 'General',
                  category: newStyle.category || 'Knit Tops',
                  smv: Number(newStyle.smv || 12),
                  description: newStyle.description || '',
                });
                setIsStyleModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Style Code *</label>
                  <input
                    type="text"
                    required
                    value={newStyle.styleCode}
                    onChange={(e) => setNewStyle({ ...newStyle, styleCode: e.target.value })}
                    placeholder="e.g. TR-5542"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Buyer</label>
                  <select
                    value={newStyle.buyerName}
                    onChange={(e) => setNewStyle({ ...newStyle, buyerName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  >
                    {buyers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Standard SMV (Min) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newStyle.smv}
                    onChange={(e) => setNewStyle({ ...newStyle, smv: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Category</label>
                  <input
                    type="text"
                    value={newStyle.category}
                    onChange={(e) => setNewStyle({ ...newStyle, category: e.target.value })}
                    placeholder="e.g. Polo Shirt"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsStyleModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Style
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Product Category</h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategory.name || !newCategory.code) return;
                onAddCategory({
                  id: `cat_${Date.now()}`,
                  name: newCategory.name!,
                  code: newCategory.code!,
                  defaultSmv: Number(newCategory.defaultSmv || 14),
                  description: newCategory.description || '',
                });
                setIsCategoryModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block mb-1 font-semibold">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g. Activewear Leggings"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Category Code *</label>
                  <input
                    type="text"
                    required
                    value={newCategory.code}
                    onChange={(e) => setNewCategory({ ...newCategory, code: e.target.value })}
                    placeholder="e.g. CAT-AWL"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Default SMV (Min)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newCategory.defaultSmv}
                    onChange={(e) => setNewCategory({ ...newCategory, defaultSmv: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Machine Modal */}
      {isMachineModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsMachineModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Sewing Machine</h3>
              <button
                type="button"
                onClick={() => setIsMachineModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMachine.machineCode) return;
                onAddMachine({
                  id: `mac_${Date.now()}`,
                  machineCode: newMachine.machineCode!,
                  type: newMachine.type || 'Single Needle Lockstitch',
                  brand: newMachine.brand || 'Juki',
                  lineNo: Number(newMachine.lineNo || 1),
                  status: 'Operational',
                });
                setIsMachineModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block mb-1 font-semibold">Machine Barcode / Tag *</label>
                <input
                  type="text"
                  required
                  value={newMachine.machineCode}
                  onChange={(e) => setNewMachine({ ...newMachine, machineCode: e.target.value })}
                  placeholder="e.g. SN-0482-JK"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Machine Type</label>
                  <select
                    value={newMachine.type}
                    onChange={(e) => setNewMachine({ ...newMachine, type: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  >
                    <option value="Single Needle Lockstitch">Single Needle (SNLS)</option>
                    <option value="Overlock 4-Thread">Overlock (4T/5T)</option>
                    <option value="Flatlock / Interlock">Flatlock</option>
                    <option value="Bar Tack Machine">Bar Tack</option>
                    <option value="Button Hole Machine">Button Hole</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Brand</label>
                  <input
                    type="text"
                    value={newMachine.brand}
                    onChange={(e) => setNewMachine({ ...newMachine, brand: e.target.value })}
                    placeholder="e.g. Juki, Brother"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-semibold">Assigned Line</label>
                <input
                  type="number"
                  min="1"
                  value={newMachine.lineNo}
                  onChange={(e) => setNewMachine({ ...newMachine, lineNo: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsMachineModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
