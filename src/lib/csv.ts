import type { ISODate } from '../types';

/** RFC 4180 CSV parser: handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(input: string): string[][] {
  const t = input.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Parse "2,000", "$4,800", "(1,059)", " 8.50 ", "-" → number or null. */
export function num(s: string | null | undefined): number | null {
  let v = (s ?? '').trim();
  if (!v || v === '-') return null;
  const negative = /^\(.*\)$/.test(v);
  v = v.replace(/[()$,\s]/g, '');
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Parse "7-Nov", "07-Nov-26" or "7 Nov 2026" to an ISO date.
 * When the year is missing, picks the year that puts the date closest to `ref`.
 */
export function parseDay(s: string | null | undefined, ref: Date = new Date()): ISODate | null {
  const m = /^(\d{1,2})[-/ ]([A-Za-z]{3})[A-Za-z]*(?:[-/ ](\d{2,4}))?$/.exec((s ?? '').trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  let year: number;
  if (m[3]) {
    year = Number(m[3]);
    if (year < 100) year += 2000;
  } else {
    const r = ref.getTime();
    const base = ref.getUTCFullYear();
    let best = Date.UTC(base, month, day);
    for (const y of [base - 1, base + 1]) {
      const t = Date.UTC(y, month, day);
      if (Math.abs(t - r) < Math.abs(best - r)) best = t;
    }
    year = new Date(best).getUTCFullYear();
  }
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Calendar days from a to b (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}
