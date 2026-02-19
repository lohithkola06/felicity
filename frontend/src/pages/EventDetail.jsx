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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ background: '#fff', border: '1px solid #ccc', padding: '20px', borderRadius: '4px' }}>
                <h1 style={{ marginBottom: '10px' }}>{event.name}</h1>

                <div style={{ marginBottom: '15px', fontSize: '14px', color: '#555' }}>
                    <span style={{ background: '#eee', padding: '4px 8px', marginRight: '10px', borderRadius: '4px', textTransform: 'capitalize' }}>
                        {event.type}
                    </span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: event.status === 'published' ? 'green' : '#666' }}>
                        {event.status}
                    </span>
                </div>

                <p style={{ whiteSpace: 'pre-wrap', marginBottom: '20px', lineHeight: '1.5' }}>{event.description}</p>

                {/* Event Metadata Box */}
                <div style={{ background: '#f9f9f9', padding: '15px', border: '1px solid #eee', marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0 }}>Event Details</h3>
                    <p><strong>Starts:</strong> {new Date(event.startDate).toLocaleString()}</p>
                    <p><strong>Ends:</strong> {new Date(event.endDate).toLocaleString()}</p>
                    <p><strong>Venue:</strong> {event.venue || 'To Be Announced'}</p>

                    {event.type === 'normal' && (
                        <>
                            <p><strong>Registration Fee:</strong> {event.registrationFee > 0 ? `Rs. ${event.registrationFee}` : 'Free'}</p>
                            <p><strong>Availability:</strong> {event.registrationLimit > 0 ? `${event.registrationCount} / ${event.registrationLimit} spots taken` : `${event.registrationCount} registered so far`}</p>
                        </>
                    )}
                </div>

                {/* Status Messages (Success/Error) */}
                {statusMessage && (
                    <div style={{
                        padding: '10px', marginBottom: '15px',
                        background: statusMessage.type === 'success' ? '#dff0d8' : '#f2dede',
                        color: statusMessage.type === 'success' ? '#3c763d' : '#a94442',
                        border: '1px solid', borderColor: statusMessage.type === 'success' ? '#d6e9c6' : '#ebccd1',
                        borderRadius: '4px'
                    }}>
                        {statusMessage.text}
                    </div>
                )}

                {/* Call to Action Section */}
                {user ? (
                    user.role === 'participant' ? (
                        <div style={{ marginTop: '20px' }}>
                            {event.type === 'merchandise' ? (
                                <div>
                                    <h3>Available Merchandise</h3>
                                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                                        Select existing items to purchase. Stock is limited!
                                    </p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                                        <thead>
                                            <tr style={{ background: '#eee', textAlign: 'left' }}>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Item Name</th>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Style</th>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Details (Size | Color)</th>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Price</th>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
                                                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Buy</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {event.items && event.items.length > 0 ? event.items.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.name}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.variant || '-'}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        {item.size || '-'} {item.size && item.color ? '|' : ''} {item.color || '-'}
                                                    </td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>Rs. {item.price}</td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold', color: item.stock > 0 ? 'green' : 'red' }}>
                                                        {item.stock > 0 ? `${item.stock} left` : 'Sold Out'}
                                                    </td>
                                                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                                                        {item.stock > 0 ? (
                                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={Math.min(item.stock, event.purchaseLimitPerUser || 10)}
                                                                    value={purchaseQuantities[item._id] || 1}
                                                                    onChange={e => setPurchaseQuantities({ ...purchaseQuantities, [item._id]: parseInt(e.target.value) })}
                                                                    style={{ width: '50px', padding: '4px' }}
                                                                />
                                                                <button
                                                                    onClick={() => handlePurchase(item)}
                                                                    disabled={isSubmitting}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    Buy
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#999', fontSize: '13px' }}>Unavailable</span>
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
                                // Logic for Normal Events (Register / Waitlist)
                                isFull ? (
                                    <div style={{ textAlign: 'center', background: '#f8f8f8', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                        <h3 style={{ color: '#d9534f' }}>This event is currently full.</h3>
                                        <p>But don't worry! You can join the waitlist and we'll notify you if a spot frees up.</p>
                                        <button onClick={handleJoinWaitlist} disabled={isSubmitting} style={{ marginTop: '10px', padding: '8px 16px', cursor: 'pointer' }}>
                                            Join Waitlist
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={isSubmitting}
                                        style={{ fontSize: '18px', padding: '12px 24px', background: '#337ab7', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        {event.registrationFee > 0 ? 'Register & Pay Fee' : 'Register Now'}
                                    </button>
                                )
                            )}
                        </div>
                    ) : (
                        <div style={{ marginTop: '20px', padding: '15px', background: '#fcf8e3', border: '1px solid #faebcc', color: '#8a6d3b' }}>
                            <p><strong>Organizer View:</strong> This is how participants see your event page.</p>
                        </div>
                    )
                ) : (
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <p>Please <a href="/login" style={{ textDecoration: 'underline', color: 'blue' }}>login</a> to register for this event.</p>
                    </div>
                )}

                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h3>Refund Policy</h3>
                    <p style={{ fontSize: '13px', color: '#666' }}>
                        Basic Policy: Full refunds are available if you cancel at least 24 hours before the event starts.
                        For specific questions, please contact the organizer at <strong>{event.organizer?.contactEmail || 'contact@example.com'}</strong>.
                    </p>
                </div>

                {/* Feedback Section */}
                {myStatus?.attended && (
                    <FeedbackForm eventId={event._id} />
                )}
            </div>
        </div>
    );
}
