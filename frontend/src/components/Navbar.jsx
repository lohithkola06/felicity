import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <nav style={{ background: '#333', color: '#fff', padding: '10px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
                <Link to="/" style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>Felicity Events</Link>

                <ul style={{ display: 'flex', gap: '15px', listStyle: 'none', margin: 0, padding: 0 }}>
                    <li><Link to="/events" style={{ color: '#ccc' }}>Browse Events</Link></li>
                    <li><Link to="/clubs" style={{ color: '#ccc' }}>Clubs</Link></li>

                    {user ? (
                        <>
                            {user.role === 'organizer' && (
                                <>
                                    <li><Link to="/organizer/dashboard" style={{ color: '#ccc' }}>Dashboard</Link></li>
                                    <li><Link to="/organizer/events/new" style={{ color: '#ccc' }}>Create Event</Link></li>
                                    <li><Link to="/organizer/profile" style={{ color: '#ccc' }}>Profile</Link></li>
                                    <li><Link to="/organizer/password-reset" style={{ color: '#ccc' }}>Password Reset</Link></li>
                                </>
                            )}
                            {user.role === 'participant' && (
                                <>
                                    <li><Link to="/dashboard" style={{ color: '#ccc' }}>My Dashboard</Link></li>
                                    <li><Link to="/teams" style={{ color: '#ccc' }}>My Teams</Link></li>
                                    <li><Link to="/profile" style={{ color: '#ccc' }}>Profile</Link></li>
                                </>
                            )}
                            {user.role === 'admin' && (
                                <li><Link to="/admin/dashboard" style={{ color: '#ccc' }}>Dashboard</Link></li>
                            )}
                            <li><button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline' }}>Logout</button></li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login" style={{ color: '#ccc' }}>Login</Link></li>
                            <li><Link to="/register" style={{ color: '#ccc' }}>Register</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
}
