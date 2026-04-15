import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Chỉ tự động logout khi token hết hạn hoặc không hợp lệ (401)
        // Lỗi 403 (Forbidden) có thể do không có quyền xem bản ghi cụ thể, không nên logout user
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('emp_code');
            localStorage.removeItem('department_code');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
export const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';

export default api;
