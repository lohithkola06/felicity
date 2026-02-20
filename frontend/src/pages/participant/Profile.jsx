import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
    const { user, setUser } = useAuth();
    const [form, setForm] = useState({ name: '', college: '', contactNumber: '', interests: [] });
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const res = await api.get('/participant/profile');
            setForm(res.data.user);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function updateProfile(e) {
        e.preventDefault();
        try {
            const res = await api.put('/participant/profile', form);
            setUser(res.data);
            setMsg('Profile Updated');
        } catch (e) {
            setMsg('Failed update');
        }
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h1>My Profile</h1>
            {msg && <div style={{ marginBottom: '10px', color: 'green' }}>{msg}</div>}

            <form onSubmit={updateProfile}>
                <div style={{ marginBottom: '10px' }}>
                    <label>Name</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Email (read-only)</label>
                    <input type="email" value={form.email || ''} readOnly style={{ width: '100%', background: '#eee' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>College</label>
                    <input type="text" value={form.college || ''} onChange={e => setForm({ ...form, college: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Contact Number</label>
                    <input type="text" value={form.contactNumber || ''} onChange={e => setForm({ ...form, contactNumber: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label>Interests (comma separated)</label>
                    <input type="text" value={form.interests ? form.interests.join(',') : ''}
                        onChange={e => setForm({ ...form, interests: e.target.value.split(',') })}
                        style={{ width: '100%' }} />
                </div>

                <button type="submit">Save Changes</button>
            </form>

            <h3>Followed Clubs</h3>
            <ul>
                {(form.followedClubs || []).map(club => (
                    <li key={club._id}>{club.name}</li>
                ))}
                {(form.followedClubs || []).length === 0 && <li>Not following anyone yet.</li>}
            </ul>
        </div>
    );
}
