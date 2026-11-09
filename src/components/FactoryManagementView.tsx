import { useState } from 'react';
import type { FactoryRecord, FacilityRecord, ProductionLineMaster } from '../types';

interface FactoryManagementViewProps {
  factories: FactoryRecord[];
  facilities: FacilityRecord[];
  productionLines: ProductionLineMaster[];
  onAddFactory: (factory: FactoryRecord) => void;
  onAddFacility: (facility: FacilityRecord) => void;
  onAddProductionLine: (line: ProductionLineMaster) => void;
  onUpdateProductionLine: (line: ProductionLineMaster) => void;
  onDeleteProductionLine: (id: string) => void;
}

export function FactoryManagementView({
  factories,
  facilities,
  productionLines,
  onAddFactory,
  onAddFacility,
  onAddProductionLine,
  onUpdateProductionLine,
  onDeleteProductionLine,
}: FactoryManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'facilities' | 'factories'>('lines');

  // Modals
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);

  // New Line form
  const [newLine, setNewLine] = useState<Partial<ProductionLineMaster>>({
    lineNo: 16,
    name: 'Sewing Line 16',
    factoryId: factories[0]?.id ?? 'fact_1',
    factoryName: factories[0]?.name ?? 'Turag Garments Unit-1',
    facilityName: facilities[0]?.name ?? 'Floor 2 (North Hall)',
    machinesCount: 35,
    manpowerCount: 42,
    workingHours: 8,
    targetEfficiency: 75,
    active: true,
    supervisor: 'Md. Alamgir Hossain',
  });

  // New Factory form
  const [newFactory, setNewFactory] = useState<Partial<FactoryRecord>>({
    name: 'Turag Active Facility Unit-3',
    code: 'TG-U3',
    location: 'Kashimpur, Gazipur, Bangladesh',
    totalLines: 8,
    status: 'Active',
  });

  // New Facility form
  const [newFacility, setNewFacility] = useState<Partial<FacilityRecord>>({
    name: 'Building B - Level 3',
    building: 'Building B',
    floor: 'Level 3',
    factoryId: factories[0]?.id ?? 'fact_1',
    linesCount: 6,
  });

  const handleAddLineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine.lineNo) return;
    const selectedFact = factories.find((f) => f.id === newLine.factoryId) ?? factories[0];
    const created: ProductionLineMaster = {
      id: `line_${newLine.lineNo}_${Date.now()}`,
      lineNo: Number(newLine.lineNo),
      name: newLine.name || `Line ${newLine.lineNo}`,
      factoryId: selectedFact.id,
      factoryName: selectedFact.name,
      facilityName: newLine.facilityName || 'Main Sewing Hall',
      machinesCount: Number(newLine.machinesCount || 30),
      manpowerCount: Number(newLine.manpowerCount || 40),
      workingHours: Number(newLine.workingHours || 8),
      targetEfficiency: Number(newLine.targetEfficiency || 70),
      active: true,
      supervisor: newLine.supervisor || 'Shift Supervisor',
    };
    onAddProductionLine(created);
    setIsLineModalOpen(false);
  };

  const handleAddFactorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactory.name || !newFactory.code) return;
    const created: FactoryRecord = {
      id: `fact_${Date.now()}`,
      name: newFactory.name!,
      code: newFactory.code!,
      location: newFactory.location || 'Gazipur, Dhaka',
      totalLines: Number(newFactory.totalLines || 10),
      status: 'Active',
    };
    onAddFactory(created);
    setIsFactoryModalOpen(false);
  };

  const handleAddFacilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name) return;
    const f = factories.find((fact) => fact.id === newFacility.factoryId) ?? factories[0];
    const created: FacilityRecord = {
      id: `facil_${Date.now()}`,
      factoryId: f.id,
      factoryName: f.name,
      name: newFacility.name!,
      building: newFacility.building || 'Building A',
      floor: newFacility.floor || 'Floor 1',
      linesCount: Number(newFacility.linesCount || 4),
    };
    onAddFacility(created);
    setIsFacilityModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Factory &amp; Facility Management</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Configure manufacturing plants, facilities, sewing lines, machinery quotas, and worker capacity
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'lines' && (
            <button
              type="button"
              onClick={() => setIsLineModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Production Line
            </button>
          )}
          {activeTab === 'facilities' && (
            <button
              type="button"
              onClick={() => setIsFacilityModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Facility / Floor
            </button>
          )}
          {activeTab === 'factories' && (
            <button
              type="button"
              onClick={() => setIsFactoryModalOpen(true)}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              + Add Factory Unit
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-line)] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('lines')}
          className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'lines'
              ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          Sewing Lines ({productionLines.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('facilities')}
          className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'facilities'
              ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          Facilities &amp; Halls ({facilities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('factories')}
          className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'factories'
              ? 'bg-[var(--color-fg)] text-[var(--color-bg)]'
              : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
          }`}
        >
          Factory Units ({factories.length})
        </button>
      </div>

      {/* Sewing Lines Tab */}
      {activeTab === 'lines' && (
        <div className="space-y-4">
          <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
                <tr>
                  <th className="p-3 font-semibold">Line #</th>
                  <th className="p-3 font-semibold">Line Name</th>
                  <th className="p-3 font-semibold">Factory &amp; Facility</th>
                  <th className="p-3 font-semibold text-right">Machines</th>
                  <th className="p-3 font-semibold text-right">Manpower</th>
                  <th className="p-3 font-semibold text-right">Hours/Day</th>
                  <th className="p-3 font-semibold text-right">Target Eff.</th>
                  <th className="p-3 font-semibold">Supervisor</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {productionLines.map((l) => (
                  <tr key={l.id} className="hover:bg-[var(--color-panel)]/50 transition-colors">
                    <td className="p-3 font-bold text-sky-500 whitespace-nowrap">Line {l.lineNo}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">{l.name}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-medium block">{l.factoryName}</span>
                      <span className="text-[11px] text-[var(--color-fg-muted)]">{l.facilityName}</span>
                    </td>
                    <td className="p-3 text-right font-medium whitespace-nowrap">{l.machinesCount} pcs</td>
                    <td className="p-3 text-right font-medium whitespace-nowrap">{l.manpowerCount} ops</td>
                    <td className="p-3 text-right whitespace-nowrap">{l.workingHours} hrs</td>
                    <td className="p-3 text-right font-bold text-[var(--color-ok)] whitespace-nowrap">
                      {l.targetEfficiency}%
                    </td>
                    <td className="p-3 whitespace-nowrap">{l.supervisor || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.active
                            ? 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]'
                            : 'bg-slate-500/15 text-slate-500'
                        }`}
                      >
                        {l.active ? 'Operational' : 'Idle'}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteProductionLine(l.id)}
                        className="p-1 text-[var(--color-bad)] hover:bg-[var(--color-bad)]/10 rounded cursor-pointer"
                        title="Remove Line"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {facilities.map((f) => (
            <div
              key={f.id}
              className="p-4 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-panel)] space-y-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{f.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] font-semibold">
                  {f.linesCount} Lines
                </span>
              </div>
              <div className="text-xs text-[var(--color-fg-muted)] space-y-1">
                <div>Factory: <b className="text-[var(--color-fg)]">{f.factoryName}</b></div>
                <div>Building: <b className="text-[var(--color-fg)]">{f.building}</b></div>
                <div>Floor: <b className="text-[var(--color-fg)]">{f.floor}</b></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Factories Tab */}
      {activeTab === 'factories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {factories.map((fact) => (
            <div
              key={fact.id}
              className="p-4 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-panel)] space-y-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{fact.name}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--color-fg)] text-[var(--color-bg)]">
                    {fact.code}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--color-ok)]/15 text-[var(--color-ok)]">
                  {fact.status}
                </span>
              </div>
              <p className="text-xs text-[var(--color-fg-muted)]">{fact.location}</p>
              <div className="pt-2 border-t border-[var(--color-border-line)] flex justify-between text-xs font-semibold">
                <span>Production Capacity: {fact.totalLines} Sewing Lines</span>
                <span className="text-sky-500">Turag Manufacturing Hub</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Line Modal */}
      {isLineModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsLineModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add New Sewing Line</h3>
              <button
                type="button"
                onClick={() => setIsLineModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLineSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Line Number *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newLine.lineNo}
                    onChange={(e) =>
                      setNewLine({
                        ...newLine,
                        lineNo: Number(e.target.value),
                        name: `Sewing Line ${e.target.value}`,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Line Title *</label>
                  <input
                    type="text"
                    required
                    value={newLine.name}
                    onChange={(e) => setNewLine({ ...newLine, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Factory Unit</label>
                  <select
                    value={newLine.factoryId}
                    onChange={(e) => setNewLine({ ...newLine, factoryId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
                  >
                    {factories.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Facility / Floor</label>
                  <input
                    type="text"
                    value={newLine.facilityName}
                    onChange={(e) => setNewLine({ ...newLine, facilityName: e.target.value })}
                    placeholder="e.g. Floor 2 (North Hall)"
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-semibold">Machine Count</label>
                  <input
                    type="number"
                    value={newLine.machinesCount}
                    onChange={(e) => setNewLine({ ...newLine, machinesCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Manpower (Ops)</label>
                  <input
                    type="number"
                    value={newLine.manpowerCount}
                    onChange={(e) => setNewLine({ ...newLine, manpowerCount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">Target Eff. (%)</label>
                  <input
                    type="number"
                    value={newLine.targetEfficiency}
                    onChange={(e) => setNewLine({ ...newLine, targetEfficiency: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Supervisor</label>
                <input
                  type="text"
                  value={newLine.supervisor}
                  onChange={(e) => setNewLine({ ...newLine, supervisor: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsLineModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)] cursor-pointer"
                >
                  Save &amp; Deploy Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Factory Modal */}
      {isFactoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsFactoryModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Factory Unit</h3>
              <button
                type="button"
                onClick={() => setIsFactoryModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddFactorySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Factory Name *</label>
                <input
                  type="text"
                  required
                  value={newFactory.name}
                  onChange={(e) => setNewFactory({ ...newFactory, name: e.target.value })}
                  placeholder="e.g. Turag Active Unit-3"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">Factory Code *</label>
                <input
                  type="text"
                  required
                  value={newFactory.code}
                  onChange={(e) => setNewFactory({ ...newFactory, code: e.target.value })}
                  placeholder="e.g. TG-U3"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">Location</label>
                <input
                  type="text"
                  value={newFactory.location}
                  onChange={(e) => setNewFactory({ ...newFactory, location: e.target.value })}
                  placeholder="e.g. Gazipur, Dhaka"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsFactoryModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Factory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {isFacilityModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsFacilityModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <h3 className="text-base font-bold">Add Facility / Floor</h3>
              <button
                type="button"
                onClick={() => setIsFacilityModalOpen(false)}
                className="text-[var(--color-fg-muted)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddFacilitySubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-semibold">Facility Name *</label>
                <input
                  type="text"
                  required
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  placeholder="e.g. Building B - Level 2"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold">Factory Unit</label>
                <select
                  value={newFacility.factoryId}
                  onChange={(e) => setNewFacility({ ...newFacility, factoryId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
                >
                  {factories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--color-border-line)]">
                <button
                  type="button"
                  onClick={() => setIsFacilityModalOpen(false)}
                  className="px-4 py-2 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)]"
                >
                  Save Facility
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
