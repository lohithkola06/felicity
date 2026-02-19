import { useState } from 'react';
import api from '../../api/axios';

export default function PasswordReset() {
    const [pwd, setPwd] = useState('');

    async function save(e) {
        e.preventDefault();
        try {
            await api.post('/password-reset', { newPassword: pwd });
            alert('Password changed');
        } catch (e) { alert('Error'); }
    }

    return (
        <div style={{ maxWidth: '400px', margin: '20px auto' }}>
            <h1>Reset Password</h1>
            <form onSubmit={save}>
                <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="New Password" style={{ width: '100%', marginBottom: '10px' }} />
                <button type="submit">Update</button>
            </form>
        </div>
    );
}
