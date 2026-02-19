import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
    const [organizers, setOrganizers] = useState([]);
    const [stats, setStats] = useState({});
    const [form, setForm] = useState({ name: '', email: '', category: 'Technical' });
    const [createdCreds, setCreatedCreds] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const res = await api.get('/admin/organizers');
            setOrganizers(res.data);
            // fetch stats if endpoint exists
        } catch (e) {
            console.error(e);
        }
    }

    async function createOrganizer(e) {
        e.preventDefault();
        try {
            const res = await api.post('/admin/organizers', form);
            setCreatedCreds(res.data);
            fetchData();
            setForm({ name: '', email: '', category: 'Technical' });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    async function deleteOrganizer(id) {
        if (!confirm('Permanently delete?')) return;
        try {
            await api.delete(`/admin/organizers/${id}`);
            fetchData();
        } catch (e) { alert('Failed'); }
    }

    async function toggleArchive(id, currentStatus) {
        // assume endpoint exists or use delete/archive
        // The audit report mentioned archive option.
        try {
            await api.put(`/admin/organizers/${id}/archive`, { archived: !currentStatus });
            fetchData();
        } catch (e) { alert('Failed to toggle archive'); }
    }

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Admin Dashboard</h1>

            <div style={{ border: '1px solid #ccc', padding: '20px', background: '#f9f9f9', marginBottom: '30px' }}>
                <h3>Add New Organizer</h3>
                <form onSubmit={createOrganizer} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <input type="email" placeholder="Email (will be login)" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option>Technical</option>
                        <option>Cultural</option>
                        <option>Sports</option>
                        <option>Other</option>
                    </select>
                    <button type="submit">Create</button>
                </form>
                {createdCreds && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#dff0d8', color: '#3c763d' }}>
                        <strong>Created!</strong> Password: {createdCreds.password}
                    </div>
                )}
            </div>

            <h3>Manage Organizers</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                    <tr style={{ background: '#eee', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Name</th>
                        <th style={{ padding: '10px' }}>Email</th>
                        <th style={{ padding: '10px' }}>Category</th>
                        <th style={{ padding: '10px' }}>Status</th>
                        <th style={{ padding: '10px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {organizers.map(org => (
                        <tr key={org._id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td style={{ padding: '10px' }}>{org.name}</td>
                            <td style={{ padding: '10px' }}>{org.email}</td>
                            <td style={{ padding: '10px' }}>{org.category}</td>
                            <td style={{ padding: '10px' }}>{org.isArchived ? 'Archived' : 'Active'}</td>
                            <td style={{ padding: '10px' }}>
                                <button onClick={() => toggleArchive(org._id, org.isArchived)} style={{ marginRight: '5px' }}>
                                    {org.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                                <button onClick={() => deleteOrganizer(org._id)} style={{ color: 'red' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
