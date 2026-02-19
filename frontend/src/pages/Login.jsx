import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const recaptchaRef = useRef();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const user = await login({ email, password });
            if (user.role === 'admin') navigate('/admin/dashboard');
            else if (user.role === 'organizer') navigate('/organizer/dashboard');
            else navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', background: '#fff' }}>
            <h2>Login</h2>
            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <button type="submit" style={{ width: '100%' }}>Login</button>
            </form>
            <p style={{ marginTop: '10px' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
}
