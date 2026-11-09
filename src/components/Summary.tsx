import type { ScopeKpi } from '../types';
import { fd, int, usd } from '../lib/format';

export function Takeaway({ k }: { k: ScopeKpi }) {
  return (
    <p className="sl-take" id="takeaway">
      <b>{int(k.lines)}</b> sewing lines carry <b>{int(k.planQty)}</b> pcs on <b>{int(k.pos)}</b> POs, loaded until{' '}
      <b>{fd(k.lastPed)}</b>. <b className={k.late > 0 ? 'sl-late' : undefined}>{int(k.late)}</b> of these POs are planned to ship after the buyer's updated ETD.
    </p>
  );
}

interface KpiTilesProps {
  k: ScopeKpi;
  onDrillDown?: (kpiKey: string, title: string, subtitle: string) => void;
}

export function KpiTiles({ k, onDrillDown }: KpiTilesProps) {
  return (
    <div className="sl-kpis" id="kpis">
      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('planQty', 'Planned Quantity Source Records', 'All scheduled production plan orders')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">Planned quantity</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className="val">{int(k.planQty)}</span>
        <span className="note">pcs on the line plan</span>
      </div>

      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('pos', 'POs Loaded on Lines', 'All active purchase orders currently assigned')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">POs on lines</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className="val">{int(k.pos)}</span>
        <span className="note">purchase orders loaded</span>
      </div>

      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('sewBal', 'Sewing Balance & Output', 'Outstanding sewing quantity vs already sewn units')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">Sewing balance</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className="val">{int(k.sewBal)}</span>
        <span className="note">pcs still to sew · {int(k.sewn)} sewn</span>
      </div>

      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('planMin', 'Produce Minutes Workload', 'Standard Allowed Minutes multiplied by plan quantities')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">Produce minutes</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className="val">{int(k.planMin)}</span>
        <span className="note">plan qty × SMV</span>
      </div>

      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('fobValue', 'Commercial FOB & CM Valuation', 'Financial value of planned orders')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">FOB value</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className="val">{usd(k.fobValue)}</span>
        <span className="note">CM {usd(k.cmValue)}</span>
      </div>

      <div
        className="sl-kpi group relative cursor-pointer hover:border-sky-500 transition-colors"
        onClick={() => onDrillDown?.('late', 'ETD at Risk POs', 'Orders with plan ETD later than buyer updated ETD')}
        title="Click to view underlying source data records"
      >
        <div className="flex items-center justify-between">
          <span className="lab">ETD at risk</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border-line)] text-[var(--color-fg-muted)] group-hover:text-sky-500">
            ℹ Details
          </span>
        </div>
        <span className={'val' + (k.late > 0 ? ' sl-late' : '')}>{int(k.late)}</span>
        <span className="note">POs with plan ETD after updated ETD</span>
      </div>
    </div>
  );
}
