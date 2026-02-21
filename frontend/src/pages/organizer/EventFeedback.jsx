import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

export default function EventFeedback() {
    const { id } = useParams();
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('');

    useEffect(() => {
        loadFeedback();
    }, [id, filterRating]);

    async function loadFeedback() {
        try {
            setLoading(true);
            let url = `/feedback/event/${id}`;
            if (filterRating) url += `?rating=${filterRating}`;
            const res = await api.get(url);
            setFeedbacks(res.data.feedbacks);
            setStats(res.data.stats);
        } catch (err) {
            console.error('Failed to load feedback', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div style={{ padding: '20px' }}>Loading feedback...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <Link to="/organizer/dashboard" style={{ color: '#007bff', textDecoration: 'none' }}>&larr; Back to Dashboard</Link>
            </div>

            <h1 style={{ marginBottom: '20px' }}>Event Feedback</h1>

            {stats && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#333' }}>{stats.average}</div>
                        <div style={{ color: '#666' }}>Average Rating</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>Base on {stats.total} reviews</div>
                    </div>
                    <div style={{ flex: 2, padding: '20px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h4 style={{ marginTop: 0 }}>Rating Distribution</h4>
                        {[5, 4, 3, 2, 1].map(r => {
                            const count = stats.distribution[r] || 0;
                            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            return (
                                <div key={r} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                    <span style={{ width: '20px', fontWeight: 'bold' }}>{r} *</span>
                                    <div style={{ flex: 1, height: '10px', background: '#eee', margin: '0 10px', borderRadius: '5px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, background: '#ffc107', height: '100%' }}></div>
                                    </div>
                                    <span style={{ width: '30px', textAlign: 'right', fontSize: '12px' }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <select
                    value={filterRating}
                    onChange={e => setFilterRating(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {feedbacks.length > 0 ? (
                    feedbacks.map(f => (
                        <div key={f._id} style={{ padding: '15px', background: '#fff', border: '1px solid #eee', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <div style={{ color: '#ffc107', fontWeight: 'bold' }}>{'*'.repeat(f.rating)}<span style={{ color: '#ddd' }}>{'*'.repeat(5 - f.rating)}</span></div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{new Date(f.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                            </div>
                            <p style={{ margin: 0, color: '#333' }}>{f.comment || <span style={{ color: '#ccc', fontStyle: 'italic' }}>No comment provided</span>}</p>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#777', background: '#f9f9f9' }}>No feedback found for this filter.</div>
                )}
            </div>
        </div>
    );
}
