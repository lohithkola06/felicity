import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
    const [organizers, setOrganizers] = useState([]);
    const [resetRequests, setResetRequests] = useState([]);
    const [form, setForm] = useState({ organizerName: '', contactEmail: '', password: '', category: 'Technical' });
    const [confirmAction, setConfirmAction] = useState(null);
    const [activeTab, setActiveTab] = useState('organizers');

    useEffect(() => {
        fetchData();
        fetchResetRequests();
    }, []);

    async function fetchData() {
        try {
            const res = await api.get('/admin/organizers');
            setOrganizers(res.data);
        } catch (e) {
            console.error(e);
        }
    }

    async function fetchResetRequests() {
        try {
            const res = await api.get('/password-reset/all');
            setResetRequests(res.data);
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

    async function handleResetAction(requestId, action) {
        try {
            const note = prompt(`Add a note for the organizer (optional):`) || '';
            const res = await api.post(`/password-reset/${requestId}/${action}`, { note });
            if (action === 'approve' && res.data.tempPassword) {
                alert(`Request approved. Temporary password: ${res.data.tempPassword}\n\nPlease share this with the organizer securely.`);
            }
            fetchResetRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Action failed');
        }
    }

    function requestDelete(org) {
        setConfirmAction({ id: org._id, action: 'delete', name: org.organizerName });
    }

    function requestToggleArchive(org) {
        setConfirmAction({ id: org._id, action: org.isArchived ? 'unarchive' : 'archive', name: org.organizerName });
    }

    const activeOrgs = organizers.filter(o => !o.isArchived).length;
    const archivedOrgs = organizers.filter(o => o.isArchived).length;
    const pendingResets = resetRequests.filter(r => r.status === 'pending').length;

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <h1>Admin Dashboard</h1>

            {/* Overview Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{organizers.length}</h3>
                    <p>Total Organizers</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{activeOrgs}</h3>
                    <p>Active</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: '#fff', textAlign: 'center' }}>
                    <h3>{archivedOrgs}</h3>
                    <p>Archived</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '20px', background: pendingResets > 0 ? '#fcf8e3' : '#fff', textAlign: 'center' }}>
                    <h3>{pendingResets}</h3>
                    <p>Pending Resets</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
                <button onClick={() => setActiveTab('organizers')} style={{ fontWeight: activeTab === 'organizers' ? 'bold' : 'normal', marginRight: '15px', padding: '8px 0', borderBottom: activeTab === 'organizers' ? '2px solid #337ab7' : 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Manage Organizers</button>
                <button onClick={() => setActiveTab('resets')} style={{ fontWeight: activeTab === 'resets' ? 'bold' : 'normal', padding: '8px 0', borderBottom: activeTab === 'resets' ? '2px solid #337ab7' : 'none', background: 'none', border: 'none', cursor: 'pointer' }}>Password Reset Requests {pendingResets > 0 && `(${pendingResets})`}</button>
            </div>

            {activeTab === 'organizers' && (
                <>
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
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ background: '#fff', padding: '20px', borderRadius: '4px', maxWidth: '400px', width: '100%' }}>
                                <h3>Confirm Action</h3>
                                <p>Are you sure you want to <strong>{confirmAction.action}</strong> organizer "{confirmAction.name}"?</p>
                                {confirmAction.action === 'delete' && <p style={{ color: 'red', fontSize: '13px' }}>This will permanently remove the organizer and all their events, registrations, and related data.</p>}
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
                </>
            )}

            {activeTab === 'resets' && (
                <>
                    <h3>Password Reset Requests</h3>
                    {resetRequests.length === 0 ? (
                        <p style={{ color: '#888' }}>No password reset requests.</p>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                            <thead>
                                <tr style={{ background: '#eee', textAlign: 'left' }}>
                                    <th style={{ padding: '10px' }}>Club / Organizer</th>
                                    <th style={{ padding: '10px' }}>Date</th>
                                    <th style={{ padding: '10px' }}>Reason</th>
                                    <th style={{ padding: '10px' }}>Status</th>
                                    <th style={{ padding: '10px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resetRequests.map(r => (
                                    <tr key={r._id} style={{ borderBottom: '1px solid #ddd' }}>
                                        <td style={{ padding: '10px' }}>{r.organizer?.organizerName || 'Unknown'}</td>
                                        <td style={{ padding: '10px' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px' }}>{r.reason || '-'}</td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '3px', fontSize: '12px',
                                                background: r.status === 'approved' ? '#dff0d8' : r.status === 'rejected' ? '#f2dede' : '#fcf8e3',
                                                color: r.status === 'approved' ? '#3c763d' : r.status === 'rejected' ? '#a94442' : '#8a6d3b'
                                            }}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {r.status === 'pending' ? (
                                                <>
                                                    <button onClick={() => handleResetAction(r._id, 'approve')} style={{ marginRight: '5px', color: 'green' }}>Approve</button>
                                                    <button onClick={() => handleResetAction(r._id, 'reject')} style={{ color: 'red' }}>Reject</button>
                                                </>
                                            ) : (
                                                <span style={{ color: '#888', fontSize: '13px' }}>{r.adminNote || 'Processed'}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
}
