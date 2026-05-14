/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearStoredAuth, getStoredAuth, getStoredToken, setStoredAuth } from '../utils/authStorage';

const AuthContext = createContext();

/** Decode JWT payload (base64) khÃ´ng cáº§n thÆ° viá»‡n */
function decodeJwt(token) {
    try {
        const base64Payload = token.split('.')[1];
        const json = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/** Kiá»ƒm tra token cÃ²n háº¡n khÃ´ng (exp tÃ­nh theo giÃ¢y) */
function isTokenValid(token) {
    const payload = decodeJwt(token);
    if (!payload || !payload.exp) return false;
    return payload.exp * 1000 > Date.now();
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const logout = useCallback((reason) => {
        clearStoredAuth();
        setUser(null);
        navigate('/login', { state: { reason }, replace: true });
    }, [navigate]);

    // KhÃ´i phá»¥c session khi load láº¡i trang
    useEffect(() => {
        const stored = getStoredAuth();

        if (stored) {
            const { token, userName, empCode, deptCode, unitName, rolesStr } = stored;
            if (isTokenValid(token)) {
                let roles = [];
                try {
                    roles = rolesStr ? JSON.parse(rolesStr) : [];
                } catch (e) {
                    console.error('Failed to parse roles', e);
                }
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setUser({ token, userName, empCode, deptCode, unitName, roles });
            } else {
                // Token Ä‘Ã£ háº¿t háº¡n â†’ xÃ³a vÃ  chuyá»ƒn vá» login
                clearStoredAuth();
                navigate('/login', { state: { reason: 'expired' }, replace: true });
            }
        }
        setLoading(false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Tá»± Ä‘á»™ng logout khi token háº¿t háº¡n (kiá»ƒm tra má»—i phÃºt)
    useEffect(() => {
        if (!user) return;

        const check = () => {
            const token = getStoredToken();
            if (!token || !isTokenValid(token)) {
                logout('expired');
            }
        };

        const interval = setInterval(check, 60_000); // má»—i 60 giÃ¢y
        return () => clearInterval(interval);
    }, [user, logout]);

    const login = (data) => {
        setStoredAuth(data, data.rememberMe !== false);
        setUser({
            token: data.token,
            userName: data.userName,
            empCode: data.empCode,
            deptCode: data.deptCode,
            unitName: data.unitName || '',
            roles: data.roles || [],
        });
        navigate('/', { replace: true });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
