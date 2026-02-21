import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            const user = await login({ email, password });
            if (user.role === 'admin') navigate('/admin/dashboard');
            else if (user.role === 'organizer') navigate('/organizer/dashboard');
            else {
                const needsOnboarding = !user.interests || user.interests.length === 0;
                navigate(needsOnboarding ? '/onboarding' : '/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', background: '#fff' }}>
            <h2 style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Login</h2>

            {error && (
                <div style={{
                    padding: '10px', marginBottom: '15px',
                    background: '#f2dede', color: '#a94442',
                    border: '1px solid #ebccd1',
                    borderRadius: '4px', textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', paddingRight: '40px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#666'
                            }}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    style={{
                        width: '100%', padding: '10px',
                        background: '#337ab7', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'
                    }}
                >
                    Login
                </button>
            </form>

            <p style={{ marginTop: '10px', textAlign: 'center' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
}
