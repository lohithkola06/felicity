import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function OrganizerDashboard() {
    const [events, setEvents] = useState([]);
    const [stats, setStats] = useState({ totalEvents: 0, activeEvents: 0, totalRegistrations: 0, totalRevenue: 0, totalAttendance: 0 });
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const carouselRef = useRef(null);
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

    const scrollCarousel = (dir) => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
        }
    };

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

    // Stats for completed events only
    const completedEvents = events.filter(e => e.status === 'completed' || e.status === 'closed');

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Organizer Dashboard</h1>
                <Link to="/organizer/events/new"><button style={{ padding: '8px 16px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ Create Event</button></Link>
            </div>

            {/* Analytics Overview */}
            <h2 style={{ marginBottom: '10px' }}>Event Analytics</h2>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3>{stats.totalEvents}</h3>
                    <p>Total Events</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3>{stats.activeEvents}</h3>
                    <p>Active Events</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3>{stats.totalRegistrations}</h3>
                    <p>Registrations</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3>Rs. {stats.totalRevenue}</h3>
                    <p>Revenue</p>
                </div>
                <div style={{ flex: 1, minWidth: '140px', border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3>{stats.totalAttendance}</h3>
                    <p>Attendance</p>
                </div>
            </div>

            {/* Events Carousel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2>My Events</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => scrollCarousel(-1)} style={{ padding: '6px 12px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>←</button>
                    <button onClick={() => scrollCarousel(1)} style={{ padding: '6px 12px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>→</button>
                </div>
            </div>

            {loading ? <p>Loading...</p> : events.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <p style={{ color: '#777' }}>No events created yet. Click "Create Event" to get started!</p>
                </div>
            ) : (
                <div
                    ref={carouselRef}
                    style={{
                        display: 'flex',
                        gap: '16px',
                        overflowX: 'auto',
                        paddingBottom: '10px',
                        scrollSnapType: 'x mandatory',
                        scrollbarWidth: 'thin',
                    }}
                >
                    {events.map(e => {
                        const sc = statusColor(e.status);
                        return (
                            <div
                                key={e._id}
                                style={{
                                    minWidth: '280px',
                                    maxWidth: '300px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    background: '#fff',
                                    padding: '20px',
                                    scrollSnapAlign: 'start',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', lineHeight: '1.3' }}>{e.name}</h3>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                            background: sc.bg, color: sc.color, textTransform: 'uppercase', whiteSpace: 'nowrap', marginLeft: '8px',
                                        }}>
                                            {e.status}
                                        </span>
                                    </div>
                                    <p style={{ color: '#666', fontSize: '13px', textTransform: 'capitalize', marginBottom: '6px' }}>
                                        {e.type === 'merchandise' ? 'Merchandise' : 'Standard Event'}
                                    </p>
                                    <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>
                                        {e.startDate ? new Date(e.startDate).toLocaleDateString() : 'Date TBD'}
                                    </p>
                                    <p style={{ color: '#888', fontSize: '12px' }}>
                                        {e.registrationCount} registration{e.registrationCount !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
                                    <Link to={`/organizer/events/${e._id}`}
                                        style={{ padding: '5px 12px', background: '#337ab7', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '12px' }}>
                                        View Details
                                    </Link>
                                    {['draft', 'published'].includes(e.status) && (
                                        <Link to={`/organizer/events/${e._id}/edit`}
                                            style={{ padding: '5px 12px', background: '#f0ad4e', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '12px' }}>
                                            Edit
                                        </Link>
                                    )}
                                    {e.status !== 'ongoing' && (
                                        <button
                                            onClick={() => handleDelete(e._id, e.name)}
                                            disabled={deleting === e._id}
                                            style={{
                                                padding: '5px 12px', background: '#d9534f', color: '#fff',
                                                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                            }}
                                        >
                                            {deleting === e._id ? '...' : 'Delete'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
