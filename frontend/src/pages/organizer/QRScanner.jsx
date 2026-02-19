import { useState } from 'react';
import api from '../../api/axios';

export default function QRScanner() {
    const [ticketId, setTicketId] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    async function handleScan(e) {
        e.preventDefault();
        if (!ticketId.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post('/attendance/mark', { ticketId: ticketId.trim() });
            setResult({ type: 'success', message: res.data.message || 'Attendance marked!' });
        } catch (err) {
            const msg = err.response?.data?.error || 'Could not mark attendance.';
            setResult({ type: 'error', message: msg });
        }
        setLoading(false);
    }

    return (
        <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', background: '#fff' }}>
            <h1>QR Attendance</h1>
            <p>Enter Ticket ID manually (Basic Mode)</p>

            <form onSubmit={handleScan}>
                <input
                    type="text"
                    value={ticketId}
                    onChange={e => setTicketId(e.target.value)}
                    placeholder="Enter Ticket ID"
                    style={{ width: '100%', padding: '10px', fontSize: '16px', marginBottom: '10px' }}
                />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px' }}>
                    {loading ? 'Marking...' : 'Mark Attendance'}
                </button>
            </form>

            {result && (
                <div style={{
                    marginTop: '20px', padding: '15px',
                    background: result.type === 'success' ? '#dff0d8' : '#f2dede',
                    color: result.type === 'success' ? 'green' : 'red'
                }}>
                    {result.message}
                </div>
            )}
        </div>
    );
}
