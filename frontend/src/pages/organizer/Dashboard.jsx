import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function OrganizerDashboard() {
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({ totalEvents: 0, totalRegistrations: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/organizer/events');
            setEvents(res.data);

            // Calculate aggregate stats
            const totalEvents = res.data.length;
            const totalRegistrations = res.data.reduce((acc, e) => acc + (e.registrationCount || 0), 0);
            const totalRevenue = res.data.reduce((acc, e) => acc + (e.revenue || 0), 0);
            setStats({ totalEvents, totalRegistrations, totalRevenue });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Organizer Dashboard</h1>
                <Link to="/organizer/events/new"><button>+ Create Event</button></Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.totalEvents}</h3>
                    <p>Events</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{stats.totalRegistrations}</h3>
                    <p>Registrations</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>Rs. {stats.totalRevenue}</h3>
                    <p>Revenue</p>
                </div>
            </div>

            <h2>Ongoing Events</h2>
            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event Name</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Date</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Registrations</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>No events created.</td></tr> :
                            events.map(e => (
                                <tr key={e._id}>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}><Link to={`/organizer/events/${e._id}`}>{e.name}</Link></td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(e.startDate).toLocaleDateString()}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        <span style={{
                                            padding: '2px 6px', borderRadius: '3px', fontSize: '12px',
                                            background: e.status === 'published' ? '#dff0d8' : '#fcf8e3',
                                            color: e.status === 'published' ? 'green' : '#8a6d3b'
                                        }}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{e.registrationCount}</td>
                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                        <Link to={`/organizer/events/${e._id}/edit`} style={{ marginRight: '10px' }}>Edit</Link>
                                        <Link to={`/organizer/events/${e._id}/attendance`} style={{ marginRight: '10px' }}>Attendance</Link>
                                        <Link to={`/organizer/events/${e._id}/feedback`}>Feedback</Link>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
