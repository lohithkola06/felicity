import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ClubsListing() {
    const [clubs, setClubs] = useState([]);

    useEffect(() => {
        api.get('/organizers').then(res => setClubs(res.data)).catch(console.error);
        // Endpoint might be /clubs or /organizers depending on backend map
    }, []);

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Clubs & Organizers</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {clubs.map(club => (
                    <div key={club._id} style={{ border: '1px solid #ccc', padding: '15px' }}>
                        <h3><Link to={`/clubs/${club._id}`}>{club.name}</Link></h3>
                        <p>{club.category}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
