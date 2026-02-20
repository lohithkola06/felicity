import { useState, useEffect } from 'react';
import api from '../../api/axios';

const CATEGORY_OPTIONS = ['Technical', 'Cultural', 'Sports', 'Other'];

export default function OrgProfile() {
    const [form, setForm] = useState({
        organizerName: '',
        category: '',
        description: '',
        contactEmail: '',
        contactNumber: '',
        discordWebhook: '',
    });
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/organizer/profile').then(res => {
            const u = res.data.user || res.data;
            setForm({
                organizerName: u.organizerName || '',
                category: u.category || '',
                description: u.description || '',
                contactEmail: u.contactEmail || '',
                contactNumber: u.contactNumber || '',
                discordWebhook: u.discordWebhook || '',
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    async function save(e) {
        e.preventDefault();
        setStatus(null);
        try {
            await api.put('/organizer/profile', form);
            setStatus({ type: 'success', text: 'Profile updated successfully.' });
        } catch (err) {
            setStatus({ type: 'error', text: err.response?.data?.error || 'Failed to save profile.' });
        }
    }

    if (loading) return <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <h1 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Edit Profile</h1>

            {status && (
                <div style={{
                    padding: '10px', marginBottom: '15px',
                    background: status.type === 'success' ? '#dff0d8' : '#f2dede',
                    color: status.type === 'success' ? '#3c763d' : '#a94442',
                    border: '1px solid', borderColor: status.type === 'success' ? '#d6e9c6' : '#ebccd1',
                    borderRadius: '4px'
                }}>
                    {status.text}
                </div>
            )}

            <form onSubmit={save}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Organization / Club Name</label>
                    <input type="text" value={form.organizerName}
                        onChange={e => setForm({ ...form, organizerName: e.target.value })}
                        style={{ width: '100%', padding: '8px' }} required />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}>
                        <option value="">Select a category</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description</label>
                    <textarea value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                        style={{ width: '100%', padding: '8px', height: '80px' }}
                        placeholder="Tell participants what your club is about" />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact Email</label>
                    <input type="email" value={form.contactEmail}
                        onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="public-facing email for queries" />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contact Number</label>
                    <input type="text" value={form.contactNumber}
                        onChange={e => setForm({ ...form, contactNumber: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="optional" />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Discord Webhook URL</label>
                    <input type="text" value={form.discordWebhook}
                        onChange={e => setForm({ ...form, discordWebhook: e.target.value })}
                        style={{ width: '100%', padding: '8px' }}
                        placeholder="https://discord.com/api/webhooks/..." />
                    <small style={{ color: '#777' }}>Used for event notifications in your Discord server</small>
                </div>

                <button type="submit" style={{
                    padding: '10px 25px', background: '#337ab7', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px'
                }}>
                    Save Changes
                </button>
            </form>
        </div>
    );
}
