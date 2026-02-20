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

            <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', display: 'flex', gap: '5px' }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                            padding: '8px 14px',
                            borderBottom: activeTab === tab.key ? '2px solid #337ab7' : 'none',
                            background: 'none', border: 'none', cursor: 'pointer'
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Organizer</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Team</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Ticket / Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No records in this category.</td></tr>
                        ) : items.map(entry => (
                            <tr key={entry.registrationId}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <strong>{entry.eventName || 'Unknown'}</strong>
                                    <div style={{ fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>{entry.eventType}</div>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.organizer}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.startDate ? new Date(entry.startDate).toLocaleDateString() : '-'}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.teamName || '-'}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <span style={{
                                        padding: '2px 6px', borderRadius: '3px', fontSize: '12px',
                                        background: entry.status === 'cancelled' ? '#f2dede' : entry.status === 'completed' ? '#dff0d8' : '#fcf8e3',
                                    }}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.ticketId && <div style={{ fontSize: '12px', marginBottom: '4px' }}>Ticket: {entry.ticketId}</div>}
                                    {activeTab === 'upcoming' && entry.status !== 'cancelled' && (
                                        <button onClick={() => handleCancel(entry.registrationId)} style={{ color: 'red', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
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
