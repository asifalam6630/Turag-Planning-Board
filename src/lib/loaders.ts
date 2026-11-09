import type { CapRow, DailyRow, ISODate, OrderRow, PlanRow } from '../types';
import { num, parseCsv, parseDay } from './csv';

const PLAN_HEADER = 'Line No';

interface PlanSheet {
  grid: string[][];
  header: string[];
  headerRow: number;
  ref: Date;
  title: string | null;
  producedCol: number;
  dayCols: Array<[ISODate, number]>;
}

/** Shared reading of the PRODUCTION PLAN tab. */
function readPlanSheet(text: string): PlanSheet {
  const grid = parseCsv(text);
  const tm = /Update on (\d{1,2}-[A-Za-z]{3}-\d{2,4})/.exec(text);
  const refIso = tm ? parseDay(tm[1]) : null;
  const ref = refIso ? new Date(refIso + 'T00:00:00Z') : new Date();
  const headerRow = grid.findIndex((r) => (r[0] ?? '').trim() === PLAN_HEADER);
  if (headerRow < 0) {
    throw new Error('Could not find the "Line No" header row. Is this a CSV export of the PRODUCTION PLAN tab?');
  }
  const header = grid[headerRow].map((c) => c.trim());
  const producedCol = header.findIndex((c) => /^Prod\w* up to/i.test(c));
  const dayCols: Array<[ISODate, number]> = [];
  if (producedCol >= 0) {
    header.forEach((c, i) => {
      if (i <= producedCol) return;
      const d = parseDay(c, ref);
      if (d) dayCols.push([d, i]);
    });
  }
  return { grid, header, headerRow, ref, title: tm ? `Production plan (update on ${tm[1]})` : null, producedCol, dayCols };
}

function columnFinder(header: string[]) {
  return (name: string, nth = 0): number => {
    const hits: number[] = [];
    header.forEach((c, i) => { if (c === name) hits.push(i); });
    return hits[nth] ?? -1;
  };
}

/** PRODUCTION PLAN → one row per PO on a line. */
export function loadPlan(text: string): { rows: PlanRow[]; title: string | null } {
  const s = readPlanSheet(text);
  const col = columnFinder(s.header);
  const rows: PlanRow[] = [];
  for (let i = s.headerRow + 1; i < s.grid.length; i++) {
    const r = s.grid[i];
    const v = (j: number) => (j < 0 ? '' : (r[j] ?? '').trim());
    const line = num(v(0));
    if (!line || !Number.isInteger(line)) continue;
    if (!v(col('Style')) && !v(col('PO'))) continue;
    const psdText = v(col('PSD'));
    let psd = parseDay(psdText, s.ref);
    const running = !psd && /run/i.test(psdText);
    if (!psd) {
      const first = s.dayCols.find(([, j]) => (num(v(j)) ?? 0) > 0);
      if (first) psd = first[0];
    }
    rows.push({
      id: `L${line}-R${i + 1}`,
      line,
      buyer: v(col('Buyer')) || '(blank)',
      category: v(col('Product Category')) || null,
      style: v(col('Style')),
      product: v(col('Product')) || null,
      po: v(col('PO')),
      combo: v(col('Combo')) || null,
      color: v(col('Color')) || null,
      orderQty: num(v(col('Order Qty.'))),
      planQty: num(v(col('Line Plan Qty.'))),
      smv: num(v(col('SMV / Pcs'))),
      fob: num(v(col('FOB / Pcs'))),
      cm: num(v(col('CM / Pcs'))),
      emb: v(col('Embellishment')) || null,
      tier: num(v(col('Plan Tier'))),
      mp: num(v(col('MP'))),
      wh: num(v(col('WH'))),
      poEtd: parseDay(v(col('PO ETD')), s.ref),
      updEtd: parseDay(v(col('Updated ETD')), s.ref),
      pcd: parseDay(v(col('PCD')), s.ref),
      inputDate: parseDay(v(col('Input Date')), s.ref),
      psd,
      running,
      ped: parseDay(v(col('PED')), s.ref),
      packFinish: parseDay(v(col('Packing Finish')), s.ref),
      inspection: parseDay(v(col('Plan Inspection')), s.ref),
      planEtd: parseDay(v(col('Plan ETD')), s.ref),
      status: v(col('Present Status')) || '(blank)',
      remarks: v(col('Remarks')) || null,
      planToDate: num(v(col('Plan Qty.', 1))),
      sewQty: num(v(col('Sewing Qty.'))),
      sewBal: num(v(col('Sewing Balance'))),
      daysInHand: num(v(col('Days in Hand'))),
      reqPerDay: num(v(col('Require Output/ Day'))),
      producedBefore: num(v(s.producedCol))
    });
  }
  return { rows, title: s.title };
}

/** PRODUCTION PLAN day columns → one row per PO per day with pieces planned. */
export function loadDaily(text: string): DailyRow[] {
  const s = readPlanSheet(text);
  const col = columnFinder(s.header);
  const rows: DailyRow[] = [];
  for (let i = s.headerRow + 1; i < s.grid.length; i++) {
    const r = s.grid[i];
    const v = (j: number) => (j < 0 ? '' : (r[j] ?? '').trim());
    const line = num(v(0));
    if (!line || !Number.isInteger(line)) continue;
    if (!v(col('Style')) && !v(col('PO'))) continue;
    for (const [date, j] of s.dayCols) {
      const qty = num(v(j));
      if (qty && qty > 0) {
        rows.push({ date, line, id: `L${line}-R${i + 1}`, po: v(col('PO')), style: v(col('Style')), buyer: v(col('Buyer')) || '(blank)', qty });
      }
    }
  }
  return rows;
}

/** MANPOWER / WORKING HOURS / NPT LOSS TIME → one value per line per date. */
export function loadCapacity(text: string): CapRow[] {
  const grid = parseCsv(text);
  let headerRow = -1;
  let dateCol = -1;
  for (let i = 0; i < grid.length && headerRow < 0; i++) {
    const j = grid[i].findIndex((c) => c.trim().toUpperCase() === 'DATE');
    if (j >= 0) { headerRow = i; dateCol = j; }
  }
  if (headerRow < 0) throw new Error('Could not find the "DATE" header row in this sheet.');
  const lineCols: Array<[number, number]> = [];
  grid[headerRow].forEach((c, j) => {
    const n = num(c);
    if (j > dateCol && n && Number.isInteger(n)) lineCols.push([n, j]);
  });
  const rows: CapRow[] = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const date = parseDay(grid[i][dateCol]);
    if (!date) continue;
    for (const [line, j] of lineCols) {
      const value = num(grid[i][j]);
      if (value != null) rows.push({ date, line, value });
    }
  }
  return rows;
}

/** ORDER SHEET → one row per order with a style or PO and a quantity. */
export function loadOrders(text: string): OrderRow[] {
  const grid = parseCsv(text);
  const headerRow = grid.findIndex((r) => r.some((c) => c.trim() === 'Order Date'));
  if (headerRow < 0) throw new Error('Could not find the "Order Date" header row. Is this a CSV export of the ORDER SHEET tab?');
  const col = columnFinder(grid[headerRow].map((c) => c.trim()));
  const rows: OrderRow[] = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const r = grid[i];
    const v = (j: number) => (j < 0 ? '' : (r[j] ?? '').trim());
    const orderQty = num(v(col('Order Qty.')));
    if ((!v(col('Style')) && !v(col('PO'))) || orderQty == null) continue;
    rows.push({
      id: `O${i + 1}`,
      orderDate: parseDay(v(col('Order Date'))),
      category: v(col('Product Category')) || null,
      buyer: v(col('Buyer')) || '(blank)',
      style: v(col('Style')),
      product: v(col('Product')) || null,
      po: v(col('PO')),
      combo: v(col('Combo')) || null,
      color: v(col('Color')) || null,
      orderQty,
      poEtd: parseDay(v(col('PO ETD'))),
      updEtd: parseDay(v(col('Updated ETD'))),
      smv: num(v(col('SMV / Pcs'))),
      fob: num(v(col('FOB / Pcs'))),
      cm: num(v(col('CM / Pcs'))),
      shippedQty: num(v(col('Shipped Qty.'))),
      shipBal: num(v(col('Ship Balance'))),
      status: v(col('Present Status')) || '(blank)',
      remarks: v(col('Remarks')) || null
    });
  }
  return rows;
}
