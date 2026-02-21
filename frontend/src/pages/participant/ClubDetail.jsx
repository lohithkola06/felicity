import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function ClubDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const [club, setClub] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/participant/clubs/${id}`)
            .then(res => {
                setClub(res.data.club);
                setUpcomingEvents(res.data.upcomingEvents || []);
                setPastEvents(res.data.pastEvents || []);
                setIsFollowing(res.data.isFollowing || false);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    async function toggleFollow() {
        try {
            if (isFollowing) {
                await api.post(`/participant/clubs/${id}/unfollow`);
                setIsFollowing(false);
            } else {
                await api.post(`/participant/clubs/${id}/follow`);
                setIsFollowing(true);
            }
        } catch (err) {
            console.error('Follow toggle failed:', err);
        }
    }

    if (loading) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Loading...</div>;
    if (!club) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Club not found.</div>;

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: '0 0 5px 0' }}>{club.organizerName}</h1>
                    <span style={{ display: 'inline-block', background: '#eee', padding: '3px 10px', borderRadius: '12px', fontSize: '13px', color: '#555' }}>{club.category}</span>
                </div>
                {user && user.role === 'participant' && (
                    <button onClick={toggleFollow} style={{
                        padding: '8px 20px', border: '1px solid #337ab7', borderRadius: '4px', cursor: 'pointer',
                        background: isFollowing ? '#337ab7' : '#fff', color: isFollowing ? '#fff' : '#337ab7'
                    }}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                )}
            </div>

            {club.description && <p style={{ color: '#555', marginBottom: '20px' }}>{club.description}</p>}
            {club.contactEmail && <p style={{ fontSize: '14px', color: '#777' }}>Contact: {club.contactEmail}</p>}

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '30px' }}>Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
                <p style={{ color: '#999' }}>No upcoming events scheduled right now.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {upcomingEvents.map(e => (
                        <li key={e._id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <Link to={`/events/${e._id}`} style={{ color: '#337ab7', textDecoration: 'none', fontWeight: 'bold' }}>{e.name}</Link>
                            <span style={{ marginLeft: '10px', fontSize: '13px', color: '#777' }}>{new Date(e.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                            <span style={{ marginLeft: '10px', fontSize: '12px', background: e.type === 'merchandise' ? '#fcf8e3' : '#dff0d8', padding: '2px 8px', borderRadius: '10px' }}>{e.type}</span>
                        </li>
                    ))}
                </ul>
            )}

            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '30px' }}>Past Events</h3>
            {pastEvents.length === 0 ? (
                <p style={{ color: '#999' }}>No past events yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {pastEvents.map(e => (
                        <li key={e._id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <Link to={`/events/${e._id}`} style={{ color: '#337ab7', textDecoration: 'none' }}>{e.name}</Link>
                            <span style={{ marginLeft: '10px', fontSize: '13px', color: '#777' }}>{new Date(e.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
