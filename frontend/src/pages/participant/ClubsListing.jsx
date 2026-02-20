import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ClubsListing() {
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/participant/clubs')
            .then(res => setClubs(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>Loading clubs...</div>;

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Clubs & Organizers</h1>
            {clubs.length === 0 ? (
                <p style={{ color: '#777' }}>No clubs or organizers found at this time.</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {clubs.map(club => (
                        <div key={club._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px', background: '#fff' }}>
                            <h3><Link to={`/clubs/${club._id}`} style={{ color: '#337ab7', textDecoration: 'none' }}>{club.organizerName}</Link></h3>
                            <p style={{ margin: '5px 0', color: '#555', fontSize: '14px' }}>{club.category}</p>
                            {club.description && <p style={{ fontSize: '13px', color: '#777' }}>{club.description}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
