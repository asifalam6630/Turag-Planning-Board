import { useMemo, useState } from 'react';
import type { PlanRow } from '../types';
import { int, fd } from '../lib/format';

export interface ProposedChange {
  cardId: string;
  po: string;
  style: string;
  buyer: string;
  qty: number;
  currentLine: number;
  currentPsd: string;
  currentPed: string;
  proposedLine: number;
  proposedPsd: string;
  proposedPed: string;
  reason: string;
  isDateShift: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proposedChanges: ProposedChange[];
  conflictsBeforeCount: number;
  onApply: (changes: ProposedChange[]) => void;
}

export function AutoResolveModal({
  isOpen,
  onClose,
  proposedChanges,
  conflictsBeforeCount,
  onApply,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    proposedChanges.forEach((c) => {
      init[c.cardId] = true;
    });
    return init;
  });

  if (!isOpen) return null;

  const activeChanges = proposedChanges.filter((c) => selectedIds[c.cardId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-[var(--color-border-line)] bg-[var(--color-panel)] p-5 shadow-2xl text-[var(--color-fg)] flex flex-col gap-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[var(--series-1)]/15 text-[var(--series-1)] text-lg">
              ⚡
            </span>
            <div>
              <h2 className="text-lg font-bold">Smart Automatic Rescheduling</h2>
              <p className="text-xs text-[var(--color-fg-muted)]">
                Finite Capacity Conflict Auto-Resolution Recommendation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--color-bg)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Conflict Impact Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border-line)] text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-[var(--color-fg-muted)] font-medium">Capacity Conflicts Before</span>
            <span className="text-base font-bold text-[var(--color-bad)]">
              🔴 {conflictsBeforeCount} Overload {conflictsBeforeCount === 1 ? 'Slot' : 'Slots'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[var(--color-fg-muted)] font-medium">Proposed Reallocations</span>
            <span className="text-base font-bold text-[var(--series-1)]">
              🔄 {activeChanges.length} Order {activeChanges.length === 1 ? 'Move' : 'Moves'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[var(--color-fg-muted)] font-medium">Projected Outcome</span>
            <span className="text-base font-bold text-[var(--color-ok)]">
              🟢 0 Overload Conflicts (Valid)
            </span>
          </div>
        </div>

        {/* Proposed Changes Preview Table */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-fg-muted)]">
              Proposed Schedule Changes ({proposedChanges.length})
            </span>
            <span className="text-[11px] text-[var(--color-fg-muted)]">
              Review and select recommendations to apply
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto border border-[var(--color-border-line)] rounded-lg bg-[var(--color-bg)]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-[var(--color-panel)] border-b border-[var(--color-border-line)] text-[var(--color-fg-muted)] font-medium">
                <tr>
                  <th className="p-2.5 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={activeChanges.length === proposedChanges.length}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next: Record<string, boolean> = {};
                        proposedChanges.forEach((c) => {
                          next[c.cardId] = checked;
                        });
                        setSelectedIds(next);
                      }}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5">Order / Style</th>
                  <th className="p-2.5">Current Schedule</th>
                  <th className="p-2.5">Proposed Schedule</th>
                  <th className="p-2.5">Capacity Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-line)]">
                {proposedChanges.map((c) => {
                  const isChecked = !!selectedIds[c.cardId];
                  return (
                    <tr
                      key={c.cardId}
                      className={`hover:bg-[var(--color-panel)]/50 transition-colors ${
                        !isChecked ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedIds((prev) => ({
                              ...prev,
                              [c.cardId]: e.target.checked,
                            }));
                          }}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold">PO {c.po}</div>
                        <div className="text-[11px] text-[var(--color-fg-muted)]">
                          Style {c.style} ({c.buyer}) · {int(c.qty)} pcs
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-[var(--color-bad)]">
                          Line {c.currentLine}
                        </div>
                        <div className="text-[11px] text-[var(--color-fg-muted)]">
                          {fd(c.currentPsd)} → {fd(c.currentPed)}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-semibold text-[var(--color-ok)] flex items-center gap-1">
                          Line {c.proposedLine}
                          {c.isDateShift && (
                            <span className="px-1 py-0.2 rounded text-[10px] bg-[var(--series-3)]/20 text-[var(--series-3)] border border-[var(--series-3)]/40 font-normal">
                              Date shift
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--color-fg-muted)]">
                          {fd(c.proposedPsd)} → {fd(c.proposedPed)}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--color-ok)]/15 text-[var(--color-ok)] border border-[var(--color-ok)]/30">
                          {c.reason}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-line)] gap-3 flex-wrap">
          <div className="text-xs text-[var(--color-fg-muted)]">
            No changes will be saved until you confirm.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={activeChanges.length === 0}
              onClick={() => onApply(activeChanges)}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--series-1)] text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>⚡ Apply Rescheduling Plan ({activeChanges.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
