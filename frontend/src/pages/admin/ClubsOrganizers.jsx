import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ClubsOrganizers() {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrganizers();
    }, []);

    async function fetchOrganizers() {
        try {
            const res = await api.get('/admin/organizers');
            setOrganizers(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div style={{ maxWidth: '960px', margin: '40px auto', textAlign: 'center' }}>
                Loading clubs & organizers...
            </div>
        );
    }

    const active = organizers.filter(o => !o.isArchived);
    const archived = organizers.filter(o => o.isArchived);

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Clubs & Organizers</h1>
                <span style={{
                    background: '#dc3545',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                }}>
                    DEV ONLY
                </span>
            </div>

            <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
                This page is only available in the development environment.
            </p>

            {/* Summary */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '30px' }}>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '16px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 4px' }}>{organizers.length}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Total</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '16px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 4px' }}>{active.length}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Active</p>
                </div>
                <div style={{ flex: 1, border: '1px solid #ccc', padding: '16px', background: '#fff', textAlign: 'center', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 4px' }}>{archived.length}</h3>
                    <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>Archived</p>
                </div>
            </div>

            {/* Active Organizers */}
            <h2>Active Organizers</h2>
            {active.length === 0 ? (
                <p style={{ color: '#777' }}>No active organizers.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', background: '#fff' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                            <th style={{ padding: '10px' }}>Name</th>
                            <th style={{ padding: '10px' }}>Category</th>
                            <th style={{ padding: '10px' }}>Email</th>
                            <th style={{ padding: '10px' }}>Description</th>
                            <th style={{ padding: '10px' }}>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {active.map(org => (
                            <tr key={org._id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{org.organizerName}</td>
                                <td style={{ padding: '10px' }}>
                                    <span style={{
                                        background: '#e8f4fd',
                                        color: '#337ab7',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                    }}>
                                        {org.category}
                                    </span>
                                </td>
                                <td style={{ padding: '10px', fontSize: '13px', color: '#555' }}>{org.contactEmail || org.email}</td>
                                <td style={{ padding: '10px', fontSize: '13px', color: '#777', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.description || '—'}</td>
                                <td style={{ padding: '10px', fontSize: '13px', color: '#999' }}>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Archived Organizers */}
            {archived.length > 0 && (
                <>
                    <h2>Archived Organizers</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fafafa' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Category</th>
                                <th style={{ padding: '10px' }}>Email</th>
                            </tr>
                        </thead>
                        <tbody>
                            {archived.map(org => (
                                <tr key={org._id} style={{ borderBottom: '1px solid #eee', opacity: 0.6 }}>
                                    <td style={{ padding: '10px' }}>{org.organizerName}</td>
                                    <td style={{ padding: '10px', fontSize: '13px' }}>{org.category}</td>
                                    <td style={{ padding: '10px', fontSize: '13px', color: '#555' }}>{org.contactEmail || org.email}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}
