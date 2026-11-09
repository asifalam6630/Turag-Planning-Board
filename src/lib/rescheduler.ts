import type { LineLoad, PlanRow } from '../types';
import type { ProposedChange } from '../components/AutoResolveModal';
import { bisectLeft, bisectRight } from 'd3';
import { daysBetween } from './csv';

export function solveCapacityConflicts(
  plan: PlanRow[],
  load: LineLoad[],
  calendar: string[],
  lines: number[]
): { proposedChanges: ProposedChange[]; conflictsBeforeCount: number } {
  const smvMap = new Map(plan.map((r) => [r.id, r.smv ?? 0]));

  // Find all overloaded (line, date) slots
  const overloadedSlots = load.filter((l) => l.availMin > 0 && l.planMin > l.availMin);
  const conflictsBeforeCount = overloadedSlots.length;

  if (conflictsBeforeCount === 0) {
    return { proposedChanges: [], conflictsBeforeCount: 0 };
  }

  // Create a map of available capacity per (line, date)
  const key = (line: number, date: string) => `${line}|${date}`;
  const availMap = new Map<string, number>();
  const currentPlanMinMap = new Map<string, number>();

  load.forEach((l) => {
    const k = key(l.line, l.date);
    availMap.set(k, l.availMin);
    currentPlanMinMap.set(k, l.planMin);
  });

  // Identify orders running on overloaded slots
  const overloadedKeys = new Set(overloadedSlots.map((s) => key(s.line, s.date)));
  const candidateOrders: PlanRow[] = [];

  for (const r of plan) {
    if (!r.psd || !r.ped) continue;
    // Check if order overlaps any overloaded date on its current line
    const sIdx = Math.max(0, bisectLeft(calendar, r.psd));
    const eIdx = Math.min(calendar.length - 1, bisectRight(calendar, r.ped) - 1);
    let isOverloaded = false;
    for (let i = sIdx; i <= eIdx; i++) {
      if (overloadedKeys.has(key(r.line, calendar[i]))) {
        isOverloaded = true;
        break;
      }
    }
    if (isOverloaded) {
      candidateOrders.push(r);
    }
  }

  const workDaysCount = (a: string, b: string) => {
    if (!calendar.length) return daysBetween(a, b) + 1;
    return Math.max(1, bisectRight(calendar, b) - bisectLeft(calendar, a));
  };

  const getPedFromPsd = (psd: string, durationDays: number): string => {
    const startIdx = bisectLeft(calendar, psd);
    const endIdx = Math.min(calendar.length - 1, startIdx + durationDays - 1);
    return calendar[endIdx] ?? psd;
  };

  const proposedChanges: ProposedChange[] = [];
  const simulatedPlanMinMap = new Map(currentPlanMinMap);

  for (const r of candidateOrders) {
    if (!r.psd || !r.ped) continue;
    const dur = workDaysCount(r.psd, r.ped);
    const orderDailyMin = Math.round(((r.planQty ?? 0) * (r.smv ?? 0)) / dur);
    const currentLine = r.line;
    const currentPsd = r.psd;
    const currentPed = r.ped;

    // Search candidate line & date shift
    let bestCandidate: { line: number; psd: string; ped: string; isDateShift: boolean; peakRatio: number } | null = null;

    // Try candidate lines
    for (const candLine of lines) {
      // Try candidate start dates around currentPsd (-2 days to +10 days)
      const curPsdIdx = bisectLeft(calendar, currentPsd);
      const minPsdIdx = Math.max(0, curPsdIdx - 2);
      const maxPsdIdx = Math.min(calendar.length - 1, curPsdIdx + 10);

      for (let pIdx = minPsdIdx; pIdx <= maxPsdIdx; pIdx++) {
        const candPsd = calendar[pIdx];
        const candPed = getPedFromPsd(candPsd, dur);

        // Calculate peak capacity ratio if moved to candLine at candPsd..candPed
        let maxPeakRatio = 0;
        let valid = true;

        const candStartIdx = bisectLeft(calendar, candPsd);
        const candEndIdx = bisectRight(calendar, candPed) - 1;

        for (let dIdx = candStartIdx; dIdx <= candEndIdx; dIdx++) {
          const dDate = calendar[dIdx];
          const k = key(candLine, dDate);
          const avail = availMap.get(k) ?? 0;
          let currentPlanMin = simulatedPlanMinMap.get(k) ?? 0;

          // If on same line, subtract order's contribution first
          if (candLine === currentLine && dDate >= currentPsd && dDate <= currentPed) {
            currentPlanMin = Math.max(0, currentPlanMin - orderDailyMin);
          }

          const projectedPlanMin = currentPlanMin + orderDailyMin;

          if (avail > 0) {
            const ratio = projectedPlanMin / avail;
            if (ratio > maxPeakRatio) maxPeakRatio = ratio;
            if (ratio > 1.0) {
              valid = false;
              break;
            }
          }
        }

        if (valid && maxPeakRatio <= 1.0) {
          const isDateShift = candPsd !== currentPsd;
          const isLineShift = candLine !== currentLine;

          if (!isLineShift && !isDateShift) continue; // Skip same allocation

          if (!bestCandidate || maxPeakRatio < bestCandidate.peakRatio) {
            bestCandidate = {
              line: candLine,
              psd: candPsd,
              ped: candPed,
              isDateShift,
              peakRatio: maxPeakRatio,
            };
          }
        }
      }
    }

    if (bestCandidate) {
      // Update simulated map
      const origStartIdx = bisectLeft(calendar, currentPsd);
      const origEndIdx = bisectRight(calendar, currentPed) - 1;
      for (let dIdx = origStartIdx; dIdx <= origEndIdx; dIdx++) {
        const k = key(currentLine, calendar[dIdx]);
        const cur = simulatedPlanMinMap.get(k) ?? 0;
        simulatedPlanMinMap.set(k, Math.max(0, cur - orderDailyMin));
      }

      const newStartIdx = bisectLeft(calendar, bestCandidate.psd);
      const newEndIdx = bisectRight(calendar, bestCandidate.ped) - 1;
      for (let dIdx = newStartIdx; dIdx <= newEndIdx; dIdx++) {
        const k = key(bestCandidate.line, calendar[dIdx]);
        const cur = simulatedPlanMinMap.get(k) ?? 0;
        simulatedPlanMinMap.set(k, cur + orderDailyMin);
      }

      const reasonText =
        bestCandidate.line !== currentLine
          ? `Reassigned to Line ${bestCandidate.line} (${Math.round(bestCandidate.peakRatio * 100)}% load)`
          : `Shifted start to ${bestCandidate.psd} (${Math.round(bestCandidate.peakRatio * 100)}% load)`;

      proposedChanges.push({
        cardId: r.id,
        po: r.po,
        style: r.style,
        buyer: r.buyer,
        qty: r.planQty ?? 0,
        currentLine,
        currentPsd,
        currentPed,
        proposedLine: bestCandidate.line,
        proposedPsd: bestCandidate.psd,
        proposedPed: bestCandidate.ped,
        reason: reasonText,
        isDateShift: bestCandidate.isDateShift,
      });
    }
  }

  return { proposedChanges, conflictsBeforeCount };
}
