import { useState } from 'react';
import type { AuditLogRecord } from '../types';

interface AuditLogViewProps {
  logs: AuditLogRecord[];
  activeRole: string;
}

export function AuditLogView({ logs, activeRole }: AuditLogViewProps) {
  const [roleFilter, setRoleFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((l) => {
    const matchRole = roleFilter === 'All' || l.userRole === roleFilter;
    const matchSearch =
      !search ||
      [l.action, l.module, l.userName, l.details].some((v) =>
        v.toLowerCase().includes(search.toLowerCase())
      );
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border-line)]">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Role-Based Access &amp; Activity Audit Log</h2>
          <p className="text-xs text-[var(--color-fg-muted)]">
            Traceable compliance ledger tracking all order insertions, line reallocations, split events, and configuration edits
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-fg-muted)]">Active Session:</span>
          <span className="px-2.5 py-1 rounded-lg font-bold bg-[var(--color-fg)] text-[var(--color-bg)]">
            {activeRole}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-3 rounded-xl bg-[var(--color-panel)] border border-[var(--color-border-line)] flex flex-wrap items-center justify-between gap-2.5">
        <input
          type="search"
          placeholder="Filter audit actions, users, modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)]"
        />
        <div className="flex items-center gap-2 text-xs">
          <label className="text-[var(--color-fg-muted)]">User Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--color-border-line)] bg-[var(--color-bg)] cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Lead Planner">Lead Planner</option>
            <option value="Production Manager">Production Manager</option>
            <option value="Industrial Engineer">Industrial Engineer</option>
            <option value="Merchandiser">Merchandiser</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="border border-[var(--color-border-line)] rounded-xl overflow-hidden bg-[var(--color-bg)] shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[var(--color-panel)] border-b border-[var(--color-border-line)]">
            <tr>
              <th className="p-3 font-semibold">Timestamp</th>
              <th className="p-3 font-semibold">User Role</th>
              <th className="p-3 font-semibold">Module</th>
              <th className="p-3 font-semibold">Action Performed</th>
              <th className="p-3 font-semibold">Operation Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-line)]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--color-fg-muted)]">
                  No activity log entries found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--color-panel)]/50 transition-colors">
                  <td className="p-3 font-medium whitespace-nowrap text-[var(--color-fg-muted)]">
                    {log.timestamp}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-500 border border-sky-500/30">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap font-semibold">{log.module}</td>
                  <td className="p-3 whitespace-nowrap font-bold">{log.action}</td>
                  <td className="p-3 text-[var(--color-fg-muted)]">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
