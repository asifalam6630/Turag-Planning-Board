import { useState, useMemo, useEffect } from 'react';

const CALENDAR_OVERRIDES_KEY = 'turag-calendar-day-overrides';

export interface DayOverride {
  dateIso: string;
  mode: 'active' | 'holiday';
  title?: string;
  regHours?: number;
  otHours?: number;
  notes?: string;
}

interface GoogleCalendarViewProps {
  calendar: string[]; // ISO date strings of default active factory working days e.g. "2026-11-01"
  onCalendarChange?: (updatedCalendar: string[]) => void;
}

export function GoogleCalendarView({ calendar, onCalendarChange }: GoogleCalendarViewProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'schedule'>('month');
  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (calendar.length > 0) {
      const year = parseInt(calendar[0].slice(0, 4), 10);
      if (!isNaN(year)) return year;
    }
    return 2026;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (calendar.length > 0) {
      const m = parseInt(calendar[0].slice(5, 7), 10) - 1;
      if (!isNaN(m)) return m;
    }
    return 10; // November (0-indexed)
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Day Overrides persistent state
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayOverride>>(() => {
    try {
      const stored = localStorage.getItem(CALENDAR_OVERRIDES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Edit form modal state for selected day
  const [editingForm, setEditingForm] = useState<Partial<DayOverride>>({
    mode: 'active',
    title: '',
    regHours: 8,
    otHours: 2,
    notes: '',
  });

  // Effective working days map considering manual user overrides
  const effectiveWorkingDaySet = useMemo(() => {
    const defaultSet = new Set(calendar);
    const result = new Set<string>();

    // Apply default calendar plus day overrides
    defaultSet.forEach((d) => {
      const ov = dayOverrides[d];
      if (ov) {
        if (ov.mode === 'active') result.add(d);
      } else {
        result.add(d);
      }
    });

    // Add any manually activated days (e.g. Fridays)
    Object.values(dayOverrides).forEach((ov) => {
      if (ov.mode === 'active') {
        result.add(ov.dateIso);
      } else if (ov.mode === 'holiday') {
        result.delete(ov.dateIso);
      }
    });

    return result;
  }, [calendar, dayOverrides]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Populate edit form when selectedDay changes
  useEffect(() => {
    if (!selectedDay) return;
    const ov = dayOverrides[selectedDay];
    const isFriday = new Date(selectedDay).getDay() === 5;
    const isDefaultWorking = calendar.includes(selectedDay);

    if (ov) {
      setEditingForm({
        dateIso: selectedDay,
        mode: ov.mode,
        title: ov.title || (ov.mode === 'active' ? 'Custom Shift' : 'Custom Holiday'),
        regHours: ov.regHours ?? 8,
        otHours: ov.otHours ?? 2,
        notes: ov.notes || '',
      });
    } else if (isFriday) {
      setEditingForm({
        dateIso: selectedDay,
        mode: 'holiday',
        title: 'Friday Roster Off',
        regHours: 8,
        otHours: 2,
        notes: 'Standard Factory Weekly Holiday',
      });
    } else if (isDefaultWorking) {
      setEditingForm({
        dateIso: selectedDay,
        mode: 'active',
        title: 'Active Production Shift',
        regHours: 8,
        otHours: 2,
        notes: 'Regular Factory Shift',
      });
    } else {
      setEditingForm({
        dateIso: selectedDay,
        mode: 'holiday',
        title: 'Roster Off',
        regHours: 8,
        otHours: 0,
        notes: '',
      });
    }
  }, [selectedDay, dayOverrides, calendar]);

  const handleSaveDayOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    const newOv: DayOverride = {
      dateIso: selectedDay,
      mode: editingForm.mode || 'active',
      title: editingForm.title || (editingForm.mode === 'active' ? 'Active Production Shift' : 'Holiday'),
      regHours: Number(editingForm.regHours || 8),
      otHours: Number(editingForm.otHours || 0),
      notes: editingForm.notes || '',
    };

    setDayOverrides((prev) => {
      const updated = { ...prev, [selectedDay]: newOv };
      try {
        localStorage.setItem(CALENDAR_OVERRIDES_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });

    if (onCalendarChange) {
      const newWorkingDays = Array.from(effectiveWorkingDaySet);
      if (newOv.mode === 'active' && !newWorkingDays.includes(selectedDay)) {
        newWorkingDays.push(selectedDay);
      } else if (newOv.mode === 'holiday') {
        const idx = newWorkingDays.indexOf(selectedDay);
        if (idx !== -1) newWorkingDays.splice(idx, 1);
      }
      onCalendarChange(newWorkingDays.sort());
    }

    setSelectedDay(null);
  };

  const handleResetDayOverride = () => {
    if (!selectedDay) return;
    setDayOverrides((prev) => {
      const updated = { ...prev };
      delete updated[selectedDay];
      try {
        localStorage.setItem(CALENDAR_OVERRIDES_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
    setSelectedDay(null);
  };

  // Generate Month Grid Days
  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateIso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWorkingDay: boolean;
      isFriday: boolean;
      isToday: boolean;
      override?: DayOverride;
    }> = [];

    // Previous month overflow days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const pDay = daysInPrevMonth - i;
      const pMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const pYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const iso = `${pYear}-${String(pMonth + 1).padStart(2, '0')}-${String(pDay).padStart(2, '0')}`;
      const dayOfWeek = new Date(pYear, pMonth, pDay).getDay();
      days.push({
        dateIso: iso,
        dayNumber: pDay,
        isCurrentMonth: false,
        isWorkingDay: effectiveWorkingDaySet.has(iso),
        isFriday: dayOfWeek === 5,
        isToday: false,
        override: dayOverrides[iso],
      });
    }

    // Current month days
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      days.push({
        dateIso: iso,
        dayNumber: d,
        isCurrentMonth: true,
        isWorkingDay: effectiveWorkingDaySet.has(iso),
        isFriday: dayOfWeek === 5,
        isToday: iso === todayStr,
        override: dayOverrides[iso],
      });
    }

    // Next month overflow days (up to 42 total cells)
    const remaining = 42 - days.length;
    for (let n = 1; n <= remaining; n++) {
      const nMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const iso = `${nYear}-${String(nMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      const dayOfWeek = new Date(nYear, nMonth, n).getDay();
      days.push({
        dateIso: iso,
        dayNumber: n,
        isCurrentMonth: false,
        isWorkingDay: effectiveWorkingDaySet.has(iso),
        isFriday: dayOfWeek === 5,
        isToday: false,
        override: dayOverrides[iso],
      });
    }

    return days;
  }, [currentYear, currentMonth, effectiveWorkingDaySet, dayOverrides]);

  const activeDaysInCurrentMonth = useMemo(() => {
    return monthGridDays.filter((d) => d.isCurrentMonth && d.isWorkingDay).length;
  }, [monthGridDays]);

  return (
    <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-md text-xs space-y-0">
      {/* Google Calendar Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
        {/* Left Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <span className="font-bold text-sm tracking-tight">Active Factory Working Days &amp; Shift Roster</span>
          </div>

          <div className="h-5 w-px bg-[var(--color-border-line)] hidden sm:block" />

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 font-bold rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg)] transition-colors cursor-pointer text-base leading-none"
              title="Previous Month"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg)] transition-colors cursor-pointer text-base leading-none"
              title="Next Month"
            >
              ›
            </button>
          </div>

          <h3 className="text-base font-bold text-[var(--color-fg)] min-w-[150px]">
            {monthNames[currentMonth]} {currentYear}
          </h3>

          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            {activeDaysInCurrentMonth} Active Days
          </span>
          {Object.keys(dayOverrides).length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
              ✏️ {Object.keys(dayOverrides).length} Manual Roster Overrides
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Search dates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] min-w-[130px]"
          />

          <div className="inline-flex rounded-lg border border-[var(--color-border-line)] p-0.5 bg-[var(--color-bg)]">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 font-bold rounded-md transition-colors cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)] shadow-xs'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 font-bold rounded-md transition-colors cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)] shadow-xs'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode('schedule')}
              className={`px-3 py-1 font-bold rounded-md transition-colors cursor-pointer ${
                viewMode === 'schedule'
                  ? 'bg-[var(--color-fg)] text-[var(--color-bg)] shadow-xs'
                  : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
              }`}
            >
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="w-full border-t border-[var(--color-border-line)]">
          {/* Weekday Header Row */}
          <div className="grid grid-cols-7 bg-[var(--color-panel)] border-b border-[var(--color-border-line)] text-center font-bold text-[11px] text-[var(--color-fg-muted)] py-2">
            {weekDayNames.map((day) => (
              <div key={day} className={day === 'FRI' ? 'text-rose-500 font-extrabold' : ''}>
                {day}
              </div>
            ))}
          </div>

          {/* Month Calendar Grid (6 rows of 7 days) */}
          <div className="grid grid-cols-7 border-b border-[var(--color-border-line)] divide-x divide-y divide-[var(--color-border-line)] bg-[var(--color-bg)]">
            {monthGridDays.map((item) => {
              const isSelected = selectedDay === item.dateIso;
              const ov = item.override;

              return (
                <div
                  key={item.dateIso}
                  onClick={() => setSelectedDay(item.dateIso)}
                  className={`min-h-[102px] p-1.5 flex flex-col justify-between transition-colors cursor-pointer group ${
                    !item.isCurrentMonth ? 'bg-[var(--color-panel)]/30 opacity-60' : 'hover:bg-[var(--color-panel)]/60'
                  } ${isSelected ? 'ring-2 ring-sky-500 bg-sky-500/5' : ''}`}
                >
                  {/* Top Bar: Date Number Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold ${
                        item.isToday
                          ? 'bg-sky-500 text-white shadow-xs font-extrabold'
                          : item.isCurrentMonth
                          ? 'text-[var(--color-fg)]'
                          : 'text-[var(--color-fg-muted)]'
                      }`}
                    >
                      {item.dayNumber}
                    </span>

                    <div className="flex items-center gap-1">
                      {ov && <span className="text-[10px]" title="Manually edited day roster">✏️</span>}
                      {item.isWorkingDay && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-2xs" title="Active Working Day" />
                      )}
                    </div>
                  </div>

                  {/* Day Event Content Cards (Google Calendar Pill Style) */}
                  <div className="space-y-1 my-1">
                    {item.isWorkingDay ? (
                      <div className="p-1.5 rounded bg-emerald-500/15 border-l-3 border-emerald-500 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 space-y-0.5 shadow-2xs group-hover:scale-[1.02] transition-transform">
                        <div className="flex items-center justify-between">
                          <span>{ov?.title || (item.isFriday ? '🟢 Friday OT Shift' : '🟢 Active Shift')}</span>
                          <span>{(ov?.regHours ?? 8) + (ov?.otHours ?? 2)}h</span>
                        </div>
                        <div className="text-[9px] opacity-85 font-normal">
                          {((ov?.regHours ?? 8) + (ov?.otHours ?? 2) - 1.5) * 60} Net Mins · 15 Lines
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 rounded bg-rose-500/10 border-l-3 border-rose-500 text-[10px] font-bold text-rose-500 space-y-0.5 opacity-85">
                        <div className="truncate">{ov?.title || (item.isFriday ? '🔴 Friday Off' : '🔴 Factory Holiday')}</div>
                        <div className="text-[9px] font-normal">Roster Off (0 mins)</div>
                      </div>
                    )}
                  </div>

                  {/* Bottom indicator */}
                  <div className="text-[9px] text-[var(--color-fg-muted)] text-right font-mono">
                    {item.isWorkingDay ? `${((ov?.regHours ?? 8) + (ov?.otHours ?? 2) - 1.5) * 60}m` : '0m'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="w-full p-4 space-y-3 bg-[var(--color-bg)]">
          <div className="font-bold text-xs text-[var(--color-fg-muted)] pb-2 border-b border-[var(--color-border-line)] flex items-center justify-between">
            <span>Weekly Shift Breakdown &amp; Hourly Capacity Overview ({monthNames[currentMonth]} {currentYear})</span>
            <span className="text-sky-500 font-semibold">Click any day to edit working hours or holiday status</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthGridDays.slice(0, 7).map((dayItem) => {
              const ov = dayItem.override;
              return (
                <div
                  key={dayItem.dateIso}
                  onClick={() => setSelectedDay(dayItem.dateIso)}
                  className="p-3 rounded-xl border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer space-y-2 text-center"
                >
                  <span className="font-bold text-xs text-sky-500 block">{dayItem.dateIso}</span>
                  {dayItem.isWorkingDay ? (
                    <div className="p-2 rounded bg-emerald-500/15 border border-emerald-500/40 space-y-1">
                      <span className="font-bold text-xs text-emerald-600 block">🟢 Active Shift</span>
                      <span className="text-[10px] text-[var(--color-fg-muted)] block">Reg {ov?.regHours ?? 8}h + OT {ov?.otHours ?? 2}h</span>
                      <span className="text-[10px] font-bold text-emerald-500 block">
                        {((ov?.regHours ?? 8) + (ov?.otHours ?? 2) - 1.5) * 60} Net Mins
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-rose-500/15 border border-rose-500/40 space-y-1">
                      <span className="font-bold text-xs text-rose-500 block">🔴 Holiday Off</span>
                      <span className="text-[10px] text-[var(--color-fg-muted)] block">Roster Day Off</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE LIST VIEW */}
      {viewMode === 'schedule' && (
        <div className="w-full p-4 space-y-3 bg-[var(--color-bg)]">
          <div className="font-bold text-xs text-[var(--color-fg-muted)] pb-2 border-b border-[var(--color-border-line)] flex items-center justify-between">
            <span>Chronological Working Days Schedule &amp; Overrides</span>
            <span className="text-sky-500">Click any date row to edit shift details</span>
          </div>
          <div className="max-h-[440px] overflow-y-auto space-y-1.5 pr-1">
            {monthGridDays
              .filter((d) => d.isCurrentMonth && (!searchQuery || d.dateIso.toLowerCase().includes(searchQuery.toLowerCase())))
              .map((item) => {
                const ov = item.override;
                return (
                  <div
                    key={item.dateIso}
                    onClick={() => setSelectedDay(item.dateIso)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--color-border-line)] bg-[var(--color-panel)] hover:bg-[var(--color-bg)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sky-500 w-28">{item.dateIso}</span>
                      {item.isWorkingDay ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          🟢 {ov?.title || (item.isFriday ? 'Friday OT Shift' : 'Active Production Day')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                          🔴 {ov?.title || (item.isFriday ? 'Friday Roster Off' : 'Factory Holiday')}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--color-fg-muted)]">
                        Reg: {ov?.regHours ?? 8}h · OT: {ov?.otHours ?? (item.isWorkingDay ? 2 : 0)}h
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="font-bold text-[var(--color-ok)]">
                        {item.isWorkingDay ? `${((ov?.regHours ?? 8) + (ov?.otHours ?? 2) - 1.5) * 60} Net Mins` : '0 Mins'}
                      </span>
                      <span className="text-xs text-sky-500 font-bold">Edit ✏️</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* EDIT WORKING DAY & SHIFT ROSTER MODAL */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg)] rounded-xl border border-[var(--color-border-line)] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-line)]">
              <div>
                <span className="text-[10px] text-[var(--color-fg-muted)] uppercase tracking-wider block font-semibold">
                  Google Calendar Shift &amp; Working Day Editor
                </span>
                <h3 className="text-base font-bold text-sky-500">{selectedDay}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1 text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDayOverride} className="space-y-3.5 text-xs">
              {/* Shift Mode Toggle */}
              <div>
                <label className="block mb-1.5 font-bold">Production Shift Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingForm({ ...editingForm, mode: 'active' })}
                    className={`p-2.5 rounded-lg border font-bold text-center cursor-pointer transition-all ${
                      editingForm.mode === 'active'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'bg-[var(--color-panel)] border-[var(--color-border-line)] text-[var(--color-fg-muted)]'
                    }`}
                  >
                    🟢 Active Shift Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingForm({ ...editingForm, mode: 'holiday' })}
                    className={`p-2.5 rounded-lg border font-bold text-center cursor-pointer transition-all ${
                      editingForm.mode === 'holiday'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-500 shadow-xs'
                        : 'bg-[var(--color-panel)] border-[var(--color-border-line)] text-[var(--color-fg-muted)]'
                    }`}
                  >
                    🔴 Holiday / Off Mode
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-semibold">Shift Label / Event Title</label>
                <input
                  type="text"
                  value={editingForm.title || ''}
                  onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                  placeholder={editingForm.mode === 'active' ? 'e.g. Friday Special Production' : 'e.g. Factory Holiday'}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>

              {editingForm.mode === 'active' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold">Regular Working Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="16"
                      value={editingForm.regHours}
                      onChange={(e) => setEditingForm({ ...editingForm, regHours: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold">Planned Overtime (OT Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="8"
                      value={editingForm.otHours}
                      onChange={(e) => setEditingForm({ ...editingForm, otHours: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)] font-bold text-amber-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mb-1 font-semibold">Planner Notes / Reason</label>
                <input
                  type="text"
                  value={editingForm.notes || ''}
                  onChange={(e) => setEditingForm({ ...editingForm, notes: e.target.value })}
                  placeholder="e.g. Approved by Factory GM for urgent PO delivery"
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-bg)]"
                />
              </div>

              {/* Formula Preview Box */}
              <div className="p-2.5 rounded-lg bg-[var(--color-panel)] border border-[var(--color-border-line)] text-[11px] font-mono flex items-center justify-between">
                <span>Calculated Net Production Minutes:</span>
                <span className="font-bold text-emerald-500">
                  {editingForm.mode === 'active'
                    ? `${((Number(editingForm.regHours || 8) + Number(editingForm.otHours || 0)) - 1.5) * 60} mins`
                    : '0 mins'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-line)]">
                {dayOverrides[selectedDay] ? (
                  <button
                    type="button"
                    onClick={handleResetDayOverride}
                    className="px-3 py-1.5 rounded border border-[var(--color-border-line)] text-[var(--color-bad)] hover:bg-[var(--color-bad)]/10 cursor-pointer font-medium"
                  >
                    Reset to Default Roster
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="px-3.5 py-1.5 rounded border border-[var(--color-border-line)] bg-[var(--color-panel)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-bold rounded bg-[var(--color-fg)] text-[var(--color-bg)] cursor-pointer shadow-xs"
                  >
                    Save Day Roster
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
