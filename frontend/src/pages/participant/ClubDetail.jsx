import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function ClubDetail() {
    const { id } = useParams();
    const [club, setClub] = useState(null);

    useEffect(() => {
        api.get(`/organizers/${id}`).then(res => setClub(res.data));
    }, [id]);

    if (!club) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>{club.name}</h1>
            <p><strong>Category:</strong> {club.category}</p>
            <p>{club.description}</p>

            <h3>Events</h3>
            {/* List events if available in response */}
            <ul>
                {(club.events || []).map(e => (
                    <li key={e._id}>{e.name}</li>
                ))}
            </ul>
        </div>
    );
}
