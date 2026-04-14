// js/list.js
document.addEventListener("DOMContentLoaded", () => {
    renderAppShell('list', 'Danh sách báo cáo phát sinh');
    loadList();
});

async function loadList() {
    const kw = document.getElementById('kw').value;
    const status = document.getElementById('status').value;
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center">Đang tải dữ liệu...</td></tr>`;

    const res = await fetchAPI(`/reports?pageNumber=1&pageSize=50&keyword=${encodeURIComponent(kw)}&statusCode=${status}`);

    if (res.success && res.data.items.length > 0) {
        tbody.innerHTML = res.data.items.map(r => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-4"><div class="font-bold text-slate-800">${r.ReportNo}</div><div class="text-xs text-slate-500">${formatDate(r.CreatedAt)}</div></td>
                <td class="p-4"><div class="font-medium text-slate-700">${r.OrderCode || 'N/A'}</div><div class="text-xs text-slate-500 truncate max-w-[200px]">${r.ProductName || ''}</div></td>
                <td class="p-4 font-medium text-slate-800">${r.ExceptionTypeName}</td>
                <td class="p-4">${r.ResponsibleDeptName || r.ResponsibleDeptCode}</td>
                <td class="p-4 text-right font-bold text-red-600">${r.HasCost ? formatMoney(r.EstimatedTotalCost) : '-'}</td>
                <td class="p-4 text-center">${STATUS_BADGE[r.StatusCode] || r.StatusCode}</td>
                <td class="p-4 text-center">
                    <a href="detail.html?id=${r.ReportID}" class="text-blue-600 font-bold hover:underline">Xem hồ sơ</a>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-500">Không tìm thấy báo cáo nào.</td></tr>`;
    }
}