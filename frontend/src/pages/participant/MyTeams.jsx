import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function MyTeams() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchTeams(); }, []);

    const fetchTeams = async () => {
        try {
            const res = await api.get('/teams/my-teams');
            const allTeams = res.data;

            // Separate pending invites from active teams
            const myInvites = [];
            const myTeams = [];
            for (const t of allTeams) {
                const mem = t.members?.find(m =>
                    (m.user?._id === user._id || m.user === user._id) && m.status === 'pending'
                );
                if (mem && String(t.leader?._id || t.leader) !== user._id) {
                    myInvites.push(t);
                } else {
                    myTeams.push(t);
                }
            }
            setTeams(myTeams);
            setInvites(myInvites);
        } catch (error) {
            console.error('Failed to fetch teams', error);
        } finally {
            setLoading(false);
        }
    };

    async function handleInviteResponse(teamId, action) {
        try {
            await api.post(`/teams/${teamId}/${action}`);
            fetchTeams();
        } catch (err) {
            alert(err.response?.data?.error || 'Action failed');
        }
    }

    async function handleDisband(teamId) {
        if (!confirm('Are you sure you want to disband this team?')) return;
        try {
            await api.delete(`/teams/${teamId}`);
            fetchTeams();
        } catch (err) {
            alert(err.response?.data?.error || 'Could not disband team');
        }
    }

    async function handleRegisterTeam(teamId) {
        if (!confirm('Register the entire team? All members must have accepted their invites.')) return;
        try {
            const res = await api.post(`/teams/${teamId}/register`);
            alert(res.data.message || 'Team registered!');
            fetchTeams();
        } catch (err) {
            alert(err.response?.data?.error || 'Registration failed');
        }
    }

    const statusStyle = (status) => ({
        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
        background: status === 'registered' ? '#dff0d8' : status === 'ready' ? '#d9edf7' : '#fcf8e3',
        color: status === 'registered' ? '#3c763d' : status === 'ready' ? '#31708f' : '#8a6d3b',
    });

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>My Teams</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Manage your teams, respond to invites, and register for team events.
                To create a new team, go to the event detail page and select "Register as Team".
            </p>

            {/* Pending Invites */}
            {invites.length > 0 && (
                <div style={{ marginBottom: '30px', background: '#fff8e1', padding: '20px', border: '1px solid #ffecb3', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, color: '#f57f17' }}>Pending Invites ({invites.length})</h3>
                    {invites.map(inv => (
                        <div key={inv._id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '1px solid #ffe082', padding: '12px 0', flexWrap: 'wrap', gap: '10px'
                        }}>
                            <div>
                                <strong>{inv.name}</strong>
                                <span style={{ color: '#888', fontSize: '13px', marginLeft: '8px' }}>
                                    for {inv.event?.name || 'Unknown Event'}
                                </span>
                                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                    Leader: {inv.leader?.firstName} {inv.leader?.lastName} ({inv.leader?.email})
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleInviteResponse(inv._id, 'accept')}
                                    style={{ padding: '6px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Accept
                                </button>
                                <button onClick={() => handleInviteResponse(inv._id, 'decline')}
                                    style={{ padding: '6px 16px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Decline
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Team Cards */}
            <h3>Your Teams</h3>
            {loading ? <p>Loading...</p> : teams.length === 0 ? (
                <p style={{ color: '#888' }}>You are not part of any teams yet. Browse events and join or create a team!</p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {teams.map(team => {
                        const isLeader = String(team.leader?._id || team.leader) === user._id;
                        return (
                            <div key={team._id} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0 }}>{team.name}</h4>
                                    <span style={statusStyle(team.status)}>{team.status}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                                    Event: <Link to={`/events/${team.event?._id}`}>{team.event?.name || 'Unknown'}</Link>
                                </p>

                                {/* Members List */}
                                <div style={{ marginBottom: '15px' }}>
                                    <strong style={{ fontSize: '12px', color: '#888' }}>Members:</strong>
                                    <ul style={{ fontSize: '13px', paddingLeft: '20px', marginTop: '5px', marginBottom: 0 }}>
                                        <li>
                                            {team.leader?.firstName} {team.leader?.lastName}
                                            <span style={{ color: '#337ab7', fontSize: '11px', marginLeft: '4px' }}>(Leader)</span>
                                        </li>
                                        {team.members?.map((m, i) => (
                                            <li key={i}>
                                                {m.user?.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.email}
                                                <span style={{
                                                    marginLeft: '6px', fontSize: '10px', fontWeight: 'bold',
                                                    color: m.status === 'accepted' ? '#4caf50' : m.status === 'declined' ? '#f44336' : '#ff9800'
                                                }}>
                                                    ({m.status})
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {team.status !== 'registered' && (
                                        <Link to={`/teams/${team._id}/chat`}>
                                            <button style={{ padding: '6px 12px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                                Team Chat
                                            </button>
                                        </Link>
                                    )}
                                    {team.status === 'registered' && (
                                        <Link to={`/teams/${team._id}/chat`}>
                                            <button style={{ padding: '6px 12px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                                Team Chat
                                            </button>
                                        </Link>
                                    )}
                                    {isLeader && team.status === 'ready' && (
                                        <button onClick={() => handleRegisterTeam(team._id)}
                                            style={{ padding: '6px 12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                            Register Team
                                        </button>
                                    )}
                                    {isLeader && team.status !== 'registered' && (
                                        <button onClick={() => handleDisband(team._id)}
                                            style={{ padding: '6px 12px', background: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                            Disband
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
