import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

/**
 * Register Page
 * 
 * Handles new user signups.
 * Features:
 * - Differentiates between 'IIIT' and 'Non-IIIT' participants.
 * - Enforces IIIT email domain validation.
 * - Collects necessary contact info for event coordination.
 */
export default function Register() {
    const navigate = useNavigate();


    // Feedback state
    const [statusMessage, setStatusMessage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        participantType: 'iiit', // Default to IIIT as it's the primary audience
        collegeName: 'IIIT Hyderabad', // Pre-filled for IIIT
        contactNumber: '',
    });

    /**
     * Handles form submission.
     */
    async function handleRegister(e) {
        e.preventDefault();

        // Basic Client-side Validation
        if (formData.participantType === 'iiit') {
            if (!formData.email.match(/@(students\.)?iiit\.ac\.in$/i)) {
                setStatusMessage({ type: 'error', text: 'Please use your official IIIT email address (@iiit.ac.in).' });
                return;
            }
        }

        setIsSubmitting(true);
        setStatusMessage(null);

        try {
            await api.post('/auth/register', formData);

            setStatusMessage({ type: 'success', text: 'Welcome aboard! Redirecting you to the login page...' });

            // Redirect to login after a brief pause
            setTimeout(() => navigate('/login'), 2000);

        } catch (err) {
            console.error(err);
            setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Registration failed. Please try again.' });
        }
        setIsSubmitting(false);
    }

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff' }}>
            <h2 style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Create Account</h2>

            {statusMessage && (
                <div style={{
                    padding: '10px', marginBottom: '15px',
                    background: statusMessage.type === 'success' ? '#dff0d8' : '#f2dede',
                    color: statusMessage.type === 'success' ? '#3c763d' : '#a94442',
                    border: '1px solid', borderColor: statusMessage.type === 'success' ? '#d6e9c6' : '#ebccd1',
                    borderRadius: '4px', textAlign: 'center'
                }}>
                    {statusMessage.text}
                </div>
            )}

            <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>I am a...</label>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <label>
                            <input
                                type="radio"
                                name="ptype"
                                value="iiit"
                                checked={formData.participantType === 'iiit'}
                                onChange={() => setFormData({ ...formData, participantType: 'iiit', collegeName: 'IIIT Hyderabad' })}
                            /> IIIT Student
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="ptype"
                                value="non-iiit"
                                checked={formData.participantType === 'non-iiit'}
                                onChange={() => setFormData({ ...formData, participantType: 'non-iiit', collegeName: '' })}
                            /> Visitor
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>First Name</label>
                        <input
                            type="text" required
                            style={{ width: '100%', padding: '8px' }}
                            value={formData.firstName}
                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Last Name</label>
                        <input
                            type="text" required
                            style={{ width: '100%', padding: '8px' }}
                            value={formData.lastName}
                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Email Address</label>
                    <input
                        type="email" required
                        style={{ width: '100%', padding: '8px' }}
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder={formData.participantType === 'iiit' ? 'user@students.iiit.ac.in' : 'user@example.com'}
                    />
                </div>

                {formData.participantType === 'non-iiit' && (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>College / Organization</label>
                        <input
                            type="text" required
                            style={{ width: '100%', padding: '8px' }}
                            value={formData.collegeName}
                            onChange={e => setFormData({ ...formData, collegeName: e.target.value })}
                        />
                    </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Contact Number</label>
                    <input
                        type="tel" required
                        style={{ width: '100%', padding: '8px' }}
                        value={formData.contactNumber}
                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                    <input
                        type="password" required
                        style={{ width: '100%', padding: '8px' }}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>



                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                        width: '100%', padding: '10px',
                        background: '#337ab7', color: 'white',
                        border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px'
                    }}
                >
                    {isSubmitting ? 'Signing Up...' : 'Register'}
                </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
                Already have an account? <Link to="/login" style={{ color: '#337ab7' }}>Login here</Link>
            </div>
        </div>
    );
}
