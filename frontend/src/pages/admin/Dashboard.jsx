import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
    const [organizers, setOrganizers] = useState([]);
    const [stats, setStats] = useState({});
    const [form, setForm] = useState({ organizerName: '', contactEmail: '', password: '', category: 'Technical' });
    const [confirmAction, setConfirmAction] = useState(null);

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
            await api.post('/admin/create-organizer', form);
            fetchData();
            setForm({ organizerName: '', contactEmail: '', password: '', category: 'Technical' });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed');
        }
    }

    async function handleConfirm() {
        if (!confirmAction) return;
        const { id, action } = confirmAction;
        try {
            if (action === 'delete') {
                await api.delete(`/admin/organizers/${id}`);
            } else if (action === 'archive' || action === 'unarchive') {
                await api.patch(`/admin/organizers/${id}/archive`);
            }
            fetchData();
            setConfirmAction(null);
        } catch (e) {
            alert('Action failed');
            setConfirmAction(null);
        }
    }

    function requestDelete(org) {
        setConfirmAction({ id: org._id, action: 'delete', name: org.organizerName });
    }

    function requestToggleArchive(org) {
        setConfirmAction({ id: org._id, action: org.isArchived ? 'unarchive' : 'archive', name: org.organizerName });
    }

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Admin Dashboard</h1>

            <div style={{ border: '1px solid #ccc', padding: '20px', background: '#f9f9f9', marginBottom: '30px' }}>
                <h3>Add New Organizer</h3>
                <form onSubmit={createOrganizer} style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Name" value={form.organizerName} onChange={e => setForm({ ...form, organizerName: e.target.value })} required />
                    <input type="email" placeholder="Email (@iiit.ac.in)" value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} required />
                    <input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        <option>Technical</option>
                        <option>Cultural</option>
                        <option>Sports</option>
                        <option>Other</option>
                    </select>
                    <button type="submit">Create</button>
                </form>
            </div>

            {confirmAction && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', maxWidth: '400px', width: '100%' }}>
                        <h3>Confirm Action</h3>
                        <p>Are you sure you want to <strong>{confirmAction.action}</strong> organizer "{confirmAction.name}"?</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmAction(null)}>Cancel</button>
                            <button onClick={handleConfirm} style={{ background: confirmAction.action === 'delete' ? 'red' : 'blue', color: 'white' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

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
                            <td style={{ padding: '10px' }}>{org.organizerName}</td>
                            <td style={{ padding: '10px' }}>{org.email}</td>
                            <td style={{ padding: '10px' }}>{org.category}</td>
                            <td style={{ padding: '10px' }}>{org.isArchived ? 'Archived' : 'Active'}</td>
                            <td style={{ padding: '10px' }}>
                                <button onClick={() => requestToggleArchive(org)} style={{ marginRight: '5px' }}>
                                    {org.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                                <button onClick={() => requestDelete(org)} style={{ color: 'red' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
