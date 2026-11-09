import type { ChangeEvent } from 'react';
import type { BoardState, ColorMode, Filters, RunStatus, ViewPreset } from '../types';

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
}

export function Toolbar({ filters, setFilters, board, setBoard, lines, buyers, statuses, calMin, calMax, onReset, resetKey }: Props) {
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
      <div className="pb-brand"><b>TURAG PLANNING BOARD</b><span>Production schedule</span></div>

      <div className="pb-seg" role="group" aria-label="Time scale">
        {(['month', 'week', 'day'] as ViewPreset[]).map((v) => (
          <button key={v} type="button" aria-pressed={board.view === v} onClick={() => setView(v)}>
            {v === 'month' ? 'Monthly view' : v === 'week' ? 'Weekly view' : 'Daily view'}
          </button>
        ))}
      </div>

      <input type="search" className="pb-search" placeholder="Search style, PO, buyer" aria-label="Search style, PO or buyer"
        value={board.q} onChange={(e) => setBoard({ ...board, q: e.target.value })} />

      <select className="dash-select" aria-label="Line" value={filters.line} onChange={(e) => setFilters({ ...filters, line: e.target.value })}>
        <option value="All">Line: all lines</option>
        {lines.map((l) => <option key={l} value={l}>Line {l}</option>)}
      </select>

      <select className="dash-select" aria-label="Run status" value={board.run} onChange={(e) => setBoard({ ...board, run: e.target.value as RunStatus })}>
        <option value="All">Status: all</option>
        <option value="Running">Running</option>
        <option value="Not started">Not started</option>
        <option value="Finished">Finished</option>
      </select>

      <select className="dash-select" aria-label="Present status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="All">Present status: all</option>
        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className="dash-select" aria-label="Buyer" value={filters.buyer} onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}>
        <option value="All">Buyer: all</option>
        {buyers.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>

      <select className="dash-select" aria-label="Card colour" value={board.color} onChange={(e) => setBoard({ ...board, color: e.target.value as ColorMode })}>
        <option value="style">Colour: style-wise</option>
        <option value="order">Colour: order-wise (PO)</option>
        <option value="change">Colour: style &amp; buyer change</option>
        <option value="status">Colour: present status</option>
        <option value="buyer">Colour: buyer</option>
        <option value="risk">Colour: ETD risk</option>
      </select>

      <span className="pb-dates" key={resetKey}>
        DATES
        <input type="date" aria-label="Board start date" min={calMin} max={calMax} defaultValue={board.from ?? ''} onChange={dateChange('from')} />
        –
        <input type="date" aria-label="Board end date" min={calMin} max={calMax} defaultValue={board.to ?? ''} onChange={dateChange('to')} />
      </span>

      <div className="pb-seg" role="group" aria-label="Tracks per line">
        <button type="button" aria-pressed={board.multi} onClick={() => setBoard({ ...board, multi: true })}>Multiple view</button>
        <button type="button" aria-pressed={!board.multi} onClick={() => setBoard({ ...board, multi: false })}>Single view</button>
      </div>

      <span className="pb-zoom">
        <button type="button" className="sl-btn" aria-label="Zoom out" onClick={() => zoom(-12)}>−</button>
        <span>{board.px}px</span>
        <button type="button" className="sl-btn" aria-label="Zoom in" onClick={() => zoom(12)}>+</button>
      </span>

      <button type="button" className="sl-btn" onClick={onReset}>Reset</button>
      <button type="button" className="sl-btn pb-today" onClick={() => setBoard({ ...board, todayTick: board.todayTick + 1 })}>Today</button>
    </div>
  );
}
