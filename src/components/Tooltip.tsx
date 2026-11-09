import type { TipState } from '../hooks';

export function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;

  // Custom styled plan card tooltip matching the exact pattern
  if (tip.card) {
    const c = tip.card;
    return (
      <div
        className="fixed z-50 pointer-events-none rounded-xl border border-slate-700/80 shadow-2xl p-4 text-xs font-sans animate-in fade-in-50 duration-75 select-none"
        style={{
          left: tip.x,
          top: tip.y,
          width: '290px',
          backgroundColor: '#0c1524',
          boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.7), 0 4px 12px -2px rgba(0, 0, 0, 0.5)',
        }}
        role="tooltip"
      >
        {/* Header: Line title and Plan badge */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <span className="text-sky-400 font-bold text-base tracking-wide">
            Line {c.line}
          </span>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#132338] border border-[#25466e] text-sky-200">
            {c.badge || 'Plan'}
          </span>
        </div>

        {/* Data Rows */}
        <div className="space-y-1.5 leading-tight">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Buyer:</span>
            <span className="text-white font-bold">{c.buyer}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Style:</span>
            <span className="text-white font-bold">{c.style}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">PO:</span>
            <span className="text-white font-bold">{c.po}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-emerald-400 font-semibold">PSD (Start):</span>
            <span className="text-emerald-400 font-bold">{c.psdText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-rose-400 font-semibold">PED (End):</span>
            <span className="text-rose-400 font-bold">{c.pedText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Duration:</span>
            <span className="text-white font-bold">{c.durationText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Line Plan Qty:</span>
            <span className="text-white font-bold">{c.planQtyText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Present Status:</span>
            <span className="text-emerald-400 font-bold">{c.status}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Req. Output/Day:</span>
            <span className="text-sky-400 font-bold">{c.reqOutputText}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-amber-400 font-semibold">Updated ETD:</span>
            <span className="text-amber-400 font-bold">{c.updatedEtdText}</span>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for simple chart tooltips
  return (
    <div className="sl-tip" style={{ left: tip.x, top: tip.y }} role="status">
      <strong>{tip.title}</strong>
      {tip.lines.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}
