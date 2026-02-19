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
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '10px' }}>Discover Campus Happenings</h1>
                <p style={{ fontSize: '1.1rem', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
                    Explore events, workshops, and competitions happening around you.
                </p>
            </div>

            {/* Filters Container */}
            <div style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                marginBottom: '40px',
                border: '1px solid #eaeaea'
            }}>
                {/* Search Bar */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }}>🔍</span>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by event name, organizer, or tags..."
                            style={{
                                width: '100%',
                                padding: '14px 14px 14px 48px',
                                fontSize: '16px',
                                borderRadius: '12px',
                                border: '1px solid #ddd',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = '#007bff'}
                            onBlur={e => e.target.style.borderColor = '#ddd'}
                        />
                    </div>
                </div>

                {/* Filter Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'end' }}>

                    {/* Event Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#444' }}>Event Type</label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff' }}
                        >
                            <option value="">All Events</option>
                            <option value="normal">Events & Workshops</option>
                            <option value="hackathon">Hackathons</option>
                            <option value="merchandise">Merchandise Sales</option>
                        </select>
                    </div>

                    {/* Eligibility */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#444' }}>Who Can Join?</label>
                        <select
                            value={eligibility}
                            onChange={e => setEligibility(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#fff' }}
                        >
                            <option value="">Everyone</option>
                            <option value="all">Open to All</option>
                            <option value="iiit">IIIT Students Only</option>
                        </select>
                    </div>

                    {/* Date Range - Simplified */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#444' }}>Date Range</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                            <span style={{ color: '#999' }}>to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Toggles */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '24px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                        <div style={{ position: 'relative', width: '40px', height: '20px' }}>
                            <input
                                type="checkbox"
                                checked={trending}
                                onChange={e => setTrending(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: trending ? '#007bff' : '#ccc', borderRadius: '20px', transition: '.4s'
                            }}>
                                <span style={{
                                    position: 'absolute', content: '""', height: '16px', width: '16px', left: trending ? '22px' : '2px', bottom: '2px',
                                    backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                                }}></span>
                            </span>
                        </div>
                        <span style={{ fontWeight: '500', color: '#333' }}>🔥 Trending (Top 5)</span>
                    </label>

                    {user && user.role === 'participant' && (
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                            <div style={{ position: 'relative', width: '40px', height: '20px' }}>
                                <input
                                    type="checkbox"
                                    checked={followedOnly}
                                    onChange={e => setFollowedOnly(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: followedOnly ? '#28a745' : '#ccc', borderRadius: '20px', transition: '.4s'
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '16px', width: '16px', left: followedOnly ? '22px' : '2px', bottom: '2px',
                                        backgroundColor: 'white', borderRadius: '50%', transition: '.4s'
                                    }}></span>
                                </span>
                            </div>
                            <span style={{ fontWeight: '500', color: '#333' }}>❤️ Following</span>
                        </label>
                    )}
                </div>
            </div>

            {/* Event List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>Finding the best events for you...</div>
            ) : events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', background: '#f9f9f9', borderRadius: '16px', border: '1px dashed #ddd' }}>
                    <h3 style={{ color: '#444', marginBottom: '10px' }}>No events matched your search</h3>
                    <p style={{ color: '#888' }}>Try adjusting your filters or clearing them to see everything.</p>
                    <button
                        onClick={() => { setSearch(''); setTypeFilter(''); setEligibility(''); setStartDate(''); setEndDate(''); setTrending(false); setFollowedOnly(false); }}
                        style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', color: '#007bff' }}
                    >
                        Clear All Filters
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '30px' }}>
                    {events.map((event) => (
                        <div key={event._id} style={{
                            background: '#fff',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            border: '1px solid #f0f0f0',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ padding: '20px', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{
                                        background: event.type === 'hackathon' ? '#e3f2fd' : event.type === 'merchandise' ? '#fff3e0' : '#f3f4f6',
                                        color: event.type === 'hackathon' ? '#1976d2' : event.type === 'merchandise' ? '#f57c00' : '#4b5563',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        {event.type}
                                    </span>
                                    {event.status === 'ongoing' && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#28a745', fontWeight: '600' }}>
                                            <span style={{ width: '8px', height: '8px', background: '#28a745', borderRadius: '50%' }}></span>
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', lineHeight: '1.4' }}>
                                    <Link to={`/events/${event._id}`} style={{ color: '#1a1a1a', textDecoration: 'none', transition: 'color 0.2s' }}>
                                        {event.name}
                                    </Link>
                                </h3>
                                <div style={{ fontSize: '14px', color: '#555', marginBottom: '15px' }}>
                                    <span style={{ display: 'inline-block', marginRight: '15px' }}>🗓 {event.startDate ? new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}</span>
                                    <span>👤 {event.organizer?.organizerName || 'Unknown Organizer'}</span>
                                </div>
                                <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.5', margin: '0', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {event.description}
                                </p>
                            </div>
                            <div style={{ padding: '20px', borderTop: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
                                <span style={{ fontWeight: '600', color: '#333' }}>
                                    {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                                </span>
                                <Link to={`/events/${event._id}`} style={{
                                    padding: '8px 16px', background: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500'
                                }}>
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
