import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const INTEREST_OPTIONS = ['Technical', 'Cultural', 'Sports', 'Other'];

export default function Profile() {
    const { user, setUser } = useAuth();
    const [form, setForm] = useState({ firstName: '', lastName: '', collegeName: '', contactNumber: '', interests: [] });
    const [followedClubs, setFollowedClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    // Password change state
    const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
    const [pwMsg, setPwMsg] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        try {
            const res = await api.get('/participant/profile');
            const u = res.data.user;
            setForm({
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                collegeName: u.collegeName || '',
                contactNumber: u.contactNumber || '',
                interests: u.interests || [],
            });
            setFollowedClubs(u.followedOrganizers || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function updateProfile(e) {
        e.preventDefault();
        try {
            const res = await api.put('/participant/profile', form);
            setUser(res.data.user);
            setMsg('Profile updated successfully');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg('Failed to update profile');
        }
    }

    async function changePassword(e) {
        e.preventDefault();
        setPwMsg('');
        try {
            const res = await api.put('/participant/change-password', pwForm);
            setPwMsg(res.data.message || 'Password changed');
            setPwForm({ oldPassword: '', newPassword: '' });
        } catch (err) {
            setPwMsg(err.response?.data?.error || 'Failed to change password');
        }
    }

    function toggleInterest(interest) {
        setForm(prev => {
            const current = prev.interests || [];
            if (current.includes(interest)) {
                return { ...prev, interests: current.filter(i => i !== interest) };
            } else {
                return { ...prev, interests: [...current, interest] };
            }
        });
    }

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <h1>My Profile</h1>
            {msg && <div style={{ marginBottom: '10px', color: 'green' }}>{msg}</div>}

            <form onSubmit={updateProfile}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>First Name</label>
                        <input type="text" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} style={{ width: '100%' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Last Name</label>
                        <input type="text" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} style={{ width: '100%' }} />
                    </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Email (read-only)</label>
                    <input type="email" value={user?.email || ''} readOnly style={{ width: '100%', background: '#eee' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Participant Type (read-only)</label>
                    <input type="text" value={user?.participantType === 'iiit' ? 'IIIT Student' : 'Non-IIIT'} readOnly style={{ width: '100%', background: '#eee' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>College / Organization</label>
                    <input type="text" value={form.collegeName} onChange={e => setForm({ ...form, collegeName: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Contact Number</label>
                    <input type="text" value={form.contactNumber} onChange={e => setForm({ ...form, contactNumber: e.target.value })} style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Interests</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {INTEREST_OPTIONS.map(opt => (
                            <label key={opt} style={{ cursor: 'pointer' }}>
                                <input type="checkbox" checked={(form.interests || []).includes(opt)} onChange={() => toggleInterest(opt)} />{' '}{opt}
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit">Save Changes</button>
            </form>

            {/* Password Change Section */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h3>Change Password</h3>
                {pwMsg && <div style={{ marginBottom: '10px', color: pwMsg.includes('changed') ? 'green' : 'red' }}>{pwMsg}</div>}
                <form onSubmit={changePassword}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>Current Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showOldPassword ? "text" : "password"} value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} style={{ width: '100%', paddingRight: '40px' }} required />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#666' }}
                            >
                                {showOldPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                        <label>New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showNewPassword ? "text" : "password"} value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} style={{ width: '100%', paddingRight: '40px' }} required />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#666' }}
                            >
                                {showNewPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                    <button type="submit">Change Password</button>
                </form>
            </div>

            {/* Followed Clubs (read-only display) */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <h3>Clubs I Follow</h3>
                {followedClubs.length === 0 ? (
                    <p style={{ color: '#888' }}>You are not following any clubs yet. Head over to the Clubs page to discover organizers.</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {followedClubs.map(club => (
                            <li key={club._id} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                <strong>{club.organizerName}</strong>
                                <span style={{ color: '#888', marginLeft: '10px', fontSize: '13px' }}>{club.category}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
