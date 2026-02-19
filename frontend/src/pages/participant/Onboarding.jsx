import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function Onboarding() {
    const navigate = useNavigate();
    const [interests, setInterests] = useState([]);

    // Simple mock onboarding
    return (
        <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', border: '1px solid #ccc' }}>
            <h1>Welcome!</h1>
            <p>Tell us what you like.</p>
            {/* Logic truncated for simplicity, mostly similar to Profile update */}
            <button onClick={() => navigate('/dashboard')}>Skip to Dashboard</button>
        </div>
    );
}
