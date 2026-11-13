import { useState, type ChangeEvent } from 'react';
import type { BoardState, ColorMode, Filters, RunStatus, ViewPreset } from '../types';
import { fdLong, todayIso } from '../lib/format';

export const VIEW_PX: Record<ViewPreset, number> = { month: 40, week: 92, day: 150 };

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  board: BoardState;
  setBoard: (b: BoardState) => void;
  lines: string[];
  buyers: string[];
  statuses: string[];
  calMin?: string;
  calMax?: string;
  onReset: () => void;
  resetKey: number;
  conflictsCount?: number;
  onAutoResolve?: () => void;
}

export function Toolbar({ filters, setFilters, board, setBoard, lines, buyers, statuses, calMin, calMax, onReset, resetKey, conflictsCount = 0, onAutoResolve }: Props) {
  const [showFilters, setShowFilters] = useState(true);

  const setView = (view: ViewPreset) => setBoard({ ...board, view, px: VIEW_PX[view] });
  const zoom = (d: number) => {
    const px = Math.max(24, Math.min(240, board.px + d));
    const view = (Object.keys(VIEW_PX) as ViewPreset[]).find((k) => VIEW_PX[k] === px) ?? null;
    setBoard({ ...board, px, view });
  };
  const dateChange = (key: 'from' | 'to') => (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    if (el.value && el.validity.valid) setBoard({ ...board, [key]: el.value, todayTick: board.todayTick + 1 });
    else if (!el.value) setBoard({ ...board, [key]: null, todayTick: board.todayTick + 1 });
  };

  return (
    <div className="pb-bar" id="board-toolbar">
      <div className="pb-brand">
        <button
          type="button"
          className={`sl-btn flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
            !showFilters ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : ''
          }`}
          onClick={() => setShowFilters((prev) => !prev)}
          title={showFilters ? 'Hide Filter Controls' : 'Show Filter Controls'}
        >
          <span>🔍 Filter</span>
          <span className="text-[10px] opacity-80">{showFilters ? '▾ Hide' : '▸ Show'}</span>
        </button>
      </div>

      <div className="pb-seg" role="group" aria-label="Time scale">
        {(['month', 'week', 'day'] as ViewPreset[]).map((v) => (
          <button key={v} type="button" aria-pressed={board.view === v} onClick={() => setView(v)}>
            {v === 'month' ? 'Monthly view' : v === 'week' ? 'Weekly view' : 'Daily view'}
          </button>
        ))}
      </div>

      {showFilters && (
        <>
          <input
            type="search"
            className="pb-search"
            placeholder="Search style, PO, buyer"
            aria-label="Search style, PO or buyer"
            value={board.q}
            onChange={(e) => setBoard({ ...board, q: e.target.value })}
          />

          <select
            className="dash-select"
            aria-label="Line"
            value={filters.line}
            onChange={(e) => setFilters({ ...filters, line: e.target.value })}
          >
            <option value="All">Line: all lines</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                Line {l}
              </option>
            ))}
          </select>

          <select
            className="dash-select"
            aria-label="Run status"
            value={board.run}
            onChange={(e) => setBoard({ ...board, run: e.target.value as RunStatus })}
          >
            <option value="All">Status: all</option>
            <option value="Running">Running</option>
            <option value="Not started">Not started</option>
            <option value="Finished">Finished</option>
          </select>

          <select
            className="dash-select"
            aria-label="Present status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="All">Present status: all</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="dash-select"
            aria-label="Buyer"
            value={filters.buyer}
            onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
          >
            <option value="All">Buyer: all</option>
            {buyers.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className="dash-select"
            aria-label="Card colour"
            value={board.color}
            onChange={(e) => setBoard({ ...board, color: e.target.value as ColorMode })}
          >
            <option value="style">Colour: style-wise</option>
            <option value="order">Colour: order-wise (PO)</option>
            <option value="change">Colour: style &amp; buyer change</option>
            <option value="status">Colour: present status</option>
            <option value="buyer">Colour: buyer</option>
            <option value="risk">Colour: ETD risk</option>
            <option value="capacity">Colour: capacity workload</option>
          </select>

          <div className="pb-dates">
            <label>
              <span>From</span>
              <input type="date" value={board.from ?? ''} min={calMin} max={calMax} onChange={dateChange('from')} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={board.to ?? ''} min={calMin} max={calMax} onChange={dateChange('to')} />
            </label>
          </div>
        </>
      )}

      <div className="pb-seg" role="group" aria-label="Tracks per line">
        <button type="button" aria-pressed={board.multi} onClick={() => setBoard({ ...board, multi: true })}>
          Multiple view
        </button>
        <button type="button" aria-pressed={!board.multi} onClick={() => setBoard({ ...board, multi: false })}>
          Single view
        </button>
      </div>

      <div className="pb-zoom">
        <button type="button" onClick={() => zoom(-10)} aria-label="Zoom out">
          -
        </button>
        <span>{board.px}px</span>
        <button type="button" onClick={() => zoom(10)} aria-label="Zoom in">
          +
        </button>
      </div>

      <button type="button" className="sl-btn" onClick={onReset}>
        Reset
      </button>

      {/* Smart Auto-Resolve Conflicts button transferred to Today button area */}
      {onAutoResolve && (
        <button
          type="button"
          onClick={onAutoResolve}
          className={`ml-auto px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
            conflictsCount > 0
              ? 'bg-[var(--color-bad)] text-white hover:opacity-90 animate-pulse'
              : 'bg-[var(--series-1)]/15 text-[var(--series-1)] border border-[var(--series-1)]/40 hover:bg-[var(--series-1)]/25'
          }`}
          title="Auto-Resolve Finite Capacity Conflicts across lines"
        >
          <span>⚡ Auto-Resolve</span>
          {conflictsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-[var(--color-bad)] font-extrabold">
              {conflictsCount}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        className="sl-btn pb-today"
        style={onAutoResolve ? { marginLeft: 0 } : undefined}
        title={`Jump to Today (${fdLong(todayIso())})`}
        onClick={() => {
          const today = todayIso();
          setBoard({
            ...board,
            from: board.from && board.from > today ? null : board.from,
            to: board.to && board.to < today ? null : board.to,
            todayTick: board.todayTick + 1,
          });
        }}
      >
        Today
      </button>
    </div>
  );
}
