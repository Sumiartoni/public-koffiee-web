import axios from 'axios';
import { API_URL } from './config.js';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Menu API
export const menuAPI = {
    getAll: (category = null) => {
        const params = category && category !== 'all' ? { category } : {};
        return api.get('/menu', { params });
    },
    getById: (id) => api.get(`/menu/${id}`),
    getCategories: () => api.get('/menu/categories/all')
};

// Order API
export const orderAPI = {
    create: (orderData) => api.post('/orders', orderData),
    getById: (id) => api.get(`/orders/${id}`),
    getByOrderNumber: (orderNumber) => api.get(`/orders/${orderNumber}`)
};

// Settings API
export const settingsAPI = {
    get: () => api.get('/settings'),
    getAppInfo: () => api.get('/settings/app/info')
};

export default api;
