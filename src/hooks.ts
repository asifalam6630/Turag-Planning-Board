import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { DashboardData } from './types';
import { loadCapacity, loadDaily, loadOrders, loadPlan } from './lib/loaders';
import productionPlanCsv from './data/productionPlan';
import orderSheetCsv from './data/orderSheet';
import manpowerCsv from './data/manpower';
import workingHoursCsv from './data/workingHours';
import nptLossTimeCsv from './data/nptLossTime';

export type SourceKey = 'plan' | 'orders' | 'manpower' | 'hours' | 'npt';

export const SOURCES: Record<SourceKey, { label: string; tab: string; csv: string }> = {
  plan: { label: 'Production plan', tab: 'PRODUCTION PLAN', csv: productionPlanCsv },
  orders: { label: 'Order sheet', tab: 'ORDER SHEET', csv: orderSheetCsv },
  manpower: { label: 'Manpower', tab: 'MANPOWER', csv: manpowerCsv },
  hours: { label: 'Working hours', tab: 'WORKING HOURS', csv: workingHoursCsv },
  npt: { label: 'NPT / loss time', tab: 'NPT LOSS TIME', csv: nptLossTimeCsv }
};

const STORE_KEY = 'dream-planning-board:csv:';

function readStored(key: SourceKey): string | null {
  try { return localStorage.getItem(STORE_KEY + key); } catch { return null; }
}

type LoadState =
  | { status: 'error'; message: string; data: null }
  | { status: 'ok'; message: null; data: DashboardData };

/**
 * Parses the five CSV sources. Each starts from the copy bundled in /data and can be
 * replaced in the app with a fresh CSV export (kept in this browser's local storage).
 */
export function useDashboardData() {
  const [texts, setTexts] = useState<Record<SourceKey, string>>(() => {
    const out = {} as Record<SourceKey, string>;
    (Object.keys(SOURCES) as SourceKey[]).forEach((k) => { out[k] = readStored(k) ?? SOURCES[k].csv; });
    return out;
  });
  const [custom, setCustom] = useState<Record<SourceKey, boolean>>(() => {
    const out = {} as Record<SourceKey, boolean>;
    (Object.keys(SOURCES) as SourceKey[]).forEach((k) => { out[k] = readStored(k) != null; });
    return out;
  });

  const state: LoadState = useMemo(() => {
    try {
      const { rows, title } = loadPlan(texts.plan);
      return {
        status: 'ok',
        message: null,
        data: {
          plan: rows,
          planTitle: title,
          daily: loadDaily(texts.plan),
          orders: loadOrders(texts.orders),
          manpower: loadCapacity(texts.manpower),
          hours: loadCapacity(texts.hours),
          npt: loadCapacity(texts.npt)
        }
      };
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : String(e), data: null };
    }
  }, [texts]);

  const replace = useCallback((key: SourceKey, text: string) => {
    try { localStorage.setItem(STORE_KEY + key, text); } catch { /* storage may be unavailable */ }
    setTexts((t) => ({ ...t, [key]: text }));
    setCustom((c) => ({ ...c, [key]: true }));
  }, []);

  const restore = useCallback((key: SourceKey) => {
    try { localStorage.removeItem(STORE_KEY + key); } catch { /* ignore */ }
    setTexts((t) => ({ ...t, [key]: SOURCES[key].csv }));
    setCustom((c) => ({ ...c, [key]: false }));
  }, []);

  return { state, custom, replace, restore };
}

/** Width of an element, updated on resize. */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export interface PlanCardTipData {
  line: number;
  badge?: string;
  buyer: string;
  style: string;
  po: string;
  psdText: string;
  pedText: string;
  durationText: string;
  planQtyText: string;
  status: string;
  reqOutputText: string;
  updatedEtdText: string;
}

export interface TipState {
  x: number;
  y: number;
  title: string;
  lines: string[];
  card?: PlanCardTipData;
}

/** Tooltip position relative to a container element. */
export function useTooltip<T extends HTMLElement>() {
  const boxRef = useRef<T>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = useCallback((
    ev: ReactPointerEvent | ReactMouseEvent | ReactFocusEvent,
    title: string,
    lines: string[],
    card?: PlanCardTipData
  ) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    let cx: number;
    let cy: number;
    if ('clientX' in ev) { cx = ev.clientX; cy = ev.clientY; } else {
      const t = (ev.target as HTMLElement).getBoundingClientRect();
      cx = t.left + 8; cy = t.bottom;
    }
    const tipWidth = card ? 310 : 280;
    const x = Math.max(0, Math.min(cx - rect.left + 12, rect.width - tipWidth));
    setTip({ x, y: cy - rect.top + 14, title, lines: lines.filter(Boolean), card });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return { boxRef, tip, show, hide };
}
