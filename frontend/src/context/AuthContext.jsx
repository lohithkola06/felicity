import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Determine path based on stored role or just verify?
                // Assuming backend has /auth/me or verify
                // For now, decode logic or simple check.
                // Let's assume we store user info or valid token check
                // We'll rely on the dashboard to fetch user details or similar.
                // Actually, best is to store user in state. 
                // Let's try to fetch profile or decode token.
                const storedUser = JSON.parse(localStorage.getItem('user'));
                if (storedUser) setUser(storedUser);
            } catch (e) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    };

    const login = async (form) => {
        // api call should be made by the component, this just sets state
        // or we can do it here. 
        // Let's assume the component calls api.post('/auth/login') then calls this.
        // Or we provide a login function that calls API.
        try {
            const res = await api.post('/auth/login', form);
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            return user;
        } catch (err) {
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const value = {
        user,
        login,
        logout,
        setUser // exposed for profile updates
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
