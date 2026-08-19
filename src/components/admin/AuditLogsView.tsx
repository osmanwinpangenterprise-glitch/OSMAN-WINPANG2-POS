import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuditLog } from '../../types';
import { exportToCSV } from '../../services/reportService';
import { useToast } from '../../context/ToastContext';
import {
  ShieldAlert,
  Search,
  Download,
  Filter,
  Activity,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';

export function AuditLogsView() {
  const { success } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(150));
      const snap = await getDocs(q);
      setLogs(snap.docs.map((d) => d.data() as AuditLog));
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSev = severityFilter === 'ALL' || l.severity === severityFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        (l.targetId && l.targetId.toLowerCase().includes(q));

      return matchesSev && matchesSearch;
    });
  }, [logs, severityFilter, search]);

  const handleExportCSV = () => {
    const rows = logs.map((l) => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      Action: l.action,
      Severity: l.severity,
      User: l.userName,
      Role: l.userRole,
      Target: l.target || '',
      TargetId: l.targetId || '',
      Details: l.details,
    }));
    exportToCSV('system-audit-trail', rows);
    success('CSV Exported', 'Audit ledger downloaded.');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Enterprise Security & System Audit Trail</h2>
          <p className="text-xs text-slate-400">
            Immutable log of all financial voids, inventory adjustments, user logins, and price modifications
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export Audit Log CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by action, details, or user..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Severity Levels</option>
            <option value="CRITICAL">Critical Alerts</option>
            <option value="WARNING">Warnings (Voids, Discrepancies)</option>
            <option value="INFO">Informational Events</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Event Action</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Actor / Operator</th>
                <th className="px-4 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.logId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap font-mono">
                      {new Date(l.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-200 font-mono text-[11px] block">{l.action}</span>
                      {l.target && <span className="text-[10px] text-slate-500">{l.target}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          l.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : l.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {l.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200 block">{l.userName}</span>
                      <span className="text-[10px] text-slate-500">{l.userRole}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-md">
                      <p className="line-clamp-2">{l.details}</p>
                      {l.targetId && (
                        <span className="text-[10px] font-mono text-emerald-400/80 block mt-0.5">
                          ID: {l.targetId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
