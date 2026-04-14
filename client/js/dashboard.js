// Biến lưu trữ biểu đồ để hủy (destroy) khi vẽ lại
let trendChartInstance = null;
let statusChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    // Gọi hàm từ layout.js để vẽ Sidebar và Header chung
    renderAppShell('dashboard', 'Dashboard Tổng Quan');

    // Set mặc định thời gian từ đầu tháng đến hiện tại
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const today = date.toISOString().split('T')[0];

    document.getElementById('filterFrom').value = firstDay;
    document.getElementById('filterTo').value = today;

    // Load dữ liệu
    loadDashboard();
});

async function loadDashboard() {
    const fromDate = document.getElementById('filterFrom').value;
    const toDate = document.getElementById('filterTo').value;

    let query = `?`;
    if (fromDate) query += `fromDate=${fromDate}&`;
    if (toDate) query += `toDate=${toDate}`;

    // Gọi API thật từ Server Node.js
    const res = await fetchAPI(`/dashboard/management${query}`);

    if (res.success && res.data) {
        const { summary, statusBreakdown, trendByDay, topOccurredDepartments, overdueItems } = res.data;

        renderKPI(summary);
        renderTrendChart(trendByDay);
        renderStatusChart(statusBreakdown);
        renderTopDepts(topOccurredDepartments);
        renderOverdue(overdueItems);
    } else {
        document.getElementById('kpi-container').innerHTML = `<div class="col-span-4 text-center text-red-500 py-4">${res.message || 'Lỗi lấy dữ liệu'}</div>`;
    }
}

function renderKPI(summary) {
    if (!summary) return;

    const html = `
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <div class="text-slate-500 text-sm font-bold mb-1">Tổng báo cáo</div>
            <div class="text-3xl font-extrabold text-slate-800">${summary.TotalReports || 0}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
            <div class="text-slate-500 text-sm font-bold mb-1">Chờ phản hồi / phê duyệt</div>
            <div class="text-3xl font-extrabold text-slate-800">
                ${(summary.WaitingFeedbackCount || 0) + (summary.WaitingApprovalCount || 0)}
            </div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
            <div class="text-slate-500 text-sm font-bold mb-1">Quá hạn xử lý</div>
            <div class="text-3xl font-extrabold text-red-600">${summary.OverdueOpenCount || 0}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <div class="text-slate-500 text-sm font-bold mb-1">Tổng chi phí dự tính</div>
            <div class="text-3xl font-extrabold text-emerald-600 truncate" title="${summary.TotalEstimatedCost || 0}">
                ${formatMoney(summary.TotalEstimatedCost || 0)}
            </div>
        </div>
    `;
    document.getElementById('kpi-container').innerHTML = html;
}

function renderTopDepts(depts) {
    const tbody = document.getElementById('top-dept-body');
    if (!depts || depts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>`;
        return;
    }

    tbody.innerHTML = depts.map(d => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-medium text-slate-700">${d.OccurredDepartmentName || d.OccurredDepartmentCode}</td>
            <td class="p-3 text-center font-bold">${d.ReportCount}</td>
            <td class="p-3 text-right font-medium text-red-600">${formatMoney(d.TotalEstimatedCost)}</td>
        </tr>
    `).join('');
}

function renderOverdue(items) {
    const tbody = document.getElementById('overdue-body');
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-green-600 font-medium">Tuyệt vời! Không có báo cáo nào quá hạn.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr class="hover:bg-red-50/50 cursor-pointer" onclick="window.location.href='detail.html?id=${item.ReportID}'">
            <td class="p-3 font-bold text-blue-600 hover:underline">${item.ReportNo}</td>
            <td class="p-3 text-slate-700">${item.MainResponsibleEmpName || 'N/A'}</td>
            <td class="p-3 text-right font-bold text-red-600">${item.OverdueDays} ngày</td>
        </tr>
    `).join('');
}

function renderTrendChart(trendData) {
    if (trendChartInstance) trendChartInstance.destroy();

    const ctx = document.getElementById('trendChart');
    if (!ctx || !trendData) return;

    const labels = trendData.map(d => formatDate(d.ReportDate).split(' ')[1] || d.ReportDate.substring(5, 10)); // Lấy MM-DD
    const dataHasCost = trendData.map(d => d.HasCostCount);
    const dataNoCost = trendData.map(d => d.ReportCount - d.HasCostCount);

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Không chi phí', data: dataNoCost, borderColor: '#3b82f6', tension: 0.3, borderWidth: 3 },
                { label: 'Có chi phí', data: dataHasCost, borderColor: '#ef4444', tension: 0.3, borderWidth: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderStatusChart(statusData) {
    if (statusChartInstance) statusChartInstance.destroy();

    const ctx = document.getElementById('statusChart');
    if (!ctx || !statusData) return;

    // Map màu tương ứng với trạng thái
    const bgColors = statusData.map(d => {
        if (d.StatusCode === 'DRAFT') return '#94a3b8';
        if (d.StatusCode === 'WAITING_FEEDBACK') return '#f97316';
        if (d.StatusCode === 'WAITING_APPROVAL') return '#06b6d4';
        if (d.StatusCode === 'APPROVED') return '#22c55e';
        if (d.StatusCode === 'PROCESSING') return '#3b82f6';
        if (d.StatusCode === 'CLOSED') return '#10b981';
        if (d.StatusCode === 'REJECTED') return '#ef4444';
        return '#cbd5e1';
    });

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: statusData.map(d => d.StatusName || d.StatusCode),
            datasets: [{
                data: statusData.map(d => d.ReportCount),
                backgroundColor: bgColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } },
            cutout: '60%'
        }
    });
}