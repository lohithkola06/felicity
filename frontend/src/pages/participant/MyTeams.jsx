import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { openFile } from '../../utils/fileResolver';

const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

export default function MyTeams() {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmAction, setConfirmAction] = useState(null);
    const [acceptingInvite, setAcceptingInvite] = useState(null); // The invite currently being accepted
    const [editingResponses, setEditingResponses] = useState(null); // The team being edited
    const [formResponses, setFormResponses] = useState({});
    const [uploadingFields, setUploadingFields] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteEmail, setInviteEmail] = useState({}); // To hold new emails keyed by teamId
    const { showAlert, showConfirm } = useDialog();

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

    async function handleDeclineInvite(teamId) {
        try {
            await api.post(`/teams/${teamId}/decline`);
            fetchTeams();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Decline failed');
        }
    }

    async function handleAcceptInvite(e) {
        e.preventDefault();

        // Validate custom form
        const event = acceptingInvite.event;
        for (const field of event.customForm || []) {
            if (field.required && !formResponses[field.label]) {
                if (field.fieldType === 'checkbox' && formResponses[field.label]?.length === 0) continue;
                if (field.fieldType === 'file' && !formResponses[field.label]) {
                    return showAlert(`Please upload the required file for: ${field.label}`);
                }
                if (!formResponses[field.label] && formResponses[field.label] !== false) {
                    return showAlert(`Please fill in the required field: ${field.label}`);
                }
            }
        }

        setIsSubmitting(true);
        try {
            await api.post(`/teams/${acceptingInvite._id}/accept`, { formResponses });
            setAcceptingInvite(null);
            setFormResponses({});
            fetchTeams();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Accept failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleUpdateResponses(e) {
        e.preventDefault();
        const event = editingResponses.event;
        const form = event?.customForm || [];

        // Validate
        for (const field of form) {
            if (field.required && !formResponses[field.label]) {
                if (field.fieldType === 'checkbox' && formResponses[field.label]?.length === 0) continue;
                if (!formResponses[field.label] && formResponses[field.label] !== false) {
                    return showAlert(`Please fill in required field: ${field.label}`);
                }
            }
        }

        setIsSubmitting(true);
        try {
            await api.put(`/teams/${editingResponses._id}/responses`, { formResponses });
            setEditingResponses(null);
            setFormResponses({});
            fetchTeams();
            showAlert('Responses updated successfully!');
        } catch (err) {
            showAlert(err.response?.data?.error || 'Update failed');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleInviteMember(teamId) {
        const email = inviteEmail[teamId];
        if (!email) return showAlert('Email required');
        try {
            await api.post(`/teams/${teamId}/invite`, { email });
            setInviteEmail({ ...inviteEmail, [teamId]: '' });
            fetchTeams();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Invite failed');
        }
    }

    async function handleRemoveMember(teamId, email) {
        const confirmed = await showConfirm(`Remove ${email} from the team?`);
        if (!confirmed) return;
        try {
            await api.delete(`/teams/${teamId}/member/${email}`);
            fetchTeams();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Removal failed');
        }
    }

    function promptAction(action, teamId, message) {
        setConfirmAction({ action, teamId, message });
    }

    async function executeConfirmAction() {
        if (!confirmAction) return;
        const { action, teamId } = confirmAction;

        try {
            if (action === 'disband') {
                await api.delete(`/teams/${teamId}`);
            } else if (action === 'register') {
                const res = await api.post(`/teams/${teamId}/register`);
                showAlert(res.data.message || 'Team registered!');
            }
            fetchTeams();
        } catch (err) {
            showAlert(err.response?.data?.error || 'Action failed');
        } finally {
            setConfirmAction(null);
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
                                <button onClick={() => {
                                    setAcceptingInvite(inv);
                                    setFormResponses({});
                                }}
                                    style={{ padding: '6px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                    Review & Accept
                                </button>
                                <button onClick={() => handleDeclineInvite(inv._id)}
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
                                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <div>
                                                    {m.user?.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.email}
                                                    <span style={{
                                                        marginLeft: '6px', fontSize: '10px', fontWeight: 'bold',
                                                        color: m.status === 'accepted' ? '#4caf50' : m.status === 'declined' ? '#f44336' : '#ff9800'
                                                    }}>
                                                        ({m.status})
                                                    </span>
                                                </div>
                                                {isLeader && team.status !== 'registered' && (
                                                    <button onClick={() => handleRemoveMember(team._id, m.email)}
                                                        style={{ background: 'none', border: 'none', color: '#d9534f', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
                                                        Remove
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Invite New Member */}
                                {isLeader && team.status !== 'registered' && team.members?.length < (team.maxSize - 1) && (
                                    <div style={{ marginBottom: '15px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input
                                            type="email"
                                            placeholder="Invite another member..."
                                            value={inviteEmail[team._id] || ''}
                                            onChange={e => setInviteEmail({ ...inviteEmail, [team._id]: e.target.value })}
                                            style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px' }}
                                        />
                                        <button onClick={() => handleInviteMember(team._id)}
                                            style={{ padding: '6px 12px', background: '#5bc0de', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                            Invite
                                        </button>
                                    </div>
                                )}

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
                                    {/* Edit Responses Button */}
                                    {!(team.event?.registrationDeadline && new Date() > new Date(team.event.registrationDeadline)) && (
                                        <button onClick={() => {
                                            const myResponses = isLeader ? team.formResponses : team.members.find(m => m.user?._id === user._id || m.user === user._id)?.formResponses;
                                            setEditingResponses(team);
                                            setFormResponses(myResponses || {});
                                        }}
                                            style={{ padding: '6px 12px', background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                            Edit Responses
                                        </button>
                                    )}
                                    {isLeader && team.status === 'ready' && (
                                        <button onClick={() => promptAction('register', team._id, 'Register the entire team? All members must have accepted their invites.')}
                                            style={{ padding: '6px 12px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                            Register Team
                                        </button>
                                    )}
                                    {isLeader && team.status !== 'registered' && (
                                        <button onClick={() => promptAction('disband', team._id, 'Are you sure you want to disband this team?')}
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

            {/* Custom Confirm Modal */}
            {confirmAction && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>Confirm Action</h3>
                        <p style={{ margin: 0, color: '#555', fontSize: '15px', lineHeight: '1.5' }}>
                            {confirmAction.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setConfirmAction(null)}
                                style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Cancel
                            </button>
                            <button onClick={executeConfirmAction}
                                style={{ padding: '8px 16px', background: confirmAction.action === 'disband' ? '#d9534f' : '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Accept Invite Form Modal */}
            {acceptingInvite && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    overflowY: 'auto'
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '600px', width: '90%', margin: '40px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0 }}>Join {acceptingInvite.name}</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            You've been invited to join <strong>{acceptingInvite.name}</strong> for <strong>{acceptingInvite.event?.name}</strong>.
                            {acceptingInvite.event?.customForm?.length > 0 && " Please fill out the registration form below to complete your acceptance."}
                        </p>

                        <form onSubmit={handleAcceptInvite}>
                            {acceptingInvite.event?.customForm && acceptingInvite.event.customForm.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                                    <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Event Form</h4>
                                    {acceptingInvite.event.customForm.map((field, i) => (
                                        <div key={i} style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                                {field.label}
                                                {field.required && <span style={{ color: '#d9534f' }}> *</span>}
                                            </label>

                                            {field.fieldType === 'text' && (
                                                <input type="text"
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                            )}

                                            {field.fieldType === 'textarea' && (
                                                <textarea
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '80px' }} />
                                            )}

                                            {field.fieldType === 'dropdown' && (
                                                <select
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                    <option value="">Select...</option>
                                                    {(field.options || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {field.fieldType === 'checkbox' && (
                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {(field.options || []).map(opt => (
                                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                            <input type="checkbox"
                                                                checked={(formResponses[field.label] || []).includes(opt)}
                                                                onChange={e => {
                                                                    const curr = formResponses[field.label] || [];
                                                                    setFormResponses({
                                                                        ...formResponses,
                                                                        [field.label]: e.target.checked
                                                                            ? [...curr, opt]
                                                                            : curr.filter(v => v !== opt)
                                                                    });
                                                                }} />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {field.fieldType === 'file' && (
                                                <div>
                                                    {formResponses[field.label] ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e8f5e9', padding: '8px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                                                            <button type="button" onClick={() => openFile(formResponses[field.label])} style={{ background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                                                View Uploaded File
                                                            </button>
                                                            <button type="button" onClick={() => {
                                                                const newResponses = { ...formResponses };
                                                                delete newResponses[field.label];
                                                                setFormResponses(newResponses);
                                                            }}
                                                                style={{ padding: '2px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <input type="file"
                                                                required={field.required}
                                                                disabled={uploadingFields[field.label] || isSubmitting}
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;

                                                                    setUploadingFields(prev => ({ ...prev, [field.label]: true }));
                                                                    try {
                                                                        const base64 = await toBase64(file);
                                                                        const token = localStorage.getItem('token');
                                                                        const uploadRes = await api.post('/upload', {
                                                                            filename: file.name,
                                                                            data: base64,
                                                                            mimetype: file.type
                                                                        }, {
                                                                            headers: {
                                                                                'Authorization': token ? `Bearer ${token}` : ''
                                                                            }
                                                                        });
                                                                        setFormResponses(prev => ({ ...prev, [field.label]: uploadRes.data }));
                                                                    } catch (err) {
                                                                        showAlert('Failed to upload file');
                                                                        e.target.value = null;
                                                                    } finally {
                                                                        setUploadingFields(prev => ({ ...prev, [field.label]: false }));
                                                                    }
                                                                }}
                                                                style={{ padding: '6px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }} />
                                                            {uploadingFields[field.label] && <small style={{ color: '#eb9b34', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>Uploading to Cloudinary...</small>}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => { setAcceptingInvite(null); setFormResponses({}); }} disabled={isSubmitting}
                                    style={{ padding: '8px 16px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting || Object.values(uploadingFields).some(v => v)}
                                    style={{ padding: '8px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {isSubmitting ? 'Accepting...' : Object.values(uploadingFields).some(v => v) ? 'Uploading...' : 'Accept Invite & Join Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Responses Modal */}
            {editingResponses && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    overflowY: 'auto'
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '600px', width: '90%', margin: '40px auto', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0 }}>Edit Responses for {editingResponses.name}</h3>
                        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                            You can update your answers for <strong>{editingResponses.event?.name}</strong> until the registration deadline.
                        </p>

                        <form onSubmit={handleUpdateResponses}>
                            {editingResponses.event?.customForm && editingResponses.event.customForm.length > 0 && (
                                <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                                    <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Registration Form</h4>
                                    {editingResponses.event.customForm.map((field, i) => (
                                        <div key={i} style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '14px' }}>
                                                {field.label}
                                                {field.required && <span style={{ color: '#d9534f' }}> *</span>}
                                            </label>

                                            {field.fieldType === 'text' && (
                                                <input type="text"
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                            )}

                                            {field.fieldType === 'textarea' && (
                                                <textarea
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '80px' }} />
                                            )}

                                            {field.fieldType === 'dropdown' && (
                                                <select
                                                    required={field.required}
                                                    value={formResponses[field.label] || ''}
                                                    onChange={e => setFormResponses({ ...formResponses, [field.label]: e.target.value })}
                                                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                                    <option value="">Select...</option>
                                                    {(field.options || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {field.fieldType === 'checkbox' && (
                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                                    {(field.options || []).map(opt => (
                                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                                            <input type="checkbox"
                                                                checked={(formResponses[field.label] || []).includes(opt)}
                                                                onChange={e => {
                                                                    const curr = formResponses[field.label] || [];
                                                                    setFormResponses({
                                                                        ...formResponses,
                                                                        [field.label]: e.target.checked
                                                                            ? [...curr, opt]
                                                                            : curr.filter(v => v !== opt)
                                                                    });
                                                                }} />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {field.fieldType === 'file' && (
                                                <div>
                                                    {formResponses[field.label] ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e8f5e9', padding: '8px', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
                                                            <button type="button" onClick={() => openFile(formResponses[field.label])} style={{ background: 'none', border: 'none', color: '#2e7d32', fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                                                                View Uploaded File
                                                            </button>
                                                            <button type="button" onClick={() => {
                                                                const newResponses = { ...formResponses };
                                                                delete newResponses[field.label];
                                                                setFormResponses(newResponses);
                                                            }}
                                                                style={{ padding: '2px 8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <input type="file"
                                                                required={field.required}
                                                                disabled={uploadingFields[field.label] || isSubmitting}
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;

                                                                    setUploadingFields(prev => ({ ...prev, [field.label]: true }));
                                                                    try {
                                                                        const base64 = await toBase64(file);
                                                                        const token = localStorage.getItem('token');
                                                                        const uploadRes = await api.post('/upload', {
                                                                            filename: file.name,
                                                                            data: base64,
                                                                            mimetype: file.type
                                                                        }, {
                                                                            headers: {
                                                                                'Authorization': token ? `Bearer ${token}` : ''
                                                                            }
                                                                        });
                                                                        setFormResponses(prev => ({ ...prev, [field.label]: uploadRes.data }));
                                                                    } catch (err) {
                                                                        showAlert('Failed to upload file');
                                                                        e.target.value = null;
                                                                    } finally {
                                                                        setUploadingFields(prev => ({ ...prev, [field.label]: false }));
                                                                    }
                                                                }}
                                                                style={{ padding: '6px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }} />
                                                            {uploadingFields[field.label] && <small style={{ color: '#eb9b34', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>Uploading to Cloudinary...</small>}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => { setEditingResponses(null); setFormResponses({}); }} disabled={isSubmitting}
                                    style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting || Object.values(uploadingFields).some(v => v)}
                                    style={{ padding: '8px 16px', background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
