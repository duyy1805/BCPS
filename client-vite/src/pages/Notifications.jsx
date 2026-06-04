import React, { useEffect, useState } from "react";
import { Bell, CheckCheck, Circle, Filter, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { formatDate } from "../utils/api";
import { useNotifications } from "../context/NotificationContext";
import { cn } from "../context/UIContext";

export default function Notifications() {
    const navigate = useNavigate();
    const { markRead, markAllRead, refreshNotifications } = useNotifications();
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState({ totalRows: 0, totalPages: 0 });
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/notifications?unreadOnly=${unreadOnly}&pageNumber=1&pageSize=50`);
            if (data.success) {
                setItems(data.data.items || []);
                setMeta(data.data.meta || { totalRows: 0, totalPages: 0 });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unreadOnly]);

    const openNotification = async (item) => {
        if (!item.IsRead) {
            await markRead(item.NotificationID);
        }
        navigate(item.LinkUrl || `/reports/${item.ReportID}`);
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        await loadData();
        await refreshNotifications();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-5 animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Bell className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800">Thông báo</h1>
                        <p className="text-sm text-slate-500 font-medium">{meta.totalRows} thông báo</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setUnreadOnly((prev) => !prev)}
                        className={cn(
                            "px-4 py-2 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all",
                            unreadOnly
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Chưa đọc
                    </button>
                    <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Đánh dấu đã đọc
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-500" />
                        Đang tải thông báo...
                    </div>
                ) : items.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {items.map((item) => (
                            <button
                                key={item.NotificationID}
                                type="button"
                                onClick={() => openNotification(item)}
                                className={cn(
                                    "w-full text-left p-4 md:p-5 flex gap-3 hover:bg-slate-50 transition-colors",
                                    !item.IsRead && "bg-blue-50/40"
                                )}
                            >
                                <div className={cn(
                                    "mt-1 w-2.5 h-2.5 rounded-full shrink-0",
                                    item.IsRead ? "bg-slate-200" : "bg-blue-600"
                                )} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <h2 className="font-black text-slate-800 text-sm md:text-base">
                                            {item.Title}
                                        </h2>
                                        {!item.IsRead && <Circle className="w-3 h-3 fill-blue-600 text-blue-600 shrink-0 mt-1" />}
                                    </div>
                                    {item.Body && (
                                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                            {item.Body}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-400 mt-2 font-bold">
                                        {formatDate(item.CreatedAt)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-500 font-medium">
                        Không có thông báo nào.
                    </div>
                )}
            </div>
        </div>
    );
}
