import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Calendar,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  User,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Globe,
  Radio,
  FileText,
  SlidersHorizontal,
  ArrowUpDown
} from 'lucide-react';

interface AuditLogItem {
  id: number;
  eventType: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  actorName: string;
  actorEmail: string | null;
  actorRole: string;
  actionTitle: string;
  detailsText: string;
  ipAddress: string;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface SummaryCounts {
  totalStored: number;
  infoCount: number;
  successCount: number;
  warningCount: number;
  dangerCount: number;
  examSubmitCount: number;
  examStartCount: number;
  proctoringCount: number;
  authCount: number;
}

export const AuditLogsManager: React.FC = () => {
  // Query States
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1
  });
  const [summary, setSummary] = useState<SummaryCounts | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([2026, 2025, 2024]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // View Mode: 'table' or 'terminal'
  const [viewMode, setViewMode] = useState<'table' | 'terminal'>('table');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [purging, setPurging] = useState<boolean>(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return '/api';
    }
    return 'http://localhost:5050/api';
  };

  const fetchLogs = async (pageOverride?: number) => {
    try {
      setLoading(true);
      const pageToFetch = pageOverride !== undefined ? pageOverride : currentPage;
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: pageSize.toString(),
        eventType: eventTypeFilter,
        severity: severityFilter,
        range: dateRangeFilter,
        year: yearFilter,
        search: searchQuery
      });

      const res = await fetch(`${getApiBaseUrl()}/admin/audit-logs?${params.toString()}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { page: 1, limit: pageSize, totalCount: 0, totalPages: 1 });
        setSummary(data.summary || null);
        if (data.availableYears && Array.isArray(data.availableYears)) {
          const merged = Array.from(new Set([...data.availableYears, 2026, 2025, 2024])).sort((a, b) => b - a);
          setAvailableYears(merged);
        }
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch on filter or page change
  useEffect(() => {
    fetchLogs();
  }, [currentPage, pageSize, eventTypeFilter, severityFilter, dateRangeFilter, yearFilter]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchLogs(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, currentPage, pageSize, eventTypeFilter, severityFilter, dateRangeFilter, yearFilter, searchQuery]);

  // Scroll terminal to bottom when in terminal view
  useEffect(() => {
    if (viewMode === 'terminal' && terminalEndRef.current) {
      terminalEndRef.current.scrollTop = 0;
    }
  }, [logs, viewMode]);

  const handlePurge = async () => {
    const option = prompt(
      "⚠️ Purge Audit History: Enter number of days (e.g. '30' for older than 30 days, '7' for older than 7 days, or 'all' to clear all logs):",
      "30"
    );
    if (!option) return;

    const daysVal = option.trim();
    if (!daysVal) return;

    const confirmMsg = daysVal === 'all'
      ? '🚨 ARE YOU ABSOLUTELY SURE? This will permanently delete ALL audit activity logs forever.'
      : `Are you sure you want to permanently delete audit logs older than ${daysVal} days?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setPurging(true);
      const res = await fetch(`${getApiBaseUrl()}/admin/audit-logs/purge?days=${daysVal}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Audit logs purged successfully.');
        setCurrentPage(1);
        fetchLogs(1);
      } else {
        alert('Failed to purge audit logs.');
      }
    } catch (e) {
      console.error('Purge error:', e);
      alert('Error occurred while purging logs.');
    } finally {
      setPurging(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ['ID', 'Event Type', 'Severity', 'Actor Name', 'Actor Email', 'Actor Role', 'Action Title', 'Details', 'IP Address', 'Timestamp'];
    const rows = logs.map(l => [
      l.id,
      `"${l.eventType}"`,
      `"${l.severity}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorEmail || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${(l.actionTitle || '').replace(/"/g, '""')}"`,
      `"${(l.detailsText || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
      `"${l.createdAt || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `evalnium_audit_logs_${dateRangeFilter}_${Date.now()}.csv`);
    link.click();
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'success':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>SUCCESS</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>WARNING</span>
          </span>
        );
      case 'danger':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>ALERT</span>
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>INFO</span>
          </span>
        );
    }
  };

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'exam_submit':
        return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">🎯 SUBMIT</span>;
      case 'exam_start':
        return <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-mono">📝 START</span>;
      case 'proctoring_alert':
        return <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">🚨 PROCTOR</span>;
      case 'user_login':
        return <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-mono">🔑 LOGIN</span>;
      case 'user_register':
        return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-mono">👤 REGISTER</span>;
      case 'admin_action':
        return <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-mono">🛠️ ADMIN</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                PERMANENT AUDIT VAULT
              </span>
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${autoRefresh ? 'animate-pulse' : ''}`} />
                <span>{autoRefresh ? 'Live Event Stream Active' : 'Polling Paused'}</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center space-x-2 mt-1.5">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span>Terminal & Examination Activity Audit Log Studio</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Forensic audit archive of student logins, examination starts, submissions, anti-cheating alerts, and administrative actions with full pagination.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Table Grid</span>
              </button>
              <button
                onClick={() => setViewMode('terminal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'terminal'
                    ? 'bg-slate-950 text-emerald-400 shadow-xs border border-slate-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Live Terminal Feed</span>
              </button>
            </div>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                autoRefresh
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
              title="Toggle automatic 5-second polling"
            >
              <Radio className={`w-3.5 h-3.5 ${autoRefresh ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span>{autoRefresh ? 'Auto (5s)' : 'Manual'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchLogs()}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 flex items-center space-x-1.5 transition-all disabled:opacity-50"
              title="Refresh logs now"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={!logs.length}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
              title="Export current filtered view to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Purge Button */}
            <button
              onClick={handlePurge}
              disabled={purging}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center space-x-1.5 transition-all disabled:opacity-50"
              title="Purge logs older than X days"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>{purging ? 'Purging...' : 'Purge Vault'}</span>
            </button>
          </div>
        </div>

        {/* Top 5 KPI Metrics */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">Total Archived</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">{summary.totalStored}</div>
              <p className="text-[10px] text-slate-500 font-medium">Permanent event entries</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 font-mono">Exam Submissions</span>
              <div className="text-xl font-black text-emerald-600 font-mono mt-1">{summary.examSubmitCount}</div>
              <p className="text-[10px] text-slate-500 font-medium">Completed test attempts</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 font-mono">Anti-Cheating Alerts</span>
              <div className="text-xl font-black text-rose-600 font-mono mt-1">{summary.proctoringCount}</div>
              <p className="text-[10px] text-slate-500 font-medium">Proctoring & tab switches</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 font-mono">Student Logins</span>
              <div className="text-xl font-black text-indigo-600 font-mono mt-1">{summary.authCount}</div>
              <p className="text-[10px] text-slate-500 font-medium">Logins & registrations</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 font-mono">Exam Starts</span>
              <div className="text-xl font-black text-cyan-600 font-mono mt-1">{summary.examStartCount}</div>
              <p className="text-[10px] text-slate-500 font-medium">Launched CBT sessions</p>
            </div>
          </div>
        )}

        {/* Multi-Dimensional Filter Bar */}
        <div className="space-y-3 pt-1">
          {/* Top Row: Search & Date Range */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate name, email, action keyword, IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range & Year Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Year Dropdown Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 ml-1.5" />
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Year:</span>
                <select
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-lg px-2 py-1 focus:outline-hidden focus:border-indigo-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Years (Cumulative)</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr.toString()}>Year {yr}</option>
                  ))}
                </select>
              </div>

              {/* Date Preset Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days' },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setDateRangeFilter(r.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                      dateRangeFilter === r.id
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Event Type Pills & Severity Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            {/* Event Type Filters */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Event Type:</span>
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'exam_submit', label: '🎯 Exam Submissions' },
                { id: 'exam_start', label: '📝 Exam Starts' },
                { id: 'proctoring_alert', label: '🚨 Proctor Alerts' },
                { id: 'user_login', label: '🔑 User Logins' },
                { id: 'user_register', label: '👤 Registrations' },
                { id: 'admin_action', label: '🛠️ Admin Operations' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setEventTypeFilter(t.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                    eventTypeFilter === t.id
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Severities</option>
                <option value="info">Info ℹ️</option>
                <option value="success">Success ✅</option>
                <option value="warning">Warning ⚠️</option>
                <option value="danger">Danger / Alert 🚨</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Terminal */}
      {viewMode === 'terminal' ? (
        /* Hacker-Style Live Terminal View */
        <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl p-6 font-mono text-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-400 text-xs font-bold ml-2">evalnium_audit_terminal@live-stream:~$</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>LIVE BUFFER STREAM (Showing {logs.length} events)</span>
            </div>
          </div>

          <div
            ref={terminalEndRef}
            className="space-y-2.5 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800"
          >
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-20">No audit events match your filter query.</p>
            ) : (
              logs.map((log) => {
                const dateStr = new Date(log.createdAt).toLocaleTimeString();
                const isAlert = log.severity === 'danger' || log.eventType === 'proctoring_alert';
                const isSuccess = log.severity === 'success';

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="group p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all cursor-pointer flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-500 text-[10px]">[{dateStr}]</span>
                        <span
                          className={`text-[9px] uppercase font-black px-1.5 py-0.2 rounded ${
                            isAlert
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : isSuccess
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                          }`}
                        >
                          {log.eventType}
                        </span>
                        <span className="text-slate-400 text-[10px]">@{log.actorName} ({log.actorEmail || 'guest'})</span>
                      </div>
                      <p
                        className={`text-xs font-semibold ${
                          isAlert ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {log.actionTitle}
                      </p>
                      {log.detailsText && (
                        <p className="text-[11px] text-slate-500 truncate max-w-3xl">
                          {log.detailsText}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[10px] text-slate-500 whitespace-nowrap">
                      <span>IP: {log.ipAddress}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Structured Table View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Audit Telemetry Grid</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Showing {logs.length} of {pagination.totalCount.toLocaleString()} total logged events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-200 font-bold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Action & Summary</th>
                  <th className="px-4 py-3">Actor / Candidate</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Forensics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Terminal className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">No activity logs matching current filters.</p>
                        <p className="text-[11px] text-slate-400">All student actions, submissions, and logins will be permanently recorded here.</p>
                        {(eventTypeFilter !== 'all' || dateRangeFilter !== 'all' || severityFilter !== 'all' || yearFilter !== 'all' || searchQuery) && (
                          <button
                            onClick={() => {
                              setEventTypeFilter('all');
                              setDateRangeFilter('all');
                              setSeverityFilter('all');
                              setYearFilter('all');
                              setSearchQuery('');
                              setCurrentPage(1);
                            }}
                            className="mt-3 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
                          >
                            Reset Filters (Show All {summary?.totalStored || 62} Archived Events)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const dateObj = new Date(log.createdAt);
                    const timeAgoSecs = Math.round((Date.now() - dateObj.getTime()) / 1000);
                    let relativeStr = 'Just now';
                    if (timeAgoSecs > 86400) relativeStr = `${Math.floor(timeAgoSecs / 86400)}d ago`;
                    else if (timeAgoSecs > 3600) relativeStr = `${Math.floor(timeAgoSecs / 3600)}h ago`;
                    else if (timeAgoSecs > 60) relativeStr = `${Math.floor(timeAgoSecs / 60)}m ago`;
                    else if (timeAgoSecs >= 10) relativeStr = `${timeAgoSecs}s ago`;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLog(log)}
                      >
                        {/* Timestamp */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-800 text-[11px]">
                              {relativeStr}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getEventTypeBadge(log.eventType)}
                        </td>

                        {/* Action Title */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {log.actionTitle}
                          </div>
                          {log.detailsText && (
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-md mt-0.5">
                              {log.detailsText}
                            </div>
                          )}
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                              <span>{log.actorName || 'Anonymous'}</span>
                              <span className="px-1.5 py-0.2 rounded text-[8px] uppercase bg-slate-100 text-slate-600 font-mono border">
                                {log.actorRole}
                              </span>
                            </div>
                            {log.actorEmail && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {log.actorEmail}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* IP Address */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-700">
                          {log.ipAddress || '127.0.0.1'}
                        </td>

                        {/* Action Button */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-bold transition-all border border-slate-200"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
              <span>
                Showing page <strong className="text-slate-800">{pagination.page}</strong> of <strong className="text-slate-800">{pagination.totalPages}</strong> ({pagination.totalCount.toLocaleString()} total entries)
              </span>

              {/* Rows per page selector */}
              <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-200">
                <span className="text-[11px] text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2 py-1 focus:outline-hidden cursor-pointer"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || loading}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Page Number Chips */}
              {(() => {
                const total = pagination.totalPages;
                const cur = pagination.page;
                const pages: number[] = [];

                if (total <= 7) {
                  for (let i = 1; i <= total; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (cur > 3) pages.push(-1); // ellipsis
                  const start = Math.max(2, cur - 1);
                  const end = Math.min(total - 1, cur + 1);
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (cur < total - 2) pages.push(-2); // ellipsis
                  pages.push(total);
                }

                return pages.map((p, idx) => {
                  if (p < 0) {
                    return <span key={`ell-${idx}`} className="px-2 text-slate-400 text-xs">...</span>;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        cur === p
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}

              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage >= pagination.totalPages || loading}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1 shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Event Forensic Inspection</h3>
                <span className="text-xs font-mono text-slate-400">#ID-{selectedLog.id}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Event Type:</span>
                <div className="mt-1 font-bold text-slate-800">{getEventTypeBadge(selectedLog.eventType)}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Severity:</span>
                <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Actor / Identity:</span>
                <div className="mt-1 font-bold text-slate-900">{selectedLog.actorName || 'Anonymous'}</div>
                <div className="text-[10px] text-slate-500 font-mono">{selectedLog.actorEmail || 'No email attached'} ({selectedLog.actorRole})</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Origin IP & Date:</span>
                <div className="mt-1 font-mono font-bold text-slate-900">{selectedLog.ipAddress}</div>
                <div className="text-[10px] text-slate-500 font-mono">{new Date(selectedLog.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Action Title / Event Header:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
                {selectedLog.actionTitle}
              </div>
            </div>

            {selectedLog.detailsText && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Raw Event Payload & Forensic Metadata:</span>
                <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-48 border border-slate-800 whitespace-pre-wrap">
                  {selectedLog.detailsText}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
