import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

export default function AttendanceList() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all, attended, not-attended
    const [manualTicket, setManualTicket] = useState('');
    const [manualReason, setManualReason] = useState('');
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        loadAttendance();
        // Auto-refresh every 10 seconds for live updates
        const interval = setInterval(loadAttendance, 10000);
        return () => clearInterval(interval);
    }, [id]);

    async function loadAttendance() {
        try {
            const res = await api.get(`/attendance/event/${id}`);
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleManualOverride(e) {
        e.preventDefault();
        setMsg(null);
        try {
            const res = await api.post('/attendance/mark', { ticketId: manualTicket.trim() });
            setMsg({ type: 'success', text: `✅ ${res.data.message} - ${res.data.participant?.name}` });
            setManualTicket('');
            setManualReason('');
            loadAttendance();
        } catch (err) {
            setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to mark attendance' });
        }
    }

    async function handleExportCSV() {
        try {
            const token = localStorage.getItem('token');
            window.open(`${import.meta.env.VITE_API_URL || ''}/api/attendance/event/${id}/csv?token=${token}`, '_blank');
        } catch (err) {
            alert('Export failed');
        }
    }

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading attendance...</div>;
    if (!data) return <div style={{ padding: '20px' }}>Could not load attendance data.</div>;

    const regs = data.registrations || [];

    // Filter and search
    let filtered = regs;
    if (filter === 'attended') filtered = regs.filter(r => r.attended);
    else if (filter === 'not-attended') filtered = regs.filter(r => !r.attended);

    if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(r => {
            const name = `${r.participant?.firstName || ''} ${r.participant?.lastName || ''}`.toLowerCase();
            const email = (r.participant?.email || '').toLowerCase();
            return name.includes(q) || email.includes(q) || (r.ticketId || '').toLowerCase().includes(q);
        });
    }

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <Link to="/organizer/dashboard" style={{ color: '#337ab7', textDecoration: 'none' }}>← Back to Dashboard</Link>

            <h1 style={{ marginTop: '10px' }}>Live Attendance Dashboard</h1>

            {/* Stats Summary */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px', padding: '20px', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1565c0' }}>{data.total}</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>Total Registered</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', padding: '20px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2e7d32' }}>{data.attended}</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>Scanned / Present</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', padding: '20px', background: '#fff3e0', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e65100' }}>{data.total - data.attended}</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>Not Yet Scanned</div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', padding: '20px', background: '#f3e5f5', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{data.rate}%</div>
                    <div style={{ color: '#666', fontSize: '13px' }}>Attendance Rate</div>
                </div>
            </div>

            {/* Manual Override */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>Manual Override</h3>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    Mark attendance manually by entering a ticket ID (for exceptional cases).
                </p>
                {msg && (
                    <div style={{
                        padding: '8px', marginBottom: '10px', borderRadius: '4px',
                        background: msg.type === 'success' ? '#dff0d8' : '#f2dede',
                        color: msg.type === 'success' ? '#3c763d' : '#a94442'
                    }}>{msg.text}</div>
                )}
                <form onSubmit={handleManualOverride} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input type="text" value={manualTicket} onChange={e => setManualTicket(e.target.value)}
                        placeholder="Ticket ID (e.g. TICKET-12345678)" required
                        style={{ flex: 1, minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                    <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Mark Present
                    </button>
                </form>
            </div>

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Search by name, email or ticket..."
                    style={{ flex: 1, minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                <select value={filter} onChange={e => setFilter(e.target.value)}
                    style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <option value="all">All ({data.total})</option>
                    <option value="attended">Present ({data.attended})</option>
                    <option value="not-attended">Not Scanned ({data.total - data.attended})</option>
                </select>
                <button onClick={handleExportCSV}
                    style={{ padding: '8px 16px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    📥 Export CSV
                </button>
                <button onClick={loadAttendance}
                    style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    🔄 Refresh
                </button>
            </div>

            {/* Participants Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                    <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Participant</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Email</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Ticket ID</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd' }}>Scanned At</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No participants match the current filter.</td></tr>
                    ) : filtered.map(r => (
                        <tr key={r._id} style={{ background: r.attended ? '#f9fff9' : 'inherit' }}>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                {r.participant?.firstName} {r.participant?.lastName}
                                <div style={{ fontSize: '11px', color: '#888' }}>{r.participant?.collegeName || ''}</div>
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '13px' }}>{r.participant?.email}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '12px', fontFamily: 'monospace' }}>{r.ticketId}</td>
                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                {r.attended ? (
                                    <span style={{ background: '#dff0d8', color: '#3c763d', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                        ✓ Present
                                    </span>
                                ) : (
                                    <span style={{ background: '#f2dede', color: '#a94442', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                                        ✕ Absent
                                    </span>
                                )}
                            </td>
                            <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '12px', color: '#666' }}>
                                {r.attendedAt ? new Date(r.attendedAt).toLocaleString() : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ marginTop: '10px', fontSize: '12px', color: '#999', textAlign: 'right' }}>
                Auto-refreshes every 10 seconds • Last updated: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
}
