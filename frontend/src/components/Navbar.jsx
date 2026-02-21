import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    function handleLogout() {
        logout();
        navigate('/login');
        setMenuOpen(false);
    }

    function closeMenu() {
        setMenuOpen(false);
    }

    return (
        <nav style={{ background: '#333', color: '#fff', padding: '10px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '960px', margin: '0 auto' }}>
                <Link to="/" style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', textDecoration: 'none' }}>Felicity Events</Link>

                {/* Hamburger button — mobile only */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                    className="nav-hamburger"
                    style={{
                        display: 'none', background: 'none', border: 'none',
                        color: '#fff', fontSize: '20px', cursor: 'pointer',
                        padding: '4px 8px',
                    }}
                >
                    {menuOpen ? 'X' : '='}
                </button>

                <ul
                    className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}
                    style={{ display: 'flex', gap: '15px', listStyle: 'none', margin: 0, padding: 0 }}
                >
                    <li><Link to="/events" onClick={closeMenu} style={{ color: '#ccc' }}>Browse Events</Link></li>
                    <li><Link to="/clubs" onClick={closeMenu} style={{ color: '#ccc' }}>Clubs/Organizers</Link></li>

                    {user ? (
                        <>
                            {user.role === 'organizer' && (
                                <>
                                    <li><Link to="/organizer/dashboard" onClick={closeMenu} style={{ color: '#ccc' }}>Dashboard</Link></li>
                                    <li><Link to="/organizer/events/new" onClick={closeMenu} style={{ color: '#ccc' }}>Create Event</Link></li>
                                    <li><Link to="/organizer/scan" onClick={closeMenu} style={{ color: '#ccc' }}>QR Scanner</Link></li>
                                    <li><Link to="/organizer/profile" onClick={closeMenu} style={{ color: '#ccc' }}>Profile</Link></li>
                                </>
                            )}
                            {user.role === 'participant' && (
                                <>
                                    <li><Link to="/dashboard" onClick={closeMenu} style={{ color: '#ccc' }}>My Dashboard</Link></li>
                                    <li><Link to="/teams" onClick={closeMenu} style={{ color: '#ccc' }}>My Teams</Link></li>
                                    <li><Link to="/profile" onClick={closeMenu} style={{ color: '#ccc' }}>Profile</Link></li>
                                </>
                            )}
                            {user.role === 'admin' && (
                                <>
                                    <li><Link to="/admin/dashboard" onClick={closeMenu} style={{ color: '#ccc' }}>Dashboard</Link></li>
                                </>
                            )}
                            <li><button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline' }}>Logout</button></li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login" onClick={closeMenu} style={{ color: '#ccc' }}>Login</Link></li>
                            <li><Link to="/register" onClick={closeMenu} style={{ color: '#ccc' }}>Register</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
}
