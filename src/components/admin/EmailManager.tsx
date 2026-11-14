import React, { useState, useEffect } from 'react';
import {
    Mail,
    Send,
    Save,
    RefreshCw,
    Eye,
    Clock,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Users,
    Edit3,
    Calendar,
    Layers,
    ExternalLink,
    Inbox,
    Activity,
    Download,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    XCircle
} from 'lucide-react';

interface EmailTemplate {
    id: string;
    template_name: string;
    subject: string;
    heading: string;
    body_text: string;
    cta_text: string;
    cta_url: string;
    updated_at?: string;
}

interface BroadcastItem {
    id: number;
    title: string;
    subject: string;
    message_body: string;
    target_audience: string;
    recipients_count: number;
    status: string;
    scheduled_for: string | null;
    sent_at: string;
}

interface EmailLogItem {
    id: number;
    recipient_email: string;
    recipient_name: string | null;
    email_type: string;
    subject: string;
    status: 'sent' | 'failed';
    error_message: string | null;
    sent_at: string;
}

interface TelemetryStats {
    totalDispatched: number;
    totalSent: number;
    totalFailed: number;
    deliveryRate: string;
}

export const EmailManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'templates' | 'broadcast' | 'telemetry'>('templates');

    // Template Management State
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('new_exam_alert');
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
    const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
    const [templateStatusMsg, setTemplateStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Test Email State
    const [testEmailAddress, setTestEmailAddress] = useState<string>('');
    const [sendingTest, setSendingTest] = useState<boolean>(false);
    const [testStatusMsg, setTestStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Broadcast Announcement State
    const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
    const [loadingBroadcasts, setLoadingBroadcasts] = useState<boolean>(false);
    const [broadcastTitle, setBroadcastTitle] = useState<string>('');
    const [broadcastSubject, setBroadcastSubject] = useState<string>('');
    const [broadcastBody, setBroadcastBody] = useState<string>('');
    const [targetAudience, setTargetAudience] = useState<string>('all');
    const [scheduledFor, setScheduledFor] = useState<string>('');
    const [dispatchingBroadcast, setDispatchingBroadcast] = useState<boolean>(false);
    const [broadcastStatusMsg, setBroadcastStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Telemetry & Logs State
    const [telemetryLogs, setTelemetryLogs] = useState<EmailLogItem[]>([]);
    const [telemetryStats, setTelemetryStats] = useState<TelemetryStats>({
        totalDispatched: 0,
        totalSent: 0,
        totalFailed: 0,
        deliveryRate: '100.0'
    });
    const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
    const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
    const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
    const [logSearchQuery, setLogSearchQuery] = useState<string>('');
    const [logPage, setLogPage] = useState<number>(1);
    const [logLimit, setLogLimit] = useState<number>(10);
    const [totalMatchingLogs, setTotalMatchingLogs] = useState<number>(0);
    const [totalLogPages, setTotalLogPages] = useState<number>(1);
    const [exportingCsv, setExportingCsv] = useState<boolean>(false);

    const getApiBaseUrl = () => {
        if (typeof window !== 'undefined') {
            return '/api';
        }
        return 'http://localhost:5050/api';
    };

    // 1. Fetch live email templates from MySQL
    const fetchTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/email/templates`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.templates) {
                setTemplates(data.templates);
                const current = data.templates.find((t: EmailTemplate) => t.id === selectedTemplateId) || data.templates[0];
                if (current) {
                    setSelectedTemplateId(current.id);
                    setEditingTemplate({ ...current });
                }
            }
        } catch (err: any) {
            console.error('Failed to load email templates:', err);
            setTemplateStatusMsg({ type: 'error', text: 'Could not connect to backend server.' });
        } finally {
            setLoadingTemplates(false);
        }
    };

    // 2. Fetch past broadcast records
    const fetchBroadcasts = async () => {
        setLoadingBroadcasts(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/email/broadcasts`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.broadcasts) {
                setBroadcasts(data.broadcasts);
            }
        } catch (err: any) {
            console.error('Failed to load broadcast history:', err);
        } finally {
            setLoadingBroadcasts(false);
        }
    };

    // 3. Fetch real-time email telemetry logs
    const fetchTelemetryLogs = async (page = logPage, limit = logLimit) => {
        setLoadingLogs(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                status: logStatusFilter,
                type: logTypeFilter,
                search: logSearchQuery.trim()
            });
            const res = await fetch(`${getApiBaseUrl()}/admin/email/logs?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setTelemetryLogs(data.logs || []);
                if (data.stats) setTelemetryStats(data.stats);
                if (data.pagination) {
                    setTotalMatchingLogs(data.pagination.totalMatching || 0);
                    setTotalLogPages(data.pagination.totalPages || 1);
                }
            }
        } catch (err) {
            console.error('Failed to fetch email logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    // 4. Export Telemetry to CSV
    const exportLogsToCsv = async () => {
        setExportingCsv(true);
        try {
            const params = new URLSearchParams({
                exportAll: 'true',
                status: logStatusFilter,
                type: logTypeFilter,
                search: logSearchQuery.trim()
            });
            const res = await fetch(`${getApiBaseUrl()}/admin/email/logs?${params.toString()}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && data.logs) {
                const headers = ['ID', 'Recipient Email', 'Recipient Name', 'Email Category', 'Subject', 'Status', 'Error Details', 'Timestamp'];
                const csvRows = [headers.join(',')];
                for (const row of data.logs) {
                    const values = [
                        row.id,
                        `"${(row.recipient_email || '').replace(/"/g, '""')}"`,
                        `"${(row.recipient_name || '').replace(/"/g, '""')}"`,
                        `"${(row.email_type || '').replace(/"/g, '""')}"`,
                        `"${(row.subject || '').replace(/"/g, '""')}"`,
                        row.status,
                        `"${(row.error_message || '').replace(/"/g, '""')}"`,
                        `"${new Date(row.sent_at).toLocaleString()}"`
                    ];
                    csvRows.push(values.join(','));
                }
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `evalnium_email_telemetry_report_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err) {
            console.error('CSV export failed:', err);
        } finally {
            setExportingCsv(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
        fetchBroadcasts();
    }, []);

    useEffect(() => {
        if (activeTab === 'telemetry') {
            fetchTelemetryLogs(logPage, logLimit);
        }
    }, [activeTab, logPage, logLimit, logStatusFilter, logTypeFilter]);

    // Handle switching between templates
    const handleSelectTemplate = (tpl: EmailTemplate) => {
        setSelectedTemplateId(tpl.id);
        setEditingTemplate({ ...tpl });
        setTemplateStatusMsg(null);
        setTestStatusMsg(null);
    };

    // 3. Save template modifications
    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        setSavingTemplate(true);
        setTemplateStatusMsg(null);

        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/email/templates/${editingTemplate.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(editingTemplate)
            });
            const data = await res.json();

            if (data.success) {
                setTemplateStatusMsg({ type: 'success', text: 'Template changes saved successfully to database!' });
                fetchTemplates();
            } else {
                setTemplateStatusMsg({ type: 'error', text: data.error || 'Failed to save template.' });
            }
        } catch (err: any) {
            setTemplateStatusMsg({ type: 'error', text: err.message || 'Network error saving template.' });
        } finally {
            setSavingTemplate(false);
        }
    };

    // 4. Send real-time test preview to admin email
    const handleSendTestEmail = async () => {
        if (!testEmailAddress.trim() || !editingTemplate) {
            setTestStatusMsg({ type: 'error', text: 'Please enter a valid recipient email address.' });
            return;
        }

        setSendingTest(true);
        setTestStatusMsg(null);

        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/email/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    templateId: editingTemplate.id,
                    toEmail: testEmailAddress.trim()
                })
            });
            const data = await res.json();

            if (data.success) {
                setTestStatusMsg({ type: 'success', text: `Preview delivered to ${testEmailAddress}!` });
            } else {
                setTestStatusMsg({ type: 'error', text: data.error || 'Failed to dispatch test email.' });
            }
        } catch (err: any) {
            setTestStatusMsg({ type: 'error', text: err.message || 'SMTP Connection Error' });
        } finally {
            setSendingTest(false);
        }
    };

    // 5. Send or schedule bulk broadcast
    const handleSendBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastSubject.trim() || !broadcastBody.trim()) {
            setBroadcastStatusMsg({ type: 'error', text: 'Title, Subject, and Message Body are required.' });
            return;
        }

        setDispatchingBroadcast(true);
        setBroadcastStatusMsg(null);

        try {
            const res = await fetch(`${getApiBaseUrl()}/admin/email/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: broadcastTitle,
                    subject: broadcastSubject,
                    message_body: broadcastBody,
                    target_audience: targetAudience,
                    scheduled_for: scheduledFor || null
                })
            });
            const data = await res.json();

            if (data.success) {
                setBroadcastStatusMsg({ type: 'success', text: data.message });
                setBroadcastTitle('');
                setBroadcastSubject('');
                setBroadcastBody('');
                setScheduledFor('');
                fetchBroadcasts();
            } else {
                setBroadcastStatusMsg({ type: 'error', text: data.error || 'Failed to dispatch broadcast.' });
            }
        } catch (err: any) {
            setBroadcastStatusMsg({ type: 'error', text: err.message || 'Network error dispatching broadcast.' });
        } finally {
            setDispatchingBroadcast(false);
        }
    };

    // Generate live interactive HTML preview
    const renderPreviewHtml = () => {
        if (!editingTemplate) return '';
        const sampleCandidate = 'Priya Sharma';
        const sampleQuiz = 'NTA UGC NET Paper 1 - National Mock Exam 2026';
        const sampleQuestions = '50';
        const sampleDuration = '60';
        const sampleOtp = '849201';

        let body = editingTemplate.body_text
            .replace(/\{\{\s*candidate_name\s*\}\}/g, sampleCandidate)
            .replace(/\{\{\s*quiz_title\s*\}\}/g, sampleQuiz)
            .replace(/\{\{\s*question_count\s*\}\}/g, sampleQuestions)
            .replace(/\{\{\s*duration_minutes\s*\}\}/g, sampleDuration)
            .replace(/\{\{\s*score\s*\}\}/g, '84.5')
            .replace(/\{\{\s*max_score\s*\}\}/g, '100')
            .replace(/\{\{\s*percentage\s*\}\}/g, '84.5')
            .replace(/\{\{\s*result_status\s*\}\}/g, 'PASSED (Qualified)')
            .replace(/\{\{\s*custom_message\s*\}\}/g, 'The official admit cards and sectional test schedules for Phase 1 have been released.')
            .replace(/\{\{\s*otp\s*\}\}/g, sampleOtp);

        return body;
    };

    return (
        <div className="space-y-6">
            {/* Top Header & Navigation Banner */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Evalnium Outgoing Communication Engine</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Email &amp; Notification Hub
                    </h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                        Manage dynamic outgoing notification templates, preview SMTP layouts, and broadcast notices to registered candidates.
                    </p>
                </div>

                {/* Studio Sub-Tabs */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'templates'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Email Templates
                    </button>
                    <button
                        onClick={() => setActiveTab('broadcast')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'broadcast'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Send className="w-3.5 h-3.5" />
                        Send Broadcast
                    </button>
                    <button
                        onClick={() => setActiveTab('telemetry')}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === 'telemetry'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Audit Logs &amp; Telemetry
                    </button>
                </div>
            </div>

            {/* TAB 1: TEMPLATE STUDIO */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Template Selector List */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                            <span>Standard Templates</span>
                            <button
                                onClick={fetchTemplates}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold normal-case"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingTemplates ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>

                        {loadingTemplates ? (
                            <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                Loading templates...
                            </div>
                        ) : (
                            templates.map((tpl) => (
                                <div
                                    key={tpl.id}
                                    onClick={() => handleSelectTemplate(tpl)}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all ${selectedTemplateId === tpl.id
                                            ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-400/30'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-slate-900 text-sm">{tpl.template_name}</span>
                                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {tpl.id}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate">{tpl.subject}</p>
                                </div>
                            ))
                        )}

                        {/* Quick Variable Cheatsheet Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                Supported Placeholders
                            </span>
                            <div className="space-y-1 font-mono text-[11px] text-slate-700">
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{candidate_name}}"}</code> — Student Full Name</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{quiz_title}}"}</code> — Assessment Name</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{score}}"}</code> — Candidate Marks</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{max_score}}"}</code> — Total Maximum Marks</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{percentage}}"}</code> — Percentage Scored</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{result_status}}"}</code> — Pass / Fail Status</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{question_count}}"}</code> — Total Questions</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{duration_minutes}}"}</code> — Exam Time (Mins)</div>
                                <div><code className="bg-blue-100/70 text-blue-800 px-1 rounded">{"{{otp}}"}</code> — 6-Digit Auth Code</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Template Editor & Live Preview */}
                    <div className="lg:col-span-8 space-y-6">
                        {editingTemplate ? (
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Editing: {editingTemplate.template_name}</h3>
                                        <p className="text-xs text-slate-500">Changes will apply dynamically to all outgoing system emails.</p>
                                    </div>
                                    <button
                                        onClick={handleSaveTemplate}
                                        disabled={savingTemplate}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {savingTemplate ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>

                                {templateStatusMsg && (
                                    <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${templateStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                        }`}>
                                        {templateStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {templateStatusMsg.text}
                                    </div>
                                )}

                                {/* Form Inputs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Email Subject Line
                                        </label>
                                        <input
                                            type="text"
                                            value={editingTemplate.subject}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Header Title / Banner Heading
                                        </label>
                                        <input
                                            type="text"
                                            value={editingTemplate.heading}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, heading: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                        Email Body Content (Markdown & Line Breaks Supported)
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={editingTemplate.body_text}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, body_text: e.target.value })}
                                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Action Button Text (CTA)
                                        </label>
                                        <input
                                            type="text"
                                            value={editingTemplate.cta_text}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, cta_text: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                Action Button Link (URL)
                                            </label>
                                            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                Resolves to: {editingTemplate.cta_url.startsWith('http') ? editingTemplate.cta_url : `${typeof window !== 'undefined' ? window.location.origin : 'http://10.24.65.78:5175'}${editingTemplate.cta_url.startsWith('/') ? '' : '/'}${editingTemplate.cta_url}`}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={editingTemplate.cta_url}
                                            onChange={(e) => setEditingTemplate({ ...editingTemplate, cta_url: e.target.value })}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Real-time Interactive HTML Email Preview Pane */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                            <Eye className="w-4 h-4 text-blue-600" />
                                            Live Inbox Render Preview
                                        </span>
                                        <span className="text-[11px] text-slate-400">Desktop & Mobile Viewport Simulation</span>
                                    </div>

                                    <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 flex justify-center">
                                        <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                            {/* Email Header Banner */}
                                            <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-6 text-center">
                                                <div className="text-[10px] font-bold tracking-widest uppercase text-blue-200 mb-1">
                                                    Evalnium Assessment Portal
                                                </div>
                                                <h4 className="text-lg font-bold">{editingTemplate.heading}</h4>
                                            </div>

                                            {/* Email Body Preview */}
                                            <div className="p-6 text-sm text-slate-700 space-y-4 whitespace-pre-line leading-relaxed">
                                                {renderPreviewHtml()}

                                                {editingTemplate.cta_text && (
                                                    <div className="pt-4 text-center">
                                                        <span className="inline-block bg-blue-600 text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-md cursor-pointer hover:bg-blue-700">
                                                            {editingTemplate.cta_text} →
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Email Footer */}
                                            <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-[11px] text-slate-400">
                                                Delivered by the Evalnium CBT Examination Engine • © 2026 All Rights Reserved.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Test Dispatch Bar */}
                                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
                                    <div className="flex-1 w-full">
                                        <input
                                            type="email"
                                            placeholder="Enter email to send test (e.g. admin@evalnium.com)"
                                            value={testEmailAddress}
                                            onChange={(e) => setTestEmailAddress(e.target.value)}
                                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSendTestEmail}
                                        disabled={sendingTest}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {sendingTest ? 'Sending...' : 'Send Live Test Email'}
                                    </button>
                                </div>
                                {testStatusMsg && (
                                    <p className={`text-xs font-semibold ${testStatusMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {testStatusMsg.text}
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* TAB 2: BROADCAST ANNOUNCEMENTS */}
            {activeTab === 'broadcast' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Compose Broadcast */}
                    <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Send className="w-5 h-5 text-blue-600" />
                                Compose Broadcast Announcement
                            </h3>
                            <p className="text-xs text-slate-500">Send an instant notice, schedule release, or exam update to candidates.</p>
                        </div>

                        {broadcastStatusMsg && (
                            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${broadcastStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}>
                                {broadcastStatusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {broadcastStatusMsg.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Announcement Internal Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. UGC NET 2026 Phase 1 Schedule Announcement"
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Outgoing Email Subject
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. 📢 Important Update: Your NTA Mock Exam Schedule is Live"
                                value={broadcastSubject}
                                onChange={(e) => setBroadcastSubject(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Target Audience
                            </label>
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Registered Candidates (Verified Email Directory)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Schedule / Send Later (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={scheduledFor}
                                onChange={(e) => setScheduledFor(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-[11px] text-slate-400 mt-1 block">Leave blank to dispatch immediately.</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Message Content
                            </label>
                            <textarea
                                rows={5}
                                placeholder="Dear Candidates, the evaluation schedule for the upcoming All-India UGC NET CBT has been finalized..."
                                value={broadcastBody}
                                onChange={(e) => setBroadcastBody(e.target.value)}
                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                            />
                        </div>

                        <button
                            onClick={handleSendBroadcast}
                            disabled={dispatchingBroadcast}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                            {dispatchingBroadcast ? 'Dispatching Broadcast in Background...' : scheduledFor ? 'Schedule Broadcast' : 'Send Broadcast to Candidates Now'}
                        </button>
                    </div>

                    {/* Right Column: Broadcast History */}
                    <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-600" />
                                    Broadcast Transmission Log
                                </h3>
                                <p className="text-xs text-slate-500">Audit trail of past broadcasts delivered to student inboxes.</p>
                            </div>
                            <button
                                onClick={fetchBroadcasts}
                                className="text-blue-600 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingBroadcasts ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loadingBroadcasts ? (
                            <div className="p-8 text-center text-slate-400">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                                Loading history...
                            </div>
                        ) : broadcasts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                No broadcast emails sent yet.
                            </div>
                        ) : (
                            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                                {broadcasts.map((b) => (
                                    <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 text-sm">{b.title}</span>
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${b.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {b.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium">{b.subject}</p>
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {b.recipients_count} Recipients
                                            </span>
                                            <span>{new Date(b.sent_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: AUDIT LOGS & TELEMETRY */}
            {activeTab === 'telemetry' && (
                <div className="space-y-6">
                    {/* Telemetry KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dispatched</span>
                                <h3 className="text-2xl font-black text-slate-800 mt-1">{telemetryStats.totalDispatched}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">All outgoing system emails</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Mail className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
                                <h3 className="text-2xl font-black text-emerald-600 mt-1">{telemetryStats.totalSent}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Accepted by recipient SMTP</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Failures</span>
                                <h3 className="text-2xl font-black text-rose-600 mt-1">{telemetryStats.totalFailed}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Bounces & rejected sockets</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                <XCircle className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Success Rate</span>
                                <h3 className="text-2xl font-black text-indigo-600 mt-1">{telemetryStats.deliveryRate}%</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Healthy deliverability</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                    </div>

                    {/* Filter Toolbar & Actions */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search Input */}
                            <div className="relative min-w-[240px]">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search recipient or subject..."
                                    value={logSearchQuery}
                                    onChange={(e) => { setLogSearchQuery(e.target.value); setLogPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <select
                                    value={logStatusFilter}
                                    onChange={(e) => { setLogStatusFilter(e.target.value); setLogPage(1); }}
                                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="sent">Delivered Only</option>
                                    <option value="failed">Failed Only</option>
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div>
                                <select
                                    value={logTypeFilter}
                                    onChange={(e) => { setLogTypeFilter(e.target.value); setLogPage(1); }}
                                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="all">All Email Categories</option>
                                    <option value="new_exam_alert">Exam Alerts</option>
                                    <option value="candidate_notice">Candidate Notices</option>
                                    <option value="otp_verification">OTP Verification</option>
                                    <option value="broadcast">Mass Broadcasts</option>
                                    <option value="direct_notice">Direct System Notices</option>
                                </select>
                            </div>

                            <button
                                onClick={() => fetchTelemetryLogs(logPage, logLimit)}
                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                                title="Refresh Logs"
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin text-blue-600' : ''}`} />
                            </button>
                        </div>

                        {/* Export Action */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={exportLogsToCsv}
                                disabled={exportingCsv || totalMatchingLogs === 0}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {exportingCsv ? 'Exporting...' : 'Export Telemetry Report (CSV)'}
                            </button>
                        </div>
                    </div>

                    {/* Data Grid Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Recipient</th>
                                        <th className="py-3 px-4">Category</th>
                                        <th className="py-3 px-4">Subject & Details</th>
                                        <th className="py-3 px-4">Dispatched At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {loadingLogs ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                                                Loading transmission logs...
                                            </td>
                                        </tr>
                                    ) : telemetryLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400">
                                                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                                No email transmissions found matching your filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        telemetryLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-4">
                                                    {log.status === 'sent' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Delivered
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                                            <XCircle className="w-3 h-3 text-rose-600" />
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800">
                                                    <div>{log.recipient_name || 'Candidate'}</div>
                                                    <div className="text-[11px] text-slate-400 font-normal">{log.recipient_email}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        {log.email_type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-900 max-w-md truncate">{log.subject}</div>
                                                    {log.error_message && (
                                                        <div className="text-[11px] text-rose-600 font-mono mt-0.5 bg-rose-50 p-1 rounded border border-rose-100 max-w-md truncate">
                                                            Error: {log.error_message}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                                                    {new Date(log.sent_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                            <div className="flex items-center gap-2">
                                <span>Showing {telemetryLogs.length > 0 ? (logPage - 1) * logLimit + 1 : 0} to {Math.min(logPage * logLimit, totalMatchingLogs)} of {totalMatchingLogs} audit records</span>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1">
                                    <span>Rows per page:</span>
                                    <select
                                        value={logLimit}
                                        onChange={(e) => { setLogLimit(Number(e.target.value)); setLogPage(1); }}
                                        className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                                    disabled={logPage <= 1 || loadingLogs}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                    Previous
                                </button>
                                <span className="px-2 font-bold text-slate-800">
                                    Page {logPage} of {totalLogPages}
                                </span>
                                <button
                                    onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                                    disabled={logPage >= totalLogPages || loadingLogs}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-slate-700 transition"
                                >
                                    Next
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
