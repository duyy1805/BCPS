function renderAppShell(activeMenuId, pageTitle) {
    const userName = localStorage.getItem("user_name") || "Guest";

    // 1. Render Sidebar
    const sidebarHtml = `
        <div class="w-64 bg-slate-900 flex flex-col h-screen fixed left-0 top-0 text-slate-300 font-medium z-50">
            <div class="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 text-white font-bold text-lg">
                <i data-lucide="alert-triangle" class="w-6 h-6 mr-2 text-blue-500"></i> BCPS SYSTEM
            </div>
            <div class="flex-1 py-6 overflow-y-auto">
                <div class="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Trang chủ</div>
                <a href="index.html" class="nav-item ${activeMenuId === 'dashboard' ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : ''} w-full flex items-center px-6 py-3 hover:bg-slate-800">
                    <i data-lucide="layout-dashboard" class="w-5 h-5 mr-3"></i> Dashboard
                </a>
                
                <div class="px-4 mt-6 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nghiệp vụ</div>
                <a href="list.html" class="nav-item ${activeMenuId === 'list' ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : ''} w-full flex items-center px-6 py-3 hover:bg-slate-800">
                    <i data-lucide="list" class="w-5 h-5 mr-3"></i> Danh sách báo cáo
                </a>
                <a href="create.html" class="nav-item ${activeMenuId === 'create' ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500' : ''} w-full flex items-center px-6 py-3 hover:bg-slate-800">
                    <i data-lucide="plus-circle" class="w-5 h-5 mr-3"></i> Tạo mới báo cáo
                </a>
            </div>
        </div>
    `;

    // 2. Render Header
    const headerHtml = `
        <div class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
            <div class="flex items-center text-slate-500 text-sm font-medium">
                <span class="text-slate-400">Hệ thống</span>
                <i data-lucide="chevron-right" class="w-4 h-4 mx-2 text-slate-300"></i>
                <span class="text-slate-800 font-bold">${pageTitle}</span>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-sm font-medium text-slate-700">Xin chào, <span class="text-blue-600">${userName}</span></div>
                <div class="h-8 w-px bg-slate-200"></div>
                <button onclick="localStorage.clear(); window.location.href='login.html'" class="text-red-500 hover:text-red-700 text-sm font-bold flex items-center">
                    <i data-lucide="log-out" class="w-4 h-4 mr-1"></i> Thoát
                </button>
            </div>
        </div>
    `;

    document.getElementById("sidebar-container").innerHTML = sidebarHtml;
    document.getElementById("header-container").innerHTML = headerHtml;
    lucide.createIcons();
}

const STATUS_BADGE = {
    'DRAFT': '<span class="bg-slate-100 text-slate-700 border px-2 py-1 rounded-full text-xs font-bold">Nháp</span>',
    'WAITING_FEEDBACK': '<span class="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-full text-xs font-bold">Chờ phản hồi</span>',
    'WAITING_APPROVAL': '<span class="bg-cyan-100 text-cyan-700 border border-cyan-200 px-2 py-1 rounded-full text-xs font-bold">Chờ phê duyệt</span>',
    'APPROVED': '<span class="bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full text-xs font-bold">Đã duyệt</span>',
    'REJECTED': '<span class="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-full text-xs font-bold">Từ chối</span>',
    'CLOSED': '<span class="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full text-xs font-bold">Đã đóng</span>'
};