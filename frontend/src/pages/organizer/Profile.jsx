import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function OrgProfile() {
    const [form, setForm] = useState({});

    useEffect(() => {
        api.get('/organizer/profile').then(res => setForm(res.data));
    }, []);

    async function save(e) {
        e.preventDefault();
        await api.put('/organizer/profile', form);
        alert('Saved');
    }

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto' }}>
            <h1>Edit Profile</h1>
            <form onSubmit={save}>
                <label>Name</label>
                <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
                <label>Discord Webhook</label>
                <input type="text" value={form.discordWebhook || ''} onChange={e => setForm({ ...form, discordWebhook: e.target.value })} style={{ width: '100%', marginBottom: '10px' }} />
                <button type="submit">Save</button>
            </form>
        </div>
    );
}
