import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function OrganizerDashboard() {
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({ totalEvents: 0, activeEvents: 0, totalRegistrations: 0, totalRevenue: 0, totalAttendance: 0 });
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/organizer/dashboard');
            setEvents(res.data.events || []);
            if (res.data.analytics) {
                setStats(res.data.analytics);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (eventId, eventName) => {
        if (!window.confirm(`Are you sure you want to delete "${eventName}"? This will remove all registrations, teams, and feedback. This action cannot be undone.`)) return;
        setDeleting(eventId);
        try {
            await api.delete(`/events/${eventId}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete event');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Organizer Dashboard</h1>
                <Link to="/organizer/events/new"><button>+ Create Event</button></Link>
            </div>

            {/* Analytics Overview */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.totalEvents}</h3>
                    <p>Total Events</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.activeEvents}</h3>
                    <p>Active Events</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.totalRegistrations}</h3>
                    <p>Registrations</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>Rs. {stats.totalRevenue}</h3>
                    <p>Revenue</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.totalAttendance}</h3>
                    <p>Attendance</p>
                </div>
            </div>

            <h2>My Events</h2>
            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event Name</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Type</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Registrations</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center' }}>No events created yet.</td></tr> :
                            events.map(e => (
                                <tr key={e._id}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}><Link to={`/organizer/events/${e._id}`}>{e.name}</Link></td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd', textTransform: 'capitalize' }}>{e.type}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{e.startDate ? new Date(e.startDate).toLocaleDateString() : 'TBD'}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: '3px', fontSize: '12px',
                                            background: e.status === 'published' ? '#dff0d8' : e.status === 'ongoing' ? '#d9edf7' : e.status === 'draft' ? '#fcf8e3' : '#f5f5f5',
                                            color: e.status === 'published' ? 'green' : e.status === 'ongoing' ? '#31708f' : e.status === 'draft' ? '#8a6d3b' : '#333'
                                        }}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{e.registrationCount}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        {['draft', 'published'].includes(e.status) && (
                                            <Link to={`/organizer/events/${e._id}/edit`} style={{ marginRight: '10px', color: '#337ab7' }}>Edit</Link>
                                        )}
                                        <Link to={`/organizer/events/${e._id}/attendance`} style={{ marginRight: '10px' }}>Attendance</Link>
                                        <Link to={`/organizer/events/${e._id}/feedback`} style={{ marginRight: '10px' }}>Feedback</Link>
                                        {e.status !== 'ongoing' && (
                                            <button
                                                onClick={() => handleDelete(e._id, e.name)}
                                                disabled={deleting === e._id}
                                                style={{
                                                    background: 'none', border: 'none', color: '#d9534f',
                                                    cursor: 'pointer', fontSize: '14px', padding: 0,
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                {deleting === e._id ? 'Deleting...' : 'Delete'}
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
