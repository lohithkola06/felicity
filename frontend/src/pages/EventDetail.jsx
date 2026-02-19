import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FeedbackForm from '../components/FeedbackForm';

/**
 * EventDetail Page
 * 
 * This component handles the display of a single event's full details.
 * It manages two main types of interactions:
 * 1. Normal Events: Users (Participants) can register or join a waitlist.
 * 2. Merchandise Events: Users can browse items and purchase them (with stock checks).
 */
export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // State for the event data fetched from the API
    const [event, setEvent] = useState(null);
    const [myStatus, setMyStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Feedback state for user actions (Success/Error messages)
    const [statusMessage, setStatusMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For Merchandise events: Track quantity selected for each item
    // Format: { [itemId]: number }
    const [purchaseQuantities, setPurchaseQuantities] = useState({});

    // Fetch event details on component mount
    useEffect(() => {
        loadEventDetails();
        if (user) loadMyStatus();
    }, [id, navigate, user]);

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
            // If the event doesn't exist, redirect back to the list
            navigate('/events');
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * Handles registration for standard events.
     */
    async function handleRegister() {
        if (!confirm('Are you sure you want to register for this event?')) return;

        setIsSubmitting(true);
        setStatusMessage(null); // Clear previous messages

        try {
            await api.post(`/events/${id}/register`);
            setStatusMessage({ type: 'success', text: 'You have been successfully registered! Check your dashboard for the ticket.' });
            loadEventDetails(); // Refresh to update spot counts
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed. Please try again.' });
        }
        setIsSubmitting(false);
    }

    /**
     * Handles purchasing a specific merchandise item.
     * @param {Object} item - The merchandise item object
     */
    async function handlePurchase(item) {
        const qty = purchaseQuantities[item._id] || 1;
        const totalCost = item.price * qty;

        if (!confirm(`Confirm purchase of ${qty} x ${item.name} for Rs. ${totalCost}?`)) return;

        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            await api.post(`/events/${id}/purchase`, {
                itemName: item.name,
                size: item.size,
                color: item.color,
                variant: item.variant,
                quantity: qty
            });
            setStatusMessage({ type: 'success', text: `Great choice! purchased ${qty} x ${item.name}.` });
            loadEventDetails(); // Refresh to update stock levels
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Could not complete purchase.' });
        }
        setIsSubmitting(false);
    }

    /**
     * Handles joining the waitlist when an event is full.
     */
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

    if (isLoading) return <div style={{ padding: '20px' }}>Loading event details...</div>;
    if (!event) return <div style={{ padding: '20px' }}>Event not found.</div>;

    const isFull = event.registrationLimit > 0 && event.registrationCount >= event.registrationLimit;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px', fontFamily: "'Inter', sans-serif" }}>

            {/* Back Link */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/events')}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    &larr; Back to Events
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '40px', alignItems: 'start' }}>

                {/* Left Column: Content */}
                <div>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{
                                background: event.type === 'hackathon' ? '#e3f2fd' : event.type === 'merchandise' ? '#fff3e0' : '#f3f4f6',
                                color: event.type === 'hackathon' ? '#1976d2' : event.type === 'merchandise' ? '#f57c00' : '#4b5563',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {event.type}
                            </span>
                        </div>

                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1a1a1a', marginBottom: '20px', lineHeight: '1.2' }}>{event.name}</h1>

                        <div style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#444', marginBottom: '40px', whiteSpace: 'pre-wrap' }}>
                            {event.description}
                        </div>

                        {/* Merchandise Table */}
                        {event.type === 'merchandise' && user?.role === 'participant' && (
                            <div style={{ marginTop: '40px' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', borderBottom: '2px solid #f0f0f0', paddingBottom: '10px' }}>Shop Items</h3>

                                {event.items && event.items.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '20px' }}>
                                        {event.items.map((item, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid #eee', borderRadius: '12px', background: '#fafafa' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{item.name}</div>
                                                    <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                                        {item.variant && <span style={{ marginRight: '10px' }}>Style: {item.variant}</span>}
                                                        {(item.size || item.color) && <span>{item.size} {item.color ? `• ${item.color}` : ''}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '1.2rem', color: '#1a1a1a' }}>Rs. {item.price}</div>

                                                    {item.stock > 0 ? (
                                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={Math.min(item.stock, event.purchaseLimitPerUser || 10)}
                                                                value={purchaseQuantities[item._id] || 1}
                                                                onChange={e => setPurchaseQuantities({ ...purchaseQuantities, [item._id]: parseInt(e.target.value) })}
                                                                style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                                                            />
                                                            <button
                                                                onClick={() => handlePurchase(item)}
                                                                disabled={isSubmitting}
                                                                style={{ padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                                                            >
                                                                Add to Cart
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ display: 'inline-block', marginTop: '5px', padding: '4px 10px', background: '#ffeeee', color: '#d32f2f', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>Out of Stock</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#666', fontStyle: 'italic' }}>No items available at the moment.</p>
                                )}
                            </div>
                        )}

                        {/* Feedback Section */}
                        {myStatus?.attended && (
                            <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #eee' }}>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Your Feedback</h3>
                                <FeedbackForm eventId={event._id} />
                            </div>
                        )}

                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div>
                    {/* Status Messages */}
                    {statusMessage && (
                        <div style={{
                            padding: '16px', marginBottom: '20px',
                            background: statusMessage.type === 'success' ? '#e8f5e9' : '#ffebee',
                            color: statusMessage.type === 'success' ? '#2e7d32' : '#c62828',
                            border: '1px solid', borderColor: statusMessage.type === 'success' ? '#c8e6c9' : '#ffcdd2',
                            borderRadius: '12px', fontSize: '14px', lineHeight: '1.5'
                        }}>
                            {statusMessage.text}
                        </div>
                    )}

                    <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', fontWeight: '600', marginBottom: '8px' }}>Date & Time</div>
                            <div style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>
                                {new Date(event.startDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </div>
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                                {new Date(event.startDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', fontWeight: '600', marginBottom: '8px' }}>Location</div>
                            <div style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>{event.venue || 'To Be Announced'}</div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', fontWeight: '600', marginBottom: '8px' }}>Organizer</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', background: '#eee', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🏢</div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>{event.organizer?.organizerName || 'Unknown'}</div>
                                    <a href={`mailto:${event.organizer?.contactEmail}`} style={{ fontSize: '12px', color: '#007bff', textDecoration: 'none' }}>Contact</a>
                                </div>
                            </div>
                        </div>

                        {event.type === 'normal' && (
                            <div style={{ paddingTop: '20px', borderTop: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <span style={{ fontSize: '14px', color: '#666' }}>Price</span>
                                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                                        {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                                    </span>
                                </div>

                                {user ? (
                                    user.role === 'participant' ? (
                                        isFull ? (
                                            <>
                                                <button
                                                    onClick={handleJoinWaitlist}
                                                    disabled={isSubmitting}
                                                    style={{ width: '100%', padding: '14px', background: '#fff', border: '2px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
                                                >
                                                    Join Waitlist
                                                </button>
                                                <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: '#d32f2f' }}>Event is currently full</div>
                                            </>
                                        ) : myStatus?.registered ? (
                                            <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '14px', borderRadius: '8px', textAlign: 'center', fontWeight: '600' }}>
                                                ✅ You are Registered
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleRegister}
                                                disabled={isSubmitting}
                                                style={{ width: '100%', padding: '14px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.1s' }}
                                            >
                                                Register Now
                                            </button>
                                        )
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '10px', background: '#f5f5f5', borderRadius: '8px', color: '#666', fontSize: '13px' }}>Organizer View</div>
                                    )
                                ) : (
                                    <button
                                        onClick={() => navigate('/login', { state: { from: `/events/${id}` } })}
                                        style={{ width: '100%', padding: '14px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Login to Register
                                    </button>
                                )}

                                <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
                                    {event.registrationLimit > 0 ? `${event.registrationLimit - event.registrationCount} spots remaining` : 'Unlimited spots'}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
                            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', fontWeight: '600', marginBottom: '8px' }}>Refund Policy</div>
                            <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4', margin: 0 }}>
                                {event.registrationFee > 0
                                    ? "Full refunds available up to 24 hours before event start. Contact organizer for cancellations."
                                    : "This is a free event. If you can't make it, please cancel your registration to free up a spot."}
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
