import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FeedbackForm from '../components/FeedbackForm';

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [event, setEvent] = useState(null);
    const [myStatus, setMyStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [purchaseQuantities, setPurchaseQuantities] = useState({});
    const [formResponses, setFormResponses] = useState({});
    const [uploadingFields, setUploadingFields] = useState({});
    const [showTeamForm, setShowTeamForm] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [teamEmails, setTeamEmails] = useState('');
    const [teamSize, setTeamSize] = useState(4);
    const [confirmConfig, setConfirmConfig] = useState(null);

    useEffect(() => {
        loadEventDetails();
        if (user) loadMyStatus();
    }, [id, user]);

    async function loadMyStatus() {
        try {
            const res = await api.get(`/events/${id}/my-status`);
            setMyStatus(res.data);
        } catch (err) {
            console.error('Failed to load status', err);
        }
    }

    async function loadEventDetails() {
        try {
            const response = await api.get(`/events/${id}`);
            setEvent(response.data);
        } catch (err) {
            console.error("Failed to load event", err);
            navigate('/events');
        } finally {
            setIsLoading(false);
        }
    }

    function promptRegister() {
        if (event.customForm && event.customForm.length > 0) {
            for (const field of event.customForm) {
                if (!field.required) continue;
                const val = formResponses[field.label];
                if (field.fieldType === 'checkbox') {
                    if (!val || !Array.isArray(val) || val.length === 0) {
                        setStatusMessage({ type: 'error', text: `Please complete the required field: "${field.label}"` });
                        return;
                    }
                } else {
                    if (!val || (typeof val === 'string' && !val.trim())) {
                        setStatusMessage({ type: 'error', text: `Please complete the required field: "${field.label}"` });
                        return;
                    }
                }
            }
        }
        setConfirmConfig({ action: 'register', message: 'Are you sure you want to register for this event?', payload: null });
    }

    async function executeRegister() {
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.post(`/events/${id}/register`, { formResponses });
            setStatusMessage({ type: 'success', text: 'You have been successfully registered! A ticket has been sent to your email and is available in your Dashboard.' });
            loadEventDetails();
            loadMyStatus();
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed. Please try again.' });
        }
        setIsSubmitting(false);
    }

    function promptPurchase(item) {
        const qty = purchaseQuantities[item._id] || 1;
        const totalCost = item.price * qty;
        setConfirmConfig({ action: 'purchase', message: `Confirm purchase of ${qty} x ${item.name} for Rs. ${totalCost}?`, payload: { item, qty } });
    }

    async function executePurchase(item, qty) {
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.post(`/events/${id}/purchase`, {
                itemName: item.name, size: item.size, color: item.color, variant: item.variant, quantity: qty
            });
            setStatusMessage({ type: 'success', text: `Purchased ${qty} x ${item.name}! Ticket & QR code sent to your email.` });
            loadEventDetails();
            loadMyStatus();
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Could not complete purchase.' });
        }
        setIsSubmitting(false);
    }

    async function handleJoinWaitlist() {
        setIsSubmitting(true);
        try {
            await api.post(`/events/${id}/waitlist`);
            setStatusMessage({ type: 'success', text: 'You are on the waitlist! We will email you if a spot opens up.' });
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Could not join waitlist.' });
        }
        setIsSubmitting(false);
    }

    async function handleCreateTeam(e) {
        e.preventDefault();

        // 1. Validate custom form fields
        for (const field of event.customForm || []) {
            if (field.required && !formResponses[field.label]) {
                if (field.fieldType === 'checkbox' && formResponses[field.label]?.length === 0) continue; // Allow empty checkboxes unless handled differently, though handled by HTML required mostly. Here we check explicitly for "file" which is often bypassed by basic HTML if not careful.
                if (field.fieldType === 'file' && !formResponses[field.label]) {
                    return alert(`Please upload the required file for: ${field.label}`);
                }
                if (!formResponses[field.label] && formResponses[field.label] !== false) {
                    return alert(`Please fill in the required field: ${field.label}`);
                }
            }
        }

        // 2. Validate Team Emails count
        if (!teamName.trim()) return alert('Team name required');

        const memberEmails = teamEmails.split(',').map(e => e.trim()).filter(Boolean);
        const expectedInvites = teamSize - 1;

        if (memberEmails.length !== expectedInvites) {
            return alert(`For a team size of ${teamSize}, you must invite exactly ${expectedInvites} members. You have provided ${memberEmails.length} emails.`);
        }

        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            await api.post(`/teams/${id}/create`, {
                name: teamName.trim(),
                memberEmails,
                maxSize: teamSize,
                formResponses,
            });
            setStatusMessage({ type: 'success', text: 'Team created! Invites sent to members. Go to My Teams to manage.' });
            setShowTeamForm(false);
            setTeamName('');
            setTeamEmails('');
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create team.' });
        }
        setIsSubmitting(false);
    }

    if (isLoading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading event details...</div>;
    if (!event) return <div style={{ padding: '20px', textAlign: 'center' }}>Event not found.</div>;

    const isFull = event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit;
    const deadlinePassed = event.registrationDeadline && new Date() > new Date(event.registrationDeadline);
    const isRegistrationOpen = (event.status === 'published' || event.status === 'ongoing') && !deadlinePassed;
    const alreadyRegistered = myStatus?.registered;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <Link to="/events" style={{ color: '#337ab7', textDecoration: 'none', fontSize: '14px' }}>← Back to Events</Link>

            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '24px', marginTop: '10px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                    <h1 style={{ margin: 0 }}>{event.name}</h1>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                            background: event.type === 'merchandise' ? '#fce4ec' : '#e3f2fd',
                            color: event.type === 'merchandise' ? '#c62828' : '#1565c0',
                            textTransform: 'capitalize',
                        }}>
                            {event.type === 'merchandise' ? 'Merchandise' : 'Standard Event'}
                        </span>
                        <span style={{
                            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                            background: event.status === 'published' ? '#e8f5e9' : event.status === 'ongoing' ? '#e3f2fd' : '#f5f5f5',
                            color: event.status === 'published' ? '#2e7d32' : event.status === 'ongoing' ? '#1565c0' : '#666',
                            textTransform: 'uppercase',
                        }}>
                            {event.status}
                        </span>
                    </div>
                </div>

                {/* Organizer */}
                {event.organizer && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                        Organized by <strong>{event.organizer.organizerName || 'Unknown'}</strong>
                        {event.organizer.category && <span> ({event.organizer.category})</span>}
                    </div>
                )}

                {/* Description */}
                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '20px', lineHeight: '1.6' }}>{event.description}</p>

                {/* Event Details Grid */}
                <div style={{ background: '#f9f9f9', padding: '20px', border: '1px solid #eee', borderRadius: '4px', marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Event Details</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Starts</strong>
                            {event.startDate ? new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}
                        </div>
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Ends</strong>
                            {event.endDate ? new Date(event.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBD'}
                        </div>
                        {event.venue && (
                            <div>
                                <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Venue</strong>
                                {event.venue}
                            </div>
                        )}
                        <div>
                            <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Eligibility</strong>
                            {event.eligibility === 'iiit-only' ? 'IIIT Students Only' : 'Open to Everyone'}
                        </div>
                        {event.type === 'normal' && (
                            <>
                                <div>
                                    <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Fee</strong>
                                    {event.registrationFee > 0 ? `Rs. ${event.registrationFee}` : 'Free'}
                                </div>
                                <div>
                                    <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Availability</strong>
                                    {event.registrationLimit > 0
                                        ? `${event.registrationCount} / ${event.registrationLimit} spots taken`
                                        : `${event.registrationCount} registered`}
                                </div>
                            </>
                        )}
                        {event.registrationDeadline && (
                            <div>
                                <strong style={{ fontSize: '12px', color: '#888', display: 'block' }}>Registration Deadline</strong>
                                <span style={{ color: deadlinePassed ? '#d9534f' : 'inherit' }}>
                                    {new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                    {deadlinePassed && ' (PASSED)'}
                                </span>
                            </div>
                        )}
                        {event.tags && event.tags.length > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <strong style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Tags</strong>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {event.tags.map(tag => (
                                        <span key={tag} style={{ padding: '2px 8px', background: '#e0e0e0', borderRadius: '12px', fontSize: '11px' }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Messages */}
                {statusMessage && (
                    <div style={{
                        padding: '12px', marginBottom: '15px',
                        background: statusMessage.type === 'success' ? '#dff0d8' : '#f2dede',
                        color: statusMessage.type === 'success' ? '#3c763d' : '#a94442',
                        border: '1px solid', borderColor: statusMessage.type === 'success' ? '#d6e9c6' : '#ebccd1',
                        borderRadius: '4px'
                    }}>
                        {statusMessage.text}
                    </div>
                )}

                {/* Already registered banner */}
                {alreadyRegistered && (
                    <div style={{ padding: '12px', marginBottom: '15px', background: '#d9edf7', border: '1px solid #bce8f1', borderRadius: '4px', color: '#31708f' }}>
                        You are registered for this event.
                        {myStatus.ticketId && <span> Ticket: <strong>{myStatus.ticketId}</strong></span>}
                    </div>
                )}

                {/* Blocking Messages */}
                {deadlinePassed && !alreadyRegistered && (
                    <div style={{ padding: '12px', marginBottom: '15px', background: '#f2dede', border: '1px solid #ebccd1', borderRadius: '4px', color: '#a94442' }}>
                        Registration deadline has passed. Registration is no longer available.
                    </div>
                )}

                {isFull && !deadlinePassed && !alreadyRegistered && event.type === 'normal' && (
                    <div style={{ padding: '12px', marginBottom: '15px', background: '#fcf8e3', border: '1px solid #faebcc', borderRadius: '4px', color: '#8a6d3b' }}>
                        This event has reached its registration limit ({event.registrationLimit} spots). You may join the waitlist.
                    </div>
                )}

                {/* Call to Action */}
                {user ? (
                    user.role === 'participant' ? (
                        <div style={{ marginTop: '20px' }}>
                            {event.type === 'merchandise' ? (
                                <div>
                                    <h3>Available Merchandise</h3>
                                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                                        Select items to purchase. Stock is limited! A ticket with QR code will be generated upon purchase.
                                    </p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Item</th>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Style</th>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Size / Color</th>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Price</th>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Stock</th>
                                                <th style={{ padding: '10px', border: '1px solid #ddd' }}>Buy</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {event.items && event.items.length > 0 ? event.items.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>{item.name}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.variant || '-'}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                        {item.size || '-'} {item.size && item.color ? '/' : ''} {item.color || ''}
                                                    </td>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>Rs. {item.price}</td>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold', color: item.stock > 0 ? '#4caf50' : '#d9534f' }}>
                                                        {item.stock > 0 ? `${item.stock} left` : 'Sold Out'}
                                                    </td>
                                                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                                                        {item.stock > 0 ? (
                                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                                <input type="number" min="1"
                                                                    max={Math.min(item.stock, event.purchaseLimitPerUser || 10)}
                                                                    value={purchaseQuantities[item._id] || 1}
                                                                    onChange={e => setPurchaseQuantities({ ...purchaseQuantities, [item._id]: parseInt(e.target.value) })}
                                                                    style={{ width: '50px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }} />
                                                                <button onClick={() => promptPurchase(item)} disabled={isSubmitting}
                                                                    style={{ padding: '5px 12px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                                                    Buy
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#999', fontSize: '12px' }}>Out of Stock</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="6" style={{ padding: '15px', textAlign: 'center', color: '#777' }}>No merchandise items listed yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* Normal Event Registration */
                                !alreadyRegistered && isRegistrationOpen && (
                                    isFull ? (
                                        <div style={{ textAlign: 'center', background: '#f8f8f8', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                            <h3 style={{ color: '#d9534f' }}>This event is currently full.</h3>
                                            <p>You can join the waitlist and we'll notify you if a spot frees up.</p>
                                            <button onClick={handleJoinWaitlist} disabled={isSubmitting}
                                                style={{ marginTop: '10px', padding: '10px 20px', background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                                Join Waitlist
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Custom Registration Form */}
                                            {event.customForm && event.customForm.length > 0 && (
                                                <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #eee', borderRadius: '4px', background: '#fafafa' }}>
                                                    <h3 style={{ marginTop: 0 }}>Registration Form</h3>
                                                    {event.customForm.map((field, i) => (
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
                                                                    <input type="file"
                                                                        required={field.required && !formResponses[field.label]}
                                                                        disabled={uploadingFields[field.label] || isSubmitting}
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files[0];
                                                                            if (!file) {
                                                                                const newResponses = { ...formResponses };
                                                                                delete newResponses[field.label];
                                                                                setFormResponses(newResponses);
                                                                                return;
                                                                            }

                                                                            setUploadingFields(prev => ({ ...prev, [field.label]: true }));
                                                                            try {
                                                                                const formData = new FormData();
                                                                                formData.append('file', file);
                                                                                const token = localStorage.getItem('token');
                                                                                const uploadRes = await api.post('/upload', formData, {
                                                                                    headers: {
                                                                                        'Content-Type': 'multipart/form-data',
                                                                                        'Authorization': token ? `Bearer ${token}` : ''
                                                                                    }
                                                                                });
                                                                                setFormResponses(prev => ({ ...prev, [field.label]: uploadRes.data.url }));
                                                                            } catch (err) {
                                                                                setStatusMessage({ type: 'error', text: 'Failed to upload your file. Please check your connection and try again.' });
                                                                                e.target.value = null; // Clear input
                                                                            } finally {
                                                                                setUploadingFields(prev => ({ ...prev, [field.label]: false }));
                                                                            }
                                                                        }}
                                                                        style={{ padding: '6px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }} />

                                                                    {uploadingFields[field.label] && <small style={{ color: '#eb9b34', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>Uploading to Cloudinary...</small>}
                                                                    {formResponses[field.label] && !uploadingFields[field.label] && (
                                                                        <small style={{ color: '#5cb85c', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ File uploaded successfully</small>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Standard Registration (hidden for Team Events) */}
                                            {!event.isTeamEvent && (
                                                <button onClick={promptRegister} disabled={isSubmitting || Object.values(uploadingFields).some(v => v)}
                                                    style={{
                                                        fontSize: '16px', padding: '12px 24px',
                                                        background: (isSubmitting || Object.values(uploadingFields).some(v => v)) ? '#999' : '#337ab7', color: 'white', border: 'none',
                                                        borderRadius: '4px', cursor: (isSubmitting || Object.values(uploadingFields).some(v => v)) ? 'not-allowed' : 'pointer', width: '100%',
                                                    }}>
                                                    {isSubmitting ? 'Registering...' : Object.values(uploadingFields).some(v => v) ? 'Waiting for uploads...' : event.registrationFee > 0 ? 'Register & Pay Fee' : 'Register Now'}
                                                </button>
                                            )}

                                            {/* Team Registration Option */}
                                            <div style={{ marginTop: event.isTeamEvent ? '0' : '15px', textAlign: event.isTeamEvent ? 'left' : 'center' }}>
                                                {event.isTeamEvent ? (
                                                    <h3 style={{ marginTop: '0', marginBottom: '10px' }}>Register as a Team</h3>
                                                ) : (
                                                    <button onClick={() => setShowTeamForm(!showTeamForm)}
                                                        style={{ background: 'none', border: 'none', color: '#337ab7', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>
                                                        {showTeamForm ? 'Cancel team registration' : 'Or register as a team'}
                                                    </button>
                                                )}
                                            </div>

                                            {(showTeamForm || event.isTeamEvent) && (
                                                <form onSubmit={handleCreateTeam} style={{ marginTop: '15px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
                                                    <h4 style={{ marginTop: 0 }}>Create a Team</h4>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>Team Name *</label>
                                                        <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
                                                    </div>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>Team Size</label>
                                                        <select value={teamSize} onChange={e => setTeamSize(parseInt(e.target.value))} style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
                                                            {Array.from({ length: (event.maxTeamSize || 10) - (event.minTeamSize || 2) + 1 }, (_, i) => i + (event.minTeamSize || 2)).map(size => (
                                                                <option key={size} value={size}>{size} members</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', fontSize: '13px' }}>Invite Members (comma-separated emails)</label>
                                                        <textarea value={teamEmails} onChange={e => setTeamEmails(e.target.value)}
                                                            placeholder="member1@iiit.ac.in, member2@iiit.ac.in"
                                                            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '60px' }} />
                                                    </div>
                                                    <button type="submit" disabled={isSubmitting}
                                                        style={{ padding: '10px 20px', background: '#5cb85c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
                                                        {isSubmitting ? 'Creating...' : 'Create Team & Send Invites'}
                                                    </button>
                                                    <p style={{ fontSize: '11px', color: '#888', marginTop: '8px', marginBottom: 0 }}>
                                                        Team members will receive invites. Registration completes when all accept and you register the team from My Teams.
                                                    </p>
                                                </form>
                                            )}
                                        </div>
                                    )
                                )
                            )}
                        </div>
                    ) : (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#fcf8e3', border: '1px solid #faebcc', color: '#8a6d3b', borderRadius: '4px' }}>
                            <p><strong>Organizer View:</strong> This is how participants see your event page.</p>
                        </div>
                    )
                ) : (
                    <div style={{ marginTop: '20px', textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
                        <p>Please <a href="/login" style={{ textDecoration: 'underline', color: '#337ab7' }}>login</a> to register for this event.</p>
                    </div>
                )}

                {/* Refund policy removed */}

                {/* Feedback Section */}
                {myStatus?.attended && (
                    <FeedbackForm eventId={event._id} />
                )}
            </div>

            {/* Custom Modal for Confirmations */}
            {confirmConfig && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '450px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>Confirm Action</h3>
                        <p style={{ margin: 0, color: '#555', fontSize: '16px', lineHeight: '1.5' }}>{confirmConfig.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => setConfirmConfig(null)} disabled={isSubmitting}
                                style={{ padding: '10px 20px', background: 'transparent', color: '#666', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Cancel
                            </button>
                            <button onClick={() => {
                                if (confirmConfig.action === 'register') executeRegister();
                                else if (confirmConfig.action === 'purchase') executePurchase(confirmConfig.payload.item, confirmConfig.payload.qty);
                                setConfirmConfig(null);
                            }} disabled={isSubmitting}
                                style={{ padding: '10px 20px', background: '#337ab7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                {isSubmitting ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
