import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function BrowseEvents() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [eligibility, setEligibility] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [followedOnly, setFollowedOnly] = useState(false);
    const [trending, setTrending] = useState(false);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.append('search', search.trim());
            if (typeFilter) params.append('type', typeFilter);
            if (eligibility) params.append('eligibility', eligibility);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (followedOnly && user) params.append('followedOnly', 'true');
            if (trending) params.append('trending', 'true');

            const res = await api.get(`/events/browse?${params.toString()}`);
            setEvents(res.data);
        } catch (err) {
            console.log('browse error:', err);
        } finally {
            setLoading(false);
        }
    }, [search, typeFilter, eligibility, startDate, endDate, followedOnly, trending, user]);

    useEffect(() => {
        const timer = setTimeout(fetchEvents, 300);
        return () => clearTimeout(timer);
    }, [fetchEvents]);

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Discover Events</h1>
            <p>Find and register for happenings on campus.</p>

            {/* Search and Filters */}
            <div style={{ background: '#fff', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ marginBottom: '12px' }}>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Search events or organizers (partial & fuzzy matching)..."
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Event Type</label>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                            <option value="">All Types</option>
                            <option value="normal">Normal Event</option>
                            <option value="merchandise">Merchandise</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Eligibility</label>
                        <select value={eligibility} onChange={e => setEligibility(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                            <option value="">Any</option>
                            <option value="all">Everyone</option>
                            <option value="iiit-only">IIIT Only</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Date Range</label>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
                            <span style={{ color: '#888' }}>to</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                style={{ padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }} />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="checkbox" checked={trending} onChange={e => setTrending(e.target.checked)} />
                        🔥 Trending (Top 5)
                    </label>
                    {user && user.role === 'participant' && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                            <input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} />
                            ⭐ Followed Clubs Only
                        </label>
                    )}
                </div>
            </div>

            {/* Trending Banner */}
            {trending && !loading && events.length > 0 && (
                <div style={{ padding: '10px 15px', marginBottom: '15px', background: '#fff3e0', border: '1px solid #ffe0b2', borderRadius: '4px', fontSize: '13px', color: '#e65100' }}>
                    🔥 Showing <strong>Top 5 Trending</strong> events by registration count
                </div>
            )}

            {/* Event List */}
            {loading ? (
                <p>Loading events...</p>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <h3>No Events Found</h3>
                    <p style={{ color: '#888' }}>Try adjusting your search filters.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {events.map((event) => (
                        <div key={event._id} style={{ border: '1px solid #ddd', padding: '20px', background: '#fff', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                        background: event.type === 'merchandise' ? '#fce4ec' : '#e3f2fd',
                                        color: event.type === 'merchandise' ? '#c62828' : '#1565c0',
                                        textTransform: 'capitalize'
                                    }}>
                                        {event.type === 'merchandise' ? '🛍️ Merch' : '📅 Event'}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                        background: event.status === 'published' ? '#e8f5e9' : '#e3f2fd',
                                        color: event.status === 'published' ? '#2e7d32' : '#1565c0',
                                    }}>
                                        {event.status === 'published' ? '🟢 Live' : event.status}
                                    </span>
                                </div>
                                {event.registrationFee > 0 ? (
                                    <span style={{ fontWeight: 'bold', color: '#333' }}>Rs. {event.registrationFee}</span>
                                ) : (
                                    <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '12px' }}>FREE</span>
                                )}
                            </div>

                            <h3 style={{ margin: '0 0 6px 0' }}>
                                <Link to={`/events/${event._id}`} style={{ textDecoration: 'none', color: '#333' }}>{event.name}</Link>
                            </h3>

                            {/* Organizer Name */}
                            {event.organizer && (
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                                    by <strong>{event.organizer.organizerName || 'Unknown'}</strong>
                                    {event.organizer.category && <span style={{ marginLeft: '6px', color: '#999' }}>({event.organizer.category})</span>}
                                </div>
                            )}

                            <p style={{
                                color: '#666', fontSize: '13px', marginBottom: '10px', lineHeight: '1.4',
                                overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                            }}>
                                {event.description}
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                                <span>{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Date TBD'}</span>
                                <span>{event.registrationCount} registered</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
