import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const INTEREST_OPTIONS = ['Technical', 'Cultural', 'Sports', 'Other'];

export default function Onboarding() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = interests, 2 = clubs
    const [interests, setInterests] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [followedIds, setFollowedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loadingClubs, setLoadingClubs] = useState(false);

    // Fetch clubs when moving to step 2
    useEffect(() => {
        if (step === 2) {
            setLoadingClubs(true);
            api.get('/participant/clubs').then(res => {
                setClubs(res.data);
            }).catch(() => { }).finally(() => setLoadingClubs(false));
        }
    }, [step]);

    function toggleInterest(interest) {
        setInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    }

    function toggleFollow(clubId) {
        setFollowedIds(prev =>
            prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
        );
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Save interests
            await api.put('/participant/profile', { interests });
            // Follow selected clubs
            for (const clubId of followedIds) {
                await api.post(`/participant/clubs/${clubId}/follow`).catch(() => { });
            }
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to save preferences:', err);
            navigate('/dashboard');
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
            {/* Progress indicator */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '25px' }}>
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#337ab7' }} />
                <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? '#337ab7' : '#e0e0e0' }} />
            </div>

            {step === 1 ? (
                <>
                    <h1 style={{ marginTop: 0 }}>Welcome! 🎉</h1>
                    <p style={{ color: '#555', marginBottom: '20px' }}>
                        Pick the topics you're interested in so we can recommend events that match your tastes.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '30px' }}>
                        {INTEREST_OPTIONS.map(opt => (
                            <button key={opt} type="button" onClick={() => toggleInterest(opt)}
                                style={{
                                    padding: '12px 24px', border: '2px solid',
                                    borderColor: interests.includes(opt) ? '#337ab7' : '#ccc',
                                    borderRadius: '24px',
                                    background: interests.includes(opt) ? '#337ab7' : '#fff',
                                    color: interests.includes(opt) ? '#fff' : '#333',
                                    cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
                                }}>
                                {opt}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => setStep(2)}
                            style={{
                                padding: '10px 25px', background: '#337ab7', color: '#fff',
                                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                            }}>
                            Next →
                        </button>
                        <button onClick={() => navigate('/dashboard')}
                            style={{
                                padding: '10px 25px', background: 'transparent', color: '#777',
                                border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                            }}>
                            Skip for now
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <h1 style={{ marginTop: 0 }}>Follow Clubs & Organizers 🏫</h1>
                    <p style={{ color: '#555', marginBottom: '20px' }}>
                        Follow clubs to stay updated on their events. You'll also be able to filter events by followed clubs.
                    </p>

                    {loadingClubs ? (
                        <p>Loading clubs...</p>
                    ) : clubs.length === 0 ? (
                        <p style={{ color: '#888' }}>No clubs/organizers found yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', maxHeight: '300px', overflowY: 'auto' }}>
                            {clubs.map(club => (
                                <div key={club._id}
                                    onClick={() => toggleFollow(club._id)}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 16px', border: '2px solid',
                                        borderColor: followedIds.includes(club._id) ? '#337ab7' : '#e0e0e0',
                                        borderRadius: '8px', cursor: 'pointer',
                                        background: followedIds.includes(club._id) ? '#edf4ff' : '#fff',
                                        transition: 'all 0.2s',
                                    }}>
                                    <div>
                                        <strong>{club.organizerName}</strong>
                                        {club.category && (
                                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: '12px' }}>
                                                {club.category}
                                            </span>
                                        )}
                                        {club.description && (
                                            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{club.description}</div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '20px', color: followedIds.includes(club._id) ? '#337ab7' : '#ccc' }}>
                                        {followedIds.includes(club._id) ? '★' : '☆'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => setStep(1)}
                            style={{
                                padding: '10px 25px', background: 'transparent', color: '#337ab7',
                                border: '1px solid #337ab7', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                            }}>
                            ← Back
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            style={{
                                padding: '10px 25px', background: '#5cb85c', color: '#fff',
                                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                            }}>
                            {saving ? 'Saving...' : 'Finish Setup'}
                        </button>
                        <button onClick={() => navigate('/dashboard')}
                            style={{
                                padding: '10px 25px', background: 'transparent', color: '#777',
                                border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                            }}>
                            Skip
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
