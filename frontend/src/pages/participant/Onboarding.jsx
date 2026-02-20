import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const INTEREST_OPTIONS = ['Technical', 'Cultural', 'Sports', 'Other'];

export default function Onboarding() {
    const navigate = useNavigate();
    const [interests, setInterests] = useState([]);
    const [saving, setSaving] = useState(false);

    function toggle(interest) {
        setInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.put('/participant/profile', { interests });
            navigate('/dashboard');
        } catch (err) {
            console.error('Failed to save interests:', err);
            navigate('/dashboard');
        }
    }

    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <h1 style={{ marginTop: 0 }}>Welcome!</h1>
            <p style={{ color: '#555', marginBottom: '25px' }}>
                Pick the topics you're interested in so we can recommend events that match your tastes.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '30px' }}>
                {INTEREST_OPTIONS.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => toggle(opt)}
                        style={{
                            padding: '10px 20px',
                            border: '2px solid',
                            borderColor: interests.includes(opt) ? '#337ab7' : '#ccc',
                            borderRadius: '20px',
                            background: interests.includes(opt) ? '#337ab7' : '#fff',
                            color: interests.includes(opt) ? '#fff' : '#333',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s',
                        }}
                    >
                        {opt}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
                <button
                    onClick={handleSave}
                    disabled={saving || interests.length === 0}
                    style={{
                        padding: '10px 25px', background: '#337ab7', color: '#fff',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                        opacity: interests.length === 0 ? 0.5 : 1,
                    }}
                >
                    {saving ? 'Saving...' : 'Continue'}
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        padding: '10px 25px', background: 'transparent', color: '#777',
                        border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '15px',
                    }}
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}
