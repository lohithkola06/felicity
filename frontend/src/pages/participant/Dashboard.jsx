import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ParticipantDashboard() {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/participant/dashboard');
            setRegistrations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    async function handleCancel(regId) {
        if (!confirm('Are you sure you want to cancel? Refund policy applies.')) return;
        try {
            await api.post(`/participant/registrations/${regId}/cancel`);
            fetchDashboard();
        } catch (err) {
            alert(err.response?.data?.error || 'Cancellation failed');
        }
    }

    const filtered = registrations.filter(r => {
        if (activeTab === 'upcoming') return r.status === 'registered' && new Date(r.event.startDate) > new Date();
        if (activeTab === 'past') return r.status === 'attended' || (r.status === 'registered' && new Date(r.event.startDate) <= new Date());
        if (activeTab === 'cancelled') return r.status === 'cancelled';
        return true;
    });

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>My Dashboard</h1>

            <div style={{ marginBottom: '20px', borderBottom: '1px solid #ccc' }}>
                <button onClick={() => setActiveTab('upcoming')} style={{ fontWeight: activeTab === 'upcoming' ? 'bold' : 'normal', marginRight: '10px' }}>Upcoming</button>
                <button onClick={() => setActiveTab('past')} style={{ fontWeight: activeTab === 'past' ? 'bold' : 'normal', marginRight: '10px' }}>History</button>
                <button onClick={() => setActiveTab('cancelled')} style={{ fontWeight: activeTab === 'cancelled' ? 'bold' : 'normal' }}>Cancelled</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Team</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No records found.</td></tr>
                        ) : filtered.map(reg => (
                            <tr key={reg._id}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <Link to={`/events/${reg.event._id}`}>{reg.event.name}</Link>
                                    <div style={{ fontSize: '12px', color: '#666' }}>{reg.event.type}</div>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {new Date(reg.event.startDate).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {reg.teamName || '-'}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {reg.status}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {activeTab === 'upcoming' && (
                                        <button onClick={() => handleCancel(reg._id)} style={{ color: 'red', borderColor: 'red' }}>Cancel</button>
                                    )}
                                    {reg.ticketId && <div style={{ fontSize: '12px', marginTop: '5px' }}>Ticket: {reg.ticketId}</div>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
