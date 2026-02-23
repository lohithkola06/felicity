import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

export default function ClubsListing() {
    const { user } = useAuth();
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followedIds, setFollowedIds] = useState(new Set());
    const [actionLoading, setActionLoading] = useState(null);
    const { showAlert } = useDialog();

    useEffect(() => {
        loadClubs();
    }, []);

    async function loadClubs() {
        try {
            const res = await api.get('/participant/clubs');
            setClubs(res.data);

            // Load which ones the user follows
            if (user?.role === 'participant') {
                try {
                    const profileRes = await api.get('/participant/profile');
                    const followed = (profileRes.data.followedOrganizers || []).map(o => o._id || o);
                    setFollowedIds(new Set(followed));
                } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleFollow(clubId) {
        setActionLoading(clubId);
        try {
            await api.post(`/participant/clubs/${clubId}/follow`);
            setFollowedIds(prev => new Set([...prev, clubId]));
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to follow');
        }
        setActionLoading(null);
    }

    async function handleUnfollow(clubId) {
        setActionLoading(clubId);
        try {
            await api.post(`/participant/clubs/${clubId}/unfollow`);
            setFollowedIds(prev => {
                const next = new Set(prev);
                next.delete(clubId);
                return next;
            });
        } catch (err) {
            showAlert(err.response?.data?.error || 'Failed to unfollow');
        }
        setActionLoading(null);
    }

    if (loading) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Loading clubs...</div>;

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Clubs & Organizers</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Browse all clubs and organizers. Follow the ones you're interested in to get personalized event recommendations!
            </p>
            {clubs.length === 0 ? (
                <p style={{ color: '#777' }}>No clubs or organizers found at this time.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {clubs.map(club => {
                        const isFollowing = followedIds.has(club._id);
                        return (
                            <div key={club._id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px' }}>
                                            <Link to={`/clubs/${club._id}`} style={{ color: '#337ab7', textDecoration: 'none' }}>
                                                {club.organizerName}
                                            </Link>
                                        </h3>
                                        <span style={{
                                            fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                                            background: club.category === 'Technical' ? '#e3f2fd' :
                                                club.category === 'Cultural' ? '#f3e5f5' :
                                                    club.category === 'Sports' ? '#e8f5e9' : '#fff3e0',
                                            color: club.category === 'Technical' ? '#1565c0' :
                                                club.category === 'Cultural' ? '#7b1fa2' :
                                                    club.category === 'Sports' ? '#2e7d32' : '#e65100',
                                        }}>
                                            {club.category}
                                        </span>
                                    </div>
                                </div>
                                {club.description && (
                                    <p style={{ fontSize: '13px', color: '#777', marginTop: '10px', marginBottom: '10px' }}>
                                        {club.description}
                                    </p>
                                )}

                                {/* Follow/Unfollow Button */}
                                {user?.role === 'participant' && (
                                    <button
                                        onClick={() => isFollowing ? handleUnfollow(club._id) : handleFollow(club._id)}
                                        disabled={actionLoading === club._id}
                                        style={{
                                            width: '100%', padding: '8px',
                                            background: isFollowing ? '#f5f5f5' : '#337ab7',
                                            color: isFollowing ? '#666' : '#fff',
                                            border: isFollowing ? '1px solid #ddd' : 'none',
                                            borderRadius: '4px', cursor: 'pointer',
                                            fontSize: '13px', fontWeight: 'bold',
                                            marginTop: '8px',
                                        }}
                                    >
                                        {actionLoading === club._id ? '...' : isFollowing ? 'Following' : '+ Follow'}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
