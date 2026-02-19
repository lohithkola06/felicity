import axios from 'axios';

// all api calls go through this
const api = axios.create({ baseURL: '/api' });

// slap the token on every request if we have one
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
