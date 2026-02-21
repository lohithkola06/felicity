import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ParticipantDashboard() {
    const [data, setData] = useState({ upcoming: [], history: { normal: [], merchandise: [], completed: [], cancelled: [] } });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/participant/dashboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    async function handleCancel(regId) {
        if (!confirm('Are you sure you want to cancel this registration?')) return;
        try {
            await api.post(`/participant/registrations/${regId}/cancel`);
            fetchDashboard();
        } catch (err) {
            alert(err.response?.data?.error || 'Cancellation failed');
        }
    }

    // Pick which list to show based on active tab
    let items = [];
    if (activeTab === 'upcoming') items = data.upcoming || [];
    else if (activeTab === 'normal') items = data.history?.normal || [];
    else if (activeTab === 'merchandise') items = data.history?.merchandise || [];
    else if (activeTab === 'completed') items = data.history?.completed || [];
    else if (activeTab === 'cancelled') items = data.history?.cancelled || [];

    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'normal', label: 'Normal' },
        { key: 'merchandise', label: 'Merchandise' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>My Dashboard</h1>

            {/* Tab Navigation */}
            <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', display: 'flex', gap: '5px' }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                            padding: '8px 14px',
                            borderBottom: activeTab === tab.key ? '2px solid #337ab7' : 'none',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeTab === tab.key ? '#337ab7' : '#666',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Type</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Organizer</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Schedule</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Team</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Ticket / Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No records in this category.</td></tr>
                        ) : items.map(entry => (
                            <tr key={entry.registrationId}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <Link to={`/events/${entry.eventId || ''}`} style={{ textDecoration: 'none', color: '#337ab7', fontWeight: 'bold' }}>
                                        {entry.eventName || 'Unknown'}
                                    </Link>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textTransform: 'capitalize' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                                        background: entry.eventType === 'merchandise' ? '#fce4ec' : '#e3f2fd',
                                        color: entry.eventType === 'merchandise' ? '#c62828' : '#1565c0',
                                    }}>
                                        {entry.eventType === 'merchandise' ? 'Merch' : 'Normal'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.organizer}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '13px' }}>
                                    {entry.startDate ? new Date(entry.startDate).toLocaleDateString() : '-'}
                                    {entry.endDate && (
                                        <div style={{ color: '#888', fontSize: '11px' }}>
                                            to {new Date(entry.endDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.teamName || '-'}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                        background: entry.status === 'cancelled' ? '#f2dede' : entry.status === 'completed' ? '#dff0d8' : '#fcf8e3',
                                        color: entry.status === 'cancelled' ? '#a94442' : entry.status === 'completed' ? '#3c763d' : '#8a6d3b',
                                    }}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.ticketId && (
                                        <Link to={`/events/${entry.eventId || ''}`}
                                            style={{ fontSize: '12px', color: '#337ab7', textDecoration: 'underline', cursor: 'pointer' }}
                                            title="View event & ticket details">
                                            {entry.ticketId}
                                        </Link>
                                    )}
                                    {activeTab === 'upcoming' && entry.status !== 'cancelled' && (
                                        <button onClick={() => handleCancel(entry.registrationId)}
                                            style={{ display: 'block', marginTop: '4px', color: '#d9534f', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>
                                            Cancel
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
