import React from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, List, PlusCircle, AlertTriangle, LogOut, ChevronRight, Menu, ChevronLeft, Bell, UserCircle, MoreHorizontal, MessageCircle, ClipboardCheck, CheckCircle2, XCircle, RotateCcw, Archive } from 'lucide-react';
import { cn } from '../context/UIContext';
import { useNotifications } from '../context/NotificationContext';
import { formatDate } from '../utils/api';

export default function MainLayout() {
    const { user, logout, loading } = useAuth();
    const { unreadCount, latest, markRead, markAllRead } = useNotifications();
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
    const [notificationFilter, setNotificationFilter] = React.useState("all");
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const notificationRef = React.useRef(null);
    const userMenuRef = React.useRef(null);

    // Close mobile menu on route change
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    React.useEffect(() => {
        function handleClickOutside(event) {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setIsNotificationOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (loading) return null;
    if (!user) return <Navigate to="/login" />;

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, category: 'Trang chủ' },
        { path: '/reports', label: 'Danh sách báo cáo', icon: List, category: 'Nghiệp vụ' },
        { path: '/reports/create', label: 'Tạo mới báo cáo', icon: PlusCircle, category: null }
    ];

    const mobileNavItems = [
        { path: '/', label: 'Trang chủ', icon: LayoutDashboard },
        { path: '/reports', label: 'Báo cáo', icon: List },
        { path: '/reports/create', label: 'Tạo mới', icon: PlusCircle },
    ];

    const getPageTitle = () => {
        if (location.pathname === '/') return 'Dashboard';
        if (location.pathname === '/reports') return 'Danh sách báo cáo';
        if (location.pathname === '/reports/create') return 'Tạo mới báo cáo';
        if (location.pathname.startsWith('/reports/')) return 'Chi tiết báo cáo';
        if (location.pathname === '/notifications') return 'Thông báo';
        return 'Hệ thống';
    };

    const openNotification = async (item) => {
        if (!item.IsRead) {
            await markRead(item.NotificationID);
        }
        setIsNotificationOpen(false);
        navigate(item.LinkUrl || `/reports/${item.ReportID}`);
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        setIsNotificationOpen(false);
    };

    const visibleNotifications = notificationFilter === "unread"
        ? latest.filter((item) => !item.IsRead)
        : latest;

    const getNotificationIcon = (typeCode) => {
        if (typeCode?.includes("REJECTED")) return XCircle;
        if (typeCode?.includes("RETURNED")) return RotateCcw;
        if (typeCode?.includes("CLOSED")) return Archive;
        if (typeCode?.includes("APPROVED")) return CheckCircle2;
        if (typeCode?.includes("FEEDBACK") || typeCode?.includes("RESPONSE")) return MessageCircle;
        return ClipboardCheck;
    };

    return (
        <div className="flex h-screen min-w-0 overflow-hidden bg-slate-50 text-slate-800">
            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-45 md:hidden transition-opacity duration-300 animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "bg-slate-900 flex flex-col h-screen fixed left-0 top-0 text-slate-300 font-medium z-50 shadow-xl transition-all duration-300 ease-in-out md:translate-x-0",
                isCollapsed ? "md:w-20" : "md:w-64",
                isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"
            )}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 text-white font-bold text-lg gap-2 overflow-hidden shrink-0">
                    <div className="flex items-center min-w-max gap-3">
                        <AlertTriangle className="w-8 h-8 text-blue-500 shrink-0" />
                        {(!isCollapsed || isMobileMenuOpen) && <span className="animate-in fade-in slide-in-from-left-4 duration-500">BCPS SYSTEM</span>}
                    </div>
                </div>

                <div className="flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {navItems.map((item, idx) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/reports' && location.pathname.startsWith('/reports') && location.pathname !== '/reports/create');

                        const showLabel = !isCollapsed || isMobileMenuOpen;

                        return (
                            <React.Fragment key={item.path}>
                                {item.category && showLabel && (
                                    <div className={cn("px-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider animate-in fade-in duration-500", idx !== 0 && "mt-8")}>
                                        {item.category}
                                    </div>
                                )}
                                {item.category && !showLabel && idx !== 0 && <div className="mx-4 my-4 border-t border-slate-800" />}

                                <Link
                                    to={item.path}
                                    title={!showLabel ? item.label : ""}
                                    className={cn(
                                        "w-full flex items-center transition-all duration-200 group relative",
                                        !showLabel ? "justify-center py-4 px-0" : "px-6 py-3",
                                        isActive
                                            ? "bg-blue-600/15 text-blue-400"
                                            : "hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute inset-y-0 right-0 w-1 transition-all duration-300",
                                        isActive ? "bg-blue-500" : "bg-transparent group-hover:bg-slate-700"
                                    )} />

                                    <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300", showLabel && "mr-3", !showLabel && isActive && "scale-110")} />
                                    {showLabel && <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}

                                    {!showLabel && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-60 whitespace-nowrap shadow-lg border border-slate-700">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50 hidden md:block">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 shadow-inner"
                    >
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 min-w-0 flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out",
                "md:pl-0", // Default pl-0, logic handle below
                isCollapsed ? "md:pl-20" : "md:pl-64"
            )}>
                {/* Header */}
                <header className="min-h-14 md:h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between gap-2 px-3 sm:px-4 md:px-8 sticky top-0 z-40 transition-all shadow-sm shadow-slate-100/50">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors" aria-label="Mở menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex min-w-0 items-center text-slate-500 text-sm font-medium">
                            <span className="text-slate-400 hidden sm:inline">Hệ thống</span>
                            <ChevronRight className="w-4 h-4 mx-2 text-slate-300 hidden sm:inline" />
                            <span className="min-w-0 max-w-[52vw] truncate rounded-md bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-800 sm:max-w-none sm:px-3">{getPageTitle()}</span>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 md:gap-5">
                        <div className="relative" ref={notificationRef}>
                            <button
                                type="button"
                                onClick={() => setIsNotificationOpen((prev) => !prev)}
                                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Thông báo"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="fixed left-3 right-3 top-16 z-60 max-h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 md:absolute md:left-auto md:right-0 md:top-auto md:mt-3 md:w-[calc(100vw-2rem)] md:max-w-110">
                                    <div className="px-4 pt-4 pb-3 md:px-5 md:pt-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">
                                                Thông báo
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={handleMarkAllRead}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                                                title="Đánh dấu tất cả đã đọc"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNotificationFilter("all")}
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-black transition-colors",
                                                    notificationFilter === "all"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                Tất cả
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNotificationFilter("unread")}
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-sm font-black transition-colors",
                                                    notificationFilter === "unread"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-100"
                                                )}
                                            >
                                                Chưa đọc
                                            </button>
                                        </div>
                                    </div>

                                    <div className="px-4 md:px-5 pb-2 flex items-center justify-between">
                                        <div className="text-lg font-black text-slate-800">Trước đó</div>
                                        <Link
                                            to="/notifications"
                                            onClick={() => setIsNotificationOpen(false)}
                                            className="text-sm font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            Xem tất cả
                                        </Link>
                                    </div>

                                    <div className="max-h-[calc(100vh-13rem)] md:max-h-[70vh] overflow-y-auto custom-scrollbar px-2 pb-3">
                                        {visibleNotifications.length > 0 ? visibleNotifications.map((item) => {
                                            const Icon = getNotificationIcon(item.TypeCode);

                                            return (
                                                <button
                                                    key={item.NotificationID}
                                                    type="button"
                                                    onClick={() => openNotification(item)}
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-100 rounded-xl transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="relative shrink-0">
                                                            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                                <UserCircle className="w-9 h-9 md:w-12 md:h-12 text-slate-400" />
                                                            </div>
                                                            <div className="absolute -right-1 -bottom-1 w-6 h-6 md:w-7 md:h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white">
                                                                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                            </div>
                                                        </div>

                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <div className={cn(
                                                                "text-sm md:text-[15px] leading-snug text-slate-700",
                                                                !item.IsRead && "font-black text-slate-900"
                                                            )}>
                                                                {item.Title}
                                                            </div>
                                                            {item.Body && (
                                                                <div className="text-xs md:text-sm leading-snug text-slate-500 mt-0.5 line-clamp-2">
                                                                    {item.Body}
                                                                </div>
                                                            )}
                                                            <div className={cn(
                                                                "text-xs mt-1 font-bold",
                                                                item.IsRead ? "text-slate-400" : "text-blue-600"
                                                            )}>
                                                                {formatDate(item.CreatedAt)}
                                                            </div>
                                                        </div>

                                                        {!item.IsRead && (
                                                            <div className="w-3 h-3 rounded-full bg-blue-600 mt-6 shrink-0" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        }) : (
                                            <div className="p-8 text-center text-sm text-slate-400 font-medium">
                                                Không có thông báo.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="relative" ref={userMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                                className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center"
                                title={user.userName}
                            >
                                <UserCircle className="w-6 h-6" />
                            </button>

                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-3 w-[calc(100vw-1.5rem)] max-w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-60 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/70">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                                            Tài khoản
                                        </div>
                                        <div className="font-black text-slate-800 truncate">
                                            {user.userName}
                                        </div>
                                        {user.unitName && (
                                            <div className="text-xs text-slate-500 mt-1 truncate">
                                                {user.unitName}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsUserMenuOpen(false);
                                            logout();
                                        }}
                                        className="w-full px-4 py-3 text-left text-sm font-black text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="hidden text-sm font-medium text-slate-600 bg-slate-50 px-3 md:px-4 py-1.5 rounded-full border border-slate-100 items-center">
                            <span className="hidden sm:inline opacity-70 mr-1">Xin chào,</span>
                            <span className="text-blue-600 font-bold truncate max-w-20 md:max-w-none">{user.userName}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden xs:block"></div>
                        <button
                            onClick={logout}
                            className="hidden text-red-500 hover:text-red-600 hover:bg-red-50 p-2 md:px-3 md:py-1.5 rounded-lg text-sm font-bold items-center transition-colors"
                            title="Thoát"
                        >
                            <LogOut className="w-4 h-4 md:mr-1.5" />
                            <span className="hidden md:inline">Thoát</span>
                        </button>
                    </div>
                </header>

                {/* Outlet */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-24 sm:p-4 sm:pb-24 md:p-8 md:pb-8 scroll-smooth custom-scrollbar bg-slate-50">
                    <Outlet />
                </main>
            </div>

            <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-[0_-8px_28px_rgba(15,23,42,0.10)] backdrop-blur md:hidden" aria-label="Điều hướng chính">
                <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
                    {mobileNavItems.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/reports' && location.pathname.startsWith('/reports') && location.pathname !== '/reports/create');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex min-h-13 flex-col items-center justify-center rounded-2xl px-2 py-1.5 text-[11px] font-black transition-all active:scale-95",
                                    isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                )}
                            >
                                <Icon className="mb-0.5 h-5 w-5" />
                                <span className="max-w-full truncate leading-tight">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
