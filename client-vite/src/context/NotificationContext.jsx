/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import api from "../utils/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [latest, setLatest] = useState([]);
    const [loading, setLoading] = useState(false);

    const refreshNotifications = useCallback(async () => {
        if (!user) {
            setUnreadCount(0);
            setLatest([]);
            return;
        }

        setLoading(true);
        try {
            const [countRes, latestRes] = await Promise.all([
                api.get("/notifications/unread-count"),
                api.get("/notifications?pageNumber=1&pageSize=8")
            ]);

            if (countRes.data.success) {
                setUnreadCount(countRes.data.data.unreadCount || 0);
            }
            if (latestRes.data.success) {
                setLatest(latestRes.data.data.items || []);
            }
        } catch (err) {
            console.warn("Could not load notifications:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markRead = useCallback(async (notificationId) => {
        await api.post(`/notifications/${notificationId}/read`);
        await refreshNotifications();
    }, [refreshNotifications]);

    const markAllRead = useCallback(async () => {
        await api.post("/notifications/read-all");
        await refreshNotifications();
    }, [refreshNotifications]);

    useEffect(() => {
        refreshNotifications();
    }, [refreshNotifications]);

    useEffect(() => {
        if (!user) return undefined;
        const interval = setInterval(refreshNotifications, 60_000);
        return () => clearInterval(interval);
    }, [user, refreshNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                unreadCount,
                latest,
                loading,
                refreshNotifications,
                markRead,
                markAllRead
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
