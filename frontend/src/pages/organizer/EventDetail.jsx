import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function OrgEventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);

    useEffect(() => {
        api.get(`/events/${id}`).then(res => setEvent(res.data));
    }, [id]);

    if (!event) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '960px', margin: '20px auto', padding: '20px' }}>
            <h1>{event.name} (Organizer View)</h1>
            <p>Status: {event.status}</p>
            <p>Registrations: {event.registrationCount}</p>
            <p>Revenue: Rs. {event.revenue || 0}</p>
        </div>
    );
}
