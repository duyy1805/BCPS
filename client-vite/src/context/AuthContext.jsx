/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

/** Decode JWT payload (base64) không cần thư viện */
function decodeJwt(token) {
    try {
        const base64Payload = token.split('.')[1];
        const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/** Kiểm tra token còn hạn không (exp tính theo giây) */
function isTokenValid(token) {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return false;
    return payload.exp * 1000 > Date.now();
}

const STORAGE_KEYS = {
    token: 'jwt_token',
    userName: 'user_name',
    empCode: 'emp_code',
    deptCode: 'department_code',
    unitName: 'unit_name',
    roles: 'user_roles',
};

function clearStorage() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const logout = useCallback((reason) => {
        clearStorage();
        setUser(null);
        navigate('/login', { state: { reason } });
    }, [navigate]);

    // Khôi phục session khi load lại trang
    useEffect(() => {
        const token = localStorage.getItem(STORAGE_KEYS.token);
        const userName = localStorage.getItem(STORAGE_KEYS.userName);
        const empCode = localStorage.getItem(STORAGE_KEYS.empCode);
        const deptCode = localStorage.getItem(STORAGE_KEYS.deptCode);
        const unitName = localStorage.getItem(STORAGE_KEYS.unitName);
        const rolesStr = localStorage.getItem(STORAGE_KEYS.roles);

        if (token && userName) {
            if (isTokenValid(token)) {
                let roles = [];
                try {
                    roles = rolesStr ? JSON.parse(rolesStr) : [];
                } catch (e) {
                    console.error("Failed to parse roles", e);
                }
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser({ token, userName, empCode, deptCode, unitName, roles });
            } else {
                // Token đã hết hạn → xóa và chuyển về login
                clearStorage();
                navigate('/login', { state: { reason: 'expired' } });
            }
        }
        setLoading(false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Tự động logout khi token hết hạn (kiểm tra mỗi phút)
    useEffect(() => {
        if (!user) return;

        const check = () => {
            const token = localStorage.getItem(STORAGE_KEYS.token);
            if (!token || !isTokenValid(token)) {
                logout('expired');
            }
        };

        const interval = setInterval(check, 60_000); // mỗi 60 giây
        return () => clearInterval(interval);
    }, [user, logout]);

    const login = (data) => {
        localStorage.setItem(STORAGE_KEYS.token, data.token);
        localStorage.setItem(STORAGE_KEYS.userName, data.userName);
        localStorage.setItem(STORAGE_KEYS.empCode, data.empCode || '');
        if (data.deptCode) {
            localStorage.setItem(STORAGE_KEYS.deptCode, data.deptCode);
        }
        if (data.unitName) {
            localStorage.setItem(STORAGE_KEYS.unitName, data.unitName);
        }
        if (data.roles) {
            localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(data.roles));
        }
        setUser({
            token: data.token,
            userName: data.userName,
            empCode: data.empCode,
            deptCode: data.deptCode,
            unitName: data.unitName || '',
            roles: data.roles || [],
        });
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
