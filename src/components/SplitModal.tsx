import { useEffect, useMemo, useState } from 'react';
import type { PlanRow } from '../types';
import { fd, int } from '../lib/format';
import { bisectLeft, bisectRight, utcDay } from 'd3';
import { toDate } from '../lib/format';

export interface SplitResult {
  origId: string;
  origQty: number;
  origPsd: string;
  origPed: string;
  origRemarks?: string;
  newLine: number;
  newQty: number;
  newPsd: string;
  newPed: string;
  newRemarks?: string;
}

interface SplitModalProps {
  card: PlanRow | null;
  allLines: number[];
  calendar: string[];
  onClose: () => void;
  onConfirm: (result: SplitResult) => void;
  onRevert?: (cardId: string) => void;
}

export function SplitModal({
  card,
  allLines,
  calendar,
  onClose,
  onConfirm,
  onRevert,
}: SplitModalProps) {
  if (!card) return null;

  const totalQty = card.planQty ?? 0;
  const currentLine = card.line;
  const originalPsd = card.psd ?? '';
  const originalPed = card.ped ?? '';

  // Lines available for new assignment
  const targetLines = useMemo(() => {
    const list = [...new Set([...allLines, currentLine + 1, currentLine - 1].filter((l) => l > 0))].sort(
      (a, b) => a - b
    );
    return list;
  }, [allLines, currentLine]);

  // Form states
  const [splitRatio, setSplitRatio] = useState<number>(50); // percentage for line 1
  const [origQty, setOrigQty] = useState<number>(Math.round(totalQty * 0.5));
  const [newQty, setNewQty] = useState<number>(totalQty - Math.round(totalQty * 0.5));
  const [selectedNewLine, setSelectedNewLine] = useState<number>(
    targetLines.find((l) => l !== currentLine) ?? (currentLine === 1 ? 2 : 1)
  );

  const [origPsd, setOrigPsd] = useState<string>(originalPsd);
  const [origPed, setOrigPed] = useState<string>(originalPed);
  const [newPsd, setNewPsd] = useState<string>(originalPsd);
  const [newPed, setNewPed] = useState<string>(originalPed);

  const [origRemarks, setOrigRemarks] = useState<string>(
    `Part 1/2 (Split PO)`
  );
  const [newRemarks, setNewRemarks] = useState<string>(
    `Part 2/2 (Split from Line ${currentLine})`
  );

  // Sync state whenever card changes
  useEffect(() => {
    if (!card) return;
    const half = Math.round((card.planQty ?? 0) * 0.5);
    setSplitRatio(50);
    setOrigQty(half);
    setNewQty((card.planQty ?? 0) - half);
    setOrigPsd(card.psd ?? '');
    setOrigPed(card.ped ?? '');
    setNewPsd(card.psd ?? '');
    setNewPed(card.ped ?? '');
    const defTarget = targetLines.find((l) => l !== card.line) ?? (card.line === 1 ? 2 : 1);
    setSelectedNewLine(defTarget);
    setOrigRemarks(`Part 1/2 · Split PO ${card.po}`);
    setNewRemarks(`Part 2/2 · Split from Line ${card.line}`);
  }, [card, targetLines]);

  // Helper to calculate working days
  const getWorkDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    if (calendar.length) {
      const s = bisectLeft(calendar, start);
      const e = bisectRight(calendar, end);
      return Math.max(1, e - s);
    }
    return Math.max(1, utcDay.count(toDate(start), toDate(end)) + 1);
  };

  const origDays = getWorkDays(origPsd, origPed);
  const newDays = getWorkDays(newPsd, newPed);

  const origPcsPerDay = origDays > 0 ? Math.round(origQty / origDays) : 0;
  const newPcsPerDay = newDays > 0 ? Math.round(newQty / newDays) : 0;

  // Handler for ratio presets
  const handlePreset = (pct: number) => {
    setSplitRatio(pct);
    const q1 = Math.round((totalQty * pct) / 100);
    const q2 = totalQty - q1;
    setOrigQty(q1);
    setNewQty(q2);
  };

  // Handler for slider change
  const handleSliderChange = (val: number) => {
    setSplitRatio(val);
    const q1 = Math.round((totalQty * val) / 100);
    const q2 = totalQty - q1;
    setOrigQty(q1);
    setNewQty(q2);
  };

  // Direct quantity input change
  const handleOrigQtyInput = (val: number) => {
    const clamped = Math.max(0, Math.min(val, totalQty));
    setOrigQty(clamped);
    setNewQty(totalQty - clamped);
    setSplitRatio(totalQty > 0 ? Math.round((clamped / totalQty) * 100) : 50);
  };

  const handleNewQtyInput = (val: number) => {
    const clamped = Math.max(0, Math.min(val, totalQty));
    setNewQty(clamped);
    setOrigQty(totalQty - clamped);
    setSplitRatio(totalQty > 0 ? Math.round(((totalQty - clamped) / totalQty) * 100) : 50);
  };

  const qtySum = origQty + newQty;
  const isBalanced = qtySum === totalQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewLine || selectedNewLine === currentLine) {
      alert('Please choose a different line for the new split allocation.');
      return;
    }
    if (origQty <= 0 || newQty <= 0) {
      alert('Both lines must have a planned quantity greater than 0.');
      return;
    }
    onConfirm({
      origId: card.id,
      origQty,
      origPsd,
      origPed,
      origRemarks,
      newLine: selectedNewLine,
      newQty,
      newPsd,
      newPed,
      newRemarks,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[var(--color-bg)] text-[var(--color-fg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-5 sm:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--color-border-line)] pb-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[var(--color-ok)] text-white">
                Split Facility
              </span>
              <h3 id="split-modal-title" className="text-lg font-bold">
                Split PO Across Two Sewing Lines
              </h3>
            </div>
            <p className="text-xs text-[var(--color-fg-muted)]">
              Divide this order between Line {currentLine} and a secondary line to balance factory capacity or expedite delivery.
            </p>
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

        {/* Current Order Summary Card */}
        <div className="bg-[var(--color-panel)] border border-[var(--color-border-line)] rounded-lg p-3.5 mb-5 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[var(--color-fg-muted)] block">Current Line:</span>
              <span className="font-bold text-sm">Line {currentLine}</span>
            </div>
            <div>
              <span className="text-[var(--color-fg-muted)] block">PO & Style:</span>
              <span className="font-bold">{card.po}</span>
              <span className="text-[var(--color-fg-muted)] block truncate">{card.style} ({card.buyer})</span>
            </div>
            <div>
              <span className="text-[var(--color-fg-muted)] block">Total Quantity:</span>
              <span className="font-bold text-sm">{int(totalQty)} pcs</span>
              <span className="text-[var(--color-fg-muted)] block">SMV: {card.smv ?? '—'}</span>
            </div>
            <div>
              <span className="text-[var(--color-fg-muted)] block">Current Dates:</span>
              <span className="font-semibold">{fd(card.psd)} → {fd(card.ped)}</span>
              <span className="text-[var(--color-fg-muted)] block">{getWorkDays(originalPsd, originalPed)} working days</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ratio Selector & Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-fg-muted)]">
                Split Ratio Allocation
              </label>
              <div className="flex gap-1.5">
                {[
                  { label: '50 / 50', val: 50 },
                  { label: '60 / 40', val: 60 },
                  { label: '70 / 30', val: 70 },
                  { label: '80 / 20', val: 80 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handlePreset(p.val)}
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      splitRatio === p.val
                        ? 'bg-[var(--color-fg)] text-[var(--color-bg)] font-bold border-[var(--color-fg)]'
                        : 'bg-[var(--color-panel)] text-[var(--color-fg)] border-[var(--color-border-line)] hover:bg-[var(--color-border-line)]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium w-16 text-right">
                Line {currentLine}: {splitRatio}%
              </span>
              <input
                type="range"
                min="5"
                max="95"
                value={splitRatio}
                onChange={(e) => handleSliderChange(Number(e.target.value))}
                className="flex-1 accent-[var(--color-fg)] cursor-pointer"
              />
              <span className="text-xs font-medium w-16">
                Line {selectedNewLine}: {100 - splitRatio}%
              </span>
            </div>

            {/* Visual ratio bar */}
            <div className="h-2.5 w-full bg-[var(--color-panel)] rounded-full overflow-hidden flex border border-[var(--color-border-line)]">
              <div
                className="bg-[var(--series-1)] h-full transition-all duration-150"
                style={{ width: `${splitRatio}%` }}
                title={`Line ${currentLine}: ${origQty} pcs`}
              />
              <div
                className="bg-[var(--series-2)] h-full transition-all duration-150"
                style={{ width: `${100 - splitRatio}%` }}
                title={`Line ${selectedNewLine}: ${newQty} pcs`}
              />
            </div>
          </div>

          {/* Two Line Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Original Line */}
            <div className="border-2 border-[var(--series-1)]/40 bg-[var(--color-panel)]/40 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-line)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--series-1)]" />
                  <span className="font-bold text-sm">Line {currentLine} (Keep)</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--series-1)]/15 text-[var(--series-1)]">
                  {splitRatio}%
                </span>
              </div>

              <div>
                <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
                  Allocated Quantity (pcs):
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalQty - 1}
                  value={origQty}
                  onChange={(e) => handleOrigQtyInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                    Start (PSD):
                  </label>
                  <input
                    type="date"
                    value={origPsd}
                    onChange={(e) => setOrigPsd(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                    End (PED):
                  </label>
                  <input
                    type="date"
                    value={origPed}
                    onChange={(e) => setOrigPed(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs pt-1 text-[var(--color-fg-muted)]">
                <span>Working days: <b>{origDays}d</b></span>
                <span>Pace: <b>{int(origPcsPerDay)} pcs/day</b></span>
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                  Line Note / Tag:
                </label>
                <input
                  type="text"
                  value={origRemarks}
                  onChange={(e) => setOrigRemarks(e.target.value)}
                  placeholder="e.g. Part 1/2"
                  className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
            </div>

            {/* Box 2: Target New Line */}
            <div className="border-2 border-[var(--series-2)]/40 bg-[var(--color-panel)]/40 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-line)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--series-2)]" />
                  <span className="font-bold text-sm">Assign to New Line:</span>
                </div>
                <select
                  value={selectedNewLine}
                  onChange={(e) => setSelectedNewLine(Number(e.target.value))}
                  className="px-2 py-0.5 text-xs font-bold rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
                >
                  {targetLines
                    .filter((l) => l !== currentLine)
                    .map((l) => (
                      <option key={l} value={l}>
                        Line {l}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
                  Allocated Quantity (pcs):
                </label>
                <input
                  type="number"
                  min="1"
                  max={totalQty - 1}
                  value={newQty}
                  onChange={(e) => handleNewQtyInput(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                    Start (PSD):
                  </label>
                  <input
                    type="date"
                    value={newPsd}
                    onChange={(e) => setNewPsd(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                    End (PED):
                  </label>
                  <input
                    type="date"
                    value={newPed}
                    onChange={(e) => setNewPed(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between text-xs pt-1 text-[var(--color-fg-muted)]">
                <span>Working days: <b>{newDays}d</b></span>
                <span>Pace: <b>{int(newPcsPerDay)} pcs/day</b></span>
              </div>

              <div>
                <label className="text-[11px] text-[var(--color-fg-muted)] block mb-1">
                  Line Note / Tag:
                </label>
                <input
                  type="text"
                  value={newRemarks}
                  onChange={(e) => setNewRemarks(e.target.value)}
                  placeholder="e.g. Part 2/2"
                  className="w-full px-2 py-1 text-xs rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>
            </div>
          </div>

          {/* Validation Notice */}
          {!isBalanced && (
            <div className="p-2.5 rounded bg-[var(--color-bad)]/10 border border-[var(--color-bad)]/30 text-xs text-[var(--color-bad)] flex items-center justify-between">
              <span>
                Warning: Total pieces ({int(qtySum)}) do not match original order quantity ({int(totalQty)}).
              </span>
              <button
                type="button"
                onClick={() => handlePreset(50)}
                className="underline font-bold cursor-pointer"
              >
                Auto-balance 50/50
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-line)]">
            <div>
              {card.isSplit && onRevert && (
                <button
                  type="button"
                  onClick={() => {
                    onRevert(card.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs text-[var(--color-bad)] hover:bg-[var(--color-bad)]/10 rounded border border-[var(--color-bad)]/40 transition-colors cursor-pointer font-medium"
                >
                  Merge / Revert Split
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-border-line)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Confirm & Split to Line {selectedNewLine}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
