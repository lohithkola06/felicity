import { useState } from 'react';
import api from '../api/axios';

export default function FeedbackForm({ eventId, onFeedbackSubmitted }) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setMessage({ type: 'error', text: 'Please select a star rating.' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            await api.post('/feedback', { eventId, rating, comment });
            setMessage({ type: 'success', text: 'Thank you for your feedback!' });
            setRating(0);
            setComment('');
            if (onFeedbackSubmitted) onFeedbackSubmitted();
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit feedback.' });
        }
        setIsSubmitting(false);
    };

    return (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9' }}>
            <h4>Rate this Event</h4>
            {message && (
                <div style={{
                    padding: '8px', marginBottom: '10px', borderRadius: '4px',
                    backgroundColor: message.type === 'success' ? '#dff0d8' : '#f2dede',
                    color: message.type === 'success' ? '#3c763d' : '#a94442'
                }}>
                    {message.text}
                </div>
            )}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Rating:</label>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <span
                            key={star}
                            onClick={() => setRating(star)}
                            style={{
                                cursor: 'pointer',
                                fontSize: '24px',
                                color: star <= rating ? '#ffc107' : '#e4e5e9',
                                marginRight: '5px'
                            }}
                        >
                            *
                        </span>
                    ))}
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your thoughts (optional)..."
                        rows="3"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </form>
        </div>
    );
}
