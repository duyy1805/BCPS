import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, List, PlusCircle, AlertTriangle, LogOut, ChevronRight, Menu, ChevronLeft } from 'lucide-react';
import { cn } from '../context/UIContext';

export default function MainLayout() {
    const { user, logout, loading } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    if (loading) return null;
    if (!user) return <Navigate to="/login" />;

    const navItems = [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard, category: 'Trang chủ' },
        { path: '/reports', label: 'Danh sách báo cáo', icon: List, category: 'Nghiệp vụ' },
        { path: '/reports/create', label: 'Tạo mới báo cáo', icon: PlusCircle, category: null }
    ];

    const getPageTitle = () => {
        if (location.pathname === '/') return 'Dashboard';
        if (location.pathname === '/reports') return 'Danh sách báo cáo';
        if (location.pathname === '/reports/create') return 'Tạo mới báo cáo';
        if (location.pathname.startsWith('/reports/')) return 'Chi tiết báo cáo';
        return 'Hệ thống';
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-800">
            {/* Sidebar */}
            <div className={cn(
                "bg-slate-900 flex flex-col h-screen fixed left-0 top-0 text-slate-300 font-medium z-50 shadow-xl transition-all duration-300 ease-in-out",
                isCollapsed ? "w-20" : "w-64"
            )}>
                <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 text-white font-bold text-lg gap-2 overflow-hidden">
                    <div className="flex items-center min-w-max gap-3">
                        <AlertTriangle className="w-8 h-8 text-blue-500 shrink-0" /> 
                        {!isCollapsed && <span className="animate-in fade-in slide-in-from-left-4 duration-500">BCPS SYSTEM</span>}
                    </div>
                </div>
                
                <div className="flex-1 py-6 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {navItems.map((item, idx) => {
                        const isActive = location.pathname === item.path || 
                                         (item.path === '/reports' && location.pathname.startsWith('/reports') && location.pathname !== '/reports/create');
                        
                        return (
                            <React.Fragment key={item.path}>
                                {item.category && !isCollapsed && (
                                    <div className={cn("px-6 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider animate-in fade-in duration-500", idx !== 0 && "mt-8")}>
                                        {item.category}
                                    </div>
                                )}
                                {item.category && isCollapsed && idx !== 0 && <div className="mx-4 my-4 border-t border-slate-800" />}
                                
                                <Link 
                                    to={item.path} 
                                    title={isCollapsed ? item.label : ""}
                                    className={cn(
                                        "w-full flex items-center transition-all duration-200 group relative",
                                        isCollapsed ? "justify-center py-4 px-0" : "px-6 py-3",
                                        isActive 
                                            ? "bg-blue-600/15 text-blue-400" 
                                            : "hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <div className={cn(
                                        "absolute inset-y-0 right-0 w-1 transition-all duration-300",
                                        isActive ? "bg-blue-500" : "bg-transparent group-hover:bg-slate-700"
                                    )} />
                                    
                                    <item.icon className={cn("w-5 h-5 shrink-0 transition-transform duration-300", !isCollapsed && "mr-3", isCollapsed && isActive && "scale-110")} />
                                    {!isCollapsed && <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                                    
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60] whitespace-nowrap shadow-lg border border-slate-700">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
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
                "flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out",
                isCollapsed ? "pl-20" : "pl-64"
            )}>
                {/* Header */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40 transition-all shadow-sm shadow-slate-100/50">
                    <div className="flex items-center text-slate-500 text-sm font-medium">
                        <span className="text-slate-400">Hệ thống</span>
                        <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
                        <span className="text-slate-800 font-bold bg-slate-100 px-3 py-1 rounded-md">{getPageTitle()}</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="text-sm font-medium text-slate-600 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                            Xin chào, <span className="text-blue-600 font-bold ml-1">{user.userName}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200"></div>
                        <button 
                            onClick={logout} 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center transition-colors"
                        >
                            <LogOut className="w-4 h-4 mr-1.5" /> Thoát
                        </button>
                    </div>
                </header>

                {/* Outlet */}
                <main className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
