import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function PasswordReset() {
    const [reason, setReason] = useState('');
    const [requests, setRequests] = useState([]);
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        try {
            const res = await api.get('/password-reset/my-requests');
            setRequests(res.data);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    }

    async function submitRequest(e) {
        e.preventDefault();
        setMsg('');
        try {
            await api.post('/password-reset/request', { reason });
            setMsg('Request submitted. The admin will review it shortly.');
            setReason('');
            fetchRequests();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Could not submit request');
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
            <h1>Password Reset</h1>
            <p>Password resets for organizer accounts are handled by the system admin. Submit a request below and the admin will generate new credentials for you.</p>

            {msg && <div style={{ padding: '10px', marginBottom: '15px', background: msg.includes('submitted') ? '#dff0d8' : '#f2dede', borderRadius: '4px' }}>{msg}</div>}

            <form onSubmit={submitRequest} style={{ marginBottom: '30px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Reason for Reset</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="Briefly explain why you need a password reset..."
                        style={{ width: '100%', padding: '8px', height: '80px' }} required />
                </div>
                <button type="submit">Submit Reset Request</button>
            </form>

            <h3>My Requests</h3>
            {loading ? <p>Loading...</p> : requests.length === 0 ? (
                <p style={{ color: '#888' }}>No password reset requests yet.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Date</th>
                            <th style={{ padding: '8px' }}>Status</th>
                            <th style={{ padding: '8px' }}>Admin Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(r => (
                            <tr key={r._id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                <td style={{ padding: '8px' }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '3px', fontSize: '12px',
                                        background: r.status === 'approved' ? '#dff0d8' : r.status === 'rejected' ? '#f2dede' : '#fcf8e3',
                                        color: r.status === 'approved' ? '#3c763d' : r.status === 'rejected' ? '#a94442' : '#8a6d3b'
                                    }}>
                                        {r.status}
                                    </span>
                                </td>
                                <td style={{ padding: '8px' }}>{r.adminNote || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
