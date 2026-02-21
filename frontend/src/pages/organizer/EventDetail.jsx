import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function OrgEventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        fetchAll();
    }, [id]);

    const fetchAll = async () => {
        try {
            const [eventRes, analyticsRes, participantsRes] = await Promise.all([
                api.get(`/events/${id}`),
                api.get(`/organizer/events/${id}/analytics`),
                api.get(`/events/${id}/participants`),
            ]);
            setEvent(eventRes.data);
            setAnalytics(analyticsRes.data);
            setParticipants(participantsRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Change event status to "${newStatus}"?`)) return;
        setStatusUpdating(true);
        try {
            await api.patch(`/events/${id}/status`, { status: newStatus });
            fetchAll();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleExportCSV = () => {
        const token = localStorage.getItem('token');
        const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
        window.open(`${baseUrl}/organizer/events/${id}/export?token=${token}`, '_blank');
    };

    if (loading) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Loading...</div>;
    if (!event) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Event not found.</div>;

    const statusColor = (status) => {
        const map = {
            draft: { bg: '#fcf8e3', color: '#8a6d3b' },
            published: { bg: '#dff0d8', color: '#3c763d' },
            ongoing: { bg: '#d9edf7', color: '#31708f' },
            completed: { bg: '#f5f5f5', color: '#333' },
            closed: { bg: '#f2dede', color: '#a94442' },
        };
        return map[status] || { bg: '#f5f5f5', color: '#333' };
    };

    const sc = statusColor(event.status);

    // Status transition buttons
    const statusActions = {
        draft: [{ label: 'Publish', status: 'published', color: '#5cb85c' }],
        published: [
            { label: 'Close Registrations', status: 'closed', color: '#d9534f' },
        ],
        ongoing: [
            { label: 'Mark Completed', status: 'completed', color: '#5cb85c' },
            { label: 'Close', status: 'closed', color: '#d9534f' },
        ],
    };

    const filteredParticipants = participants.filter(r => {
        const p = r.participant;
        const name = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase() : '';
        const email = p?.email?.toLowerCase() || '';
        const matchSearch = !searchTerm || name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
        const matchFilter = filterStatus === 'all' || r.paymentStatus === filterStatus;
        return matchSearch && matchFilter;
    });

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            {/* Back navigation */}
            <Link to="/organizer/dashboard" style={{ color: '#337ab7', textDecoration: 'none', fontSize: '14px' }}>← Back to Dashboard</Link>

            {/* Overview Section */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px', marginTop: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h1 style={{ margin: '0 0 8px 0' }}>{event.name}</h1>
                        <span style={{
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                            background: sc.bg, color: sc.color, textTransform: 'uppercase',
                        }}>
                            {event.status}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['draft', 'published'].includes(event.status) && (
                            <Link to={`/organizer/events/${id}/edit`}
                                style={{ padding: '8px 16px', background: '#f0ad4e', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '13px' }}>
                                Edit Event
                            </Link>
                        )}
                        {(statusActions[event.status] || []).map(action => (
                            <button key={action.status}
                                onClick={() => handleStatusChange(action.status)}
                                disabled={statusUpdating}
                                style={{
                                    padding: '8px 16px', background: action.color, color: '#fff',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                                }}
                            >
                                {statusUpdating ? '...' : action.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px', marginTop: '20px' }}>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Type</strong>
                        <span style={{ textTransform: 'capitalize' }}>{event.type === 'merchandise' ? 'Merchandise Drop' : 'Standard Event'}</span>
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Start Date</strong>
                        {event.startDate ? new Date(event.startDate).toLocaleString() : 'TBD'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>End Date</strong>
                        {event.endDate ? new Date(event.endDate).toLocaleString() : 'TBD'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Eligibility</strong>
                        <span style={{ textTransform: 'capitalize' }}>{event.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Open to All'}</span>
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Fee</strong>
                        {event.registrationFee > 0 ? `Rs. ${event.registrationFee}` : 'Free'}
                    </div>
                    <div>
                        <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Limit</strong>
                        {event.registrationLimit > 0 ? event.registrationLimit : 'Unlimited'}
                    </div>
                    {event.venue && (
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Venue</strong>
                            {event.venue}
                        </div>
                    )}
                    {event.registrationDeadline && (
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Deadline</strong>
                            {new Date(event.registrationDeadline).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Analytics Section */}
            {analytics && (
                <div style={{ marginBottom: '20px' }}>
                    <h2>Analytics</h2>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>{analytics.registrations}</h3>
                            <p>Registrations</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>{analytics.attendance}</h3>
                            <p>Attendance</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                            <h3>Rs. {analytics.revenue}</h3>
                            <p>Revenue</p>
                        </div>
                        {analytics.teamCompletion !== undefined && (
                            <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                                <h3>{analytics.teamCompletion}</h3>
                                <p>Teams Completed</p>
                            </div>
                        )}
                        {analytics.itemSales && Object.keys(analytics.itemSales).length > 0 && (
                            <div style={{ flex: 1, minWidth: '200px', border: '1px solid #ccc', padding: '20px', background: '#fff', borderRadius: '4px' }}>
                                <strong>Item Sales</strong>
                                {Object.entries(analytics.itemSales).map(([item, count]) => (
                                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '13px' }}>
                                        <span>{item}</span>
                                        <span style={{ fontWeight: 'bold' }}>{count} sold</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Section */}
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                    <h2 style={{ margin: 0 }}>Participants ({filteredParticipants.length})</h2>
                    <button onClick={handleExportCSV}
                        style={{ padding: '8px 16px', background: '#5cb85c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                        Export CSV
                    </button>
                </div>

                {/* Search & Filter */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ flex: 2, minWidth: '200px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                    </select>
                </div>

                {/* Table */}
                {filteredParticipants.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No participants found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Name</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Email</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Reg Date</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Payment</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Team</th>
                                    <th style={{ padding: '10px', border: '1px solid #ddd' }}>Attendance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParticipants.map(r => {
                                    const p = r.participant;
                                    return (
                                        <tr key={r._id}>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                {p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Unknown'}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p?.email || '-'}</td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                                    background: r.paymentStatus === 'paid' ? '#dff0d8' : '#fcf8e3',
                                                    color: r.paymentStatus === 'paid' ? '#3c763d' : '#8a6d3b',
                                                }}>
                                                    {r.paymentStatus}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                {r.team ? r.team : '-'}
                                            </td>
                                            <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                {r.attended ? 'Yes' : 'No'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
