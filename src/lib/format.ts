import { format, utcFormat } from 'd3';
import type { ISODate } from '../types';

export const int = format(',');
export const usd = format('$,.0f');
export const pct = format('.0%');
export const short = format('~s');

const dayMonth = utcFormat('%d %b');
const dmy = utcFormat('%d-%b-%Y');

export const toDate = (s: ISODate): Date => new Date(s + 'T00:00:00Z');

/** "07 Nov", or "—" when empty. */
export function fd(s: ISODate | Date | null | undefined): string {
  if (!s) return '—';
  return dayMonth(typeof s === 'string' ? toDate(s) : s);
}

/** "07-Nov-2026", or "—" when empty. */
export function fdLong(s: ISODate | Date | null | undefined): string {
  if (!s) return '—';
  return dmy(typeof s === 'string' ? toDate(s) : s);
}

/** Today's local date as ISO. */
export function todayIso(): ISODate {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10);
}

/** Series colours, defined as CSS variables in styles.css so they follow the theme. */
export const COLORS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--series-${i})`);

const STATUS_ORDER = ['Plan', 'Running', 'Upcoming', 'Projected', 'Shipout'];

export function statusColor(s: string): string {
  let i = STATUS_ORDER.indexOf(s);
  if (i < 0) i = STATUS_ORDER.length + ([...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 3);
  return COLORS[i % COLORS.length];
}

export function lineColor(line: number): string {
  return COLORS[(((line - 1) % COLORS.length) + COLORS.length) % COLORS.length];
}
