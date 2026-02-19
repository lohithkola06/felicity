import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

export default function MyTeams() {
    const [teams, setTeams] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createName, setCreateName] = useState('');

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            const [tRes, iRes] = await Promise.all([
                api.get('/teams/my-teams'),
                api.get('/teams/invites')
            ]);
            setTeams(tRes.data);
            setInvites(iRes.data);
        } catch (error) {
            console.error('Failed to fetch teams', error);
        } finally {
            setLoading(false);
        }
    };

    async function createTeam(e) {
        e.preventDefault();
        try {
            await api.post('/teams', { name: createName }); // Need eventId? Usually teams are for specific events. 
            // Wait, Hackathon Team Registration usually requires selecting an event.
            // Simplified for now: assume generic team or we need to select event.
            // Based on previous code, maybe we create team for specific event?
            // Actually, usually users register for event AS a team. 
            // Let's assume this page lists teams they are part of.
            // If creation requires event, we might need a dropdown or it's done via Event page.
            // I'll stick to listing for now, and maybe a simple create if API supports it without event (or returns error).
            alert('To create a team, please register for a Hackathon event.');
        } catch (err) {
            alert(err.response?.data?.error);
        }
    }

    async function handleInvite(teamId, status) {
        try {
            await api.post(`/teams/${teamId}/invite/respond`, { status });
            fetchTeams();
        } catch (err) {
            alert('Action failed');
        }
    }

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>My Teams</h1>

            {/* Invites Section */}
            {invites.length > 0 && (
                <div style={{ marginBottom: '30px', background: '#ffe', padding: '15px', border: '1px solid #eecc00' }}>
                    <h3>Pending Invites</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {invites.map(inv => (
                            <li key={inv._id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '10px 0' }}>
                                <span>Invited to <strong>{inv.team.name}</strong> for event <em>{inv.event.name}</em></span>
                                <div>
                                    <button onClick={() => handleInvite(inv.team._id, 'accepted')} style={{ marginRight: '10px', color: 'green' }}>Accept</button>
                                    <button onClick={() => handleInvite(inv.team._id, 'rejected')} style={{ color: 'red' }}>Decline</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <h3>Your Teams</h3>
            {loading ? <p>Loading...</p> : teams.length === 0 ? <p>You are not part of any teams.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {teams.map(team => (
                        <div key={team._id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '4px' }}>
                            <h4>{team.name}</h4>
                            <p style={{ fontSize: '13px' }}>Event: {team.event?.name}</p>
                            <div style={{ margin: '15px 0' }}>
                                <strong>Members:</strong>
                                <ul style={{ fontSize: '13px', paddingLeft: '20px', marginTop: '5px' }}>
                                    {team.members.map(m => (
                                        <li key={m._id}>{m.name} {m._id === team.leader ? '(Leader)' : ''}</li>
                                    ))}
                                </ul>
                            </div>
                            <Link to={`/teams/${team._id}/chat`}>
                                <button style={{ width: '100%' }}>Open Team Chat</button>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
