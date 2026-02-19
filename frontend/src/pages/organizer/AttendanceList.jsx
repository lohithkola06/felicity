import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';

export default function AttendanceList() {
    const { id } = useParams();
    const [participants, setParticipants] = useState([]);

    useEffect(() => {
        api.get(`/events/${id}/participants`).then(res => setParticipants(res.data));
    }, [id]);

    return (
        <div style={{ maxWidth: '960px', margin: '20px auto' }}>
            <h1>Participants</h1>
            <ul>
                {participants.map(p => (
                    <li key={p._id}>{p.name} - {p.status}</li>
                ))}
            </ul>
        </div>
    );
}
