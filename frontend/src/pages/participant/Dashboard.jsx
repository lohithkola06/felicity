import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useDialog } from '../../context/DialogContext';

export default function ParticipantDashboard() {
    const { showAlert } = useDialog();
    const navigate = useNavigate();
    const [data, setData] = useState({ upcoming: [], history: { normal: [], merchandise: [], completed: [], cancelled: [] }, invites: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [confirmCancel, setConfirmCancel] = useState(null);
    const [viewTicket, setViewTicket] = useState(null);
    const [inviteActionConfig, setInviteActionConfig] = useState(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/participant/dashboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    async function handleInviteResponse(teamId, action) {
        if (action === 'accept') {
            // Redirect to My Teams where the form modal exists
            navigate('/participant/teams');
            return;
        }

        try {
            await api.post(`/ teams / ${teamId}/respond`, { action });
            showAlert('Invite declined.');
            fetchDashboard();
        } catch (err) {
            showAlert(err.response?.data?.error || 'could not decline invite');
        }
    }

    // The executeInviteResponse function is no longer needed as handleInviteResponse now performs the action directly.

    function promptCancel(regId) {
        setConfirmCancel(regId);
    }

    async function executeCancel() {
        if (!confirmCancel) return;
        try {
            await api.post(`/participant/registrations/${confirmCancel}/cancel`);
            fetchDashboard();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Cancellation failed');
        } finally {
            setConfirmCancel(null);
        }
    }

    // Pick which list to show based on active tab
    let items = [];
    if (activeTab === 'upcoming') items = data.upcoming || [];
    else if (activeTab === 'normal') items = data.history?.normal || [];
    else if (activeTab === 'merchandise') items = data.history?.merchandise || [];
    else if (activeTab === 'completed') items = data.history?.completed || [];
    else if (activeTab === 'cancelled') items = data.history?.cancelled || [];
    const invites = data.invites || [];

    const tabs = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'normal', label: 'Normal' },
        { key: 'merchandise', label: 'Merchandise' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>My Dashboard</h1>

            {/* Pending Invites */}
            {invites.length > 0 && (
                <div style={{ marginBottom: '25px', background: '#fff8e1', padding: '15px 20px', border: '1px solid #ffecb3', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#f57f17', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Pending Team Invites</span>
                        <span style={{ background: '#f57f17', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>{invites.length}</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                        {invites.map(inv => (
                            <div key={inv.teamId} style={{ background: '#fff', border: '1px solid #ffe082', borderRadius: '6px', padding: '15px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '5px' }}>{inv.teamName}</div>
                                <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px' }}>Event: <strong>{inv.eventName}</strong></div>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>Invited by: {inv.leaderName}</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleInviteResponse(inv.teamId, 'accept')}
                                        style={{ flex: 1, padding: '8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                        Accept
                                    </button>
                                    <button onClick={() => handleInviteResponse(inv.teamId, 'decline')}
                                        style={{ flex: 1, padding: '8px', background: '#fff', color: '#f44336', border: '1px solid #f44336', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                        Decline
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', display: 'flex', gap: '5px' }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        style={{
                            fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                            padding: '8px 14px',
                            borderBottom: activeTab === tab.key ? '2px solid #337ab7' : 'none',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: activeTab === tab.key ? '#337ab7' : '#666',
                        }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? <p>Loading...</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Event</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Type</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Organizer</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Schedule</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Team</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Status</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>Ticket / Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No records in this category.</td></tr>
                        ) : items.map(entry => (
                            <tr key={entry.registrationId}>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <Link to={`/events/${entry.eventId || ''}`} style={{ textDecoration: 'none', color: '#337ab7', fontWeight: 'bold' }}>
                                        {entry.eventName || 'Unknown'}
                                    </Link>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', textTransform: 'capitalize' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                                        background: entry.eventType === 'merchandise' ? '#fce4ec' : '#e3f2fd',
                                        color: entry.eventType === 'merchandise' ? '#c62828' : '#1565c0',
                                    }}>
                                        {entry.eventType === 'merchandise' ? 'Merch' : 'Normal'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{entry.organizer}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd', fontSize: '13px' }}>
                                    {entry.startDate ? new Date(entry.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                                    {entry.endDate && (
                                        <div style={{ color: '#888', fontSize: '11px' }}>
                                            to {new Date(entry.endDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.teamName || '-'}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                                        background: entry.status === 'cancelled' ? '#f2dede' : entry.status === 'completed' ? '#dff0d8' : entry.status === 'rejected' ? '#f2dede' : entry.status === 'pending_approval' ? '#fcf8e3' : '#fcf8e3',
                                        color: entry.status === 'cancelled' ? '#a94442' : entry.status === 'completed' ? '#3c763d' : entry.status === 'rejected' ? '#a94442' : entry.status === 'pending_approval' ? '#8a6d3b' : '#8a6d3b',
                                    }}>
                                        {entry.status === 'pending_approval' || entry.status === 'approved' || entry.status === 'rejected' ? entry.status.replace('_', ' ') : entry.status}
                                    </span>
                                    {entry.status === 'rejected' && entry.rejectionComment && (
                                        <div style={{ marginTop: '5px', fontSize: '11px', color: '#a94442', maxWidth: '150px' }}>
                                            Reason: {entry.rejectionComment}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    {entry.ticketId && (
                                        <button onClick={() => setViewTicket(entry)}
                                            style={{ display: 'block', fontSize: '13px', color: '#337ab7', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                            title="View Ticket & QR Code">
                                            {entry.ticketId}
                                        </button>
                                    )}
                                    {activeTab === 'upcoming' && entry.status !== 'cancelled' && (entry.eventType !== 'merchandise' || entry.status === 'pending_approval') && (
                                        <button onClick={() => promptCancel(entry.registrationId)}
                                            style={{ display: 'block', marginTop: '4px', color: '#d9534f', fontSize: '12px', cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline' }}>
                                            Cancel
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Custom Modal for Cancellations */}
            {confirmCancel && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>Cancel Registration</h3>
                        <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>
                            Are you sure you want to cancel this registration? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setConfirmCancel(null)}
                                style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Keep Registration
                            </button>
                            <button onClick={executeCancel}
                                style={{ padding: '8px 16px', background: '#d9534f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ticket & QR Viewer Modal */}
            {viewTicket && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', maxWidth: '350px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '5px', color: '#333', fontSize: '22px' }}>Your Ticket</h2>
                        <p style={{ margin: 0, color: '#666', fontSize: '14px', marginBottom: '20px' }}>{viewTicket.eventName}</p>

                        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px dashed #ccc', marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Ticket ID</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '20px' }}>
                                {viewTicket.ticketId}
                            </div>

                            {viewTicket.qrCode ? (
                                <img src={viewTicket.qrCode} alt="QR Code" style={{ width: '200px', height: '200px', display: 'block', margin: '0 auto' }} />
                            ) : (
                                <div style={{ width: '200px', height: '200px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#999', fontSize: '12px' }}>
                                    No QR Code
                                </div>
                            )}
                        </div>

                        <button onClick={() => setViewTicket(null)}
                            style={{ width: '100%', padding: '12px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                            Close Window
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
