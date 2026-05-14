import axios from 'axios';
import { clearStoredAuth, getStoredToken } from './authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'https://apibcps.z76.vn/api';
// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002/api";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Chỉ tự động logout khi token hết hạn hoặc không hợp lệ (401)
        // Lỗi 403 (Forbidden) có thể do không có quyền xem bản ghi cụ thể, không nên logout user
        if (error.response && error.response.status === 401) {
            clearStoredAuth();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

export const formatDate = (dateStr, includeTime = true) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return includeTime ? date.toLocaleString('vi-VN') : date.toLocaleDateString('vi-VN');
};

/** Format số có dấu phân cách nghìn (VD: 1.000.000) dùng cho input UI */
export const formatInputNumber = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const s = val.toString().replace(/[^0-9.]/g, ''); // chỉ giữ số và dấu chấm thập phân
    const parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
};

/** Chuyển ngược từ chuỗi format (1.000,5) về số (1000.5) để lưu DB */
export const parseInputNumber = (val) => {
    if (!val) return '';
    return val.toString().replace(/\./g, '').replace(/,/g, '.');
};

export const getFileBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    return apiUrl.replace('/api', ''); // Xóa '/api' ở cuối để thành http://localhost:5002
};

export default api;
