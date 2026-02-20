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
            <div style={{ background: '#eee', padding: '15px', border: '1px solid #ccc', marginBottom: '20px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..." style={{ width: '100%', padding: '8px' }} />
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Type:</strong>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="">All Types</option>
                            <option value="normal">Normal Event</option>
                            <option value="merchandise">Merchandise</option>
                        </select>
                    </div>

                    <div>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Eligibility:</strong>
                        <select value={eligibility} onChange={e => setEligibility(e.target.value)}>
                            <option value="">Any</option>
                            <option value="all">Everyone</option>
                            <option value="iiit-only">IIIT Only</option>
                        </select>
                    </div>

                    <div>
                        <strong style={{ display: 'block', marginBottom: '5px' }}>Date Range:</strong>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /> to <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '15px' }}>
                    <label>
                        <input type="checkbox" checked={trending} onChange={e => setTrending(e.target.checked)} /> Show Trending Top 5
                    </label>
                    {user && user.role === 'participant' && (
                        <label>
                            <input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} /> Followed Clubs Only
                        </label>
                    )}
                </div>
            </div>

            {/* Event List */}
            {loading ? (
                <p>Loading events...</p>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h3>No Events Found</h3>
                    <p>Try adjusting your search filters.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {events.map((event) => (
                        <div key={event._id} style={{ border: '1px solid #ccc', padding: '15px', background: '#fff', borderRadius: '4px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <span style={{ background: '#eee', padding: '3px 8px', borderRadius: '3px', fontSize: '12px', marginRight: '5px', textTransform: 'capitalize' }}>{event.type}</span>
                                <span style={{ fontSize: '12px', color: event.status === 'published' ? 'green' : 'gray' }}>
                                    {event.status === 'published' ? 'Live' : event.status}
                                </span>
                            </div>
                            <h3><Link to={`/events/${event._id}`}>{event.name}</Link></h3>
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px' }}>{event.description}</p>
                            <div style={{ fontSize: '12px', color: '#888' }}>
                                {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Date TBD'}
                                {event.registrationFee > 0 ? ` | Rs. ${event.registrationFee}` : ' | Free'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
