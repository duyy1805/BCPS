// js/detail.js
const urlParams = new URLSearchParams(window.location.search);
const reportId = urlParams.get("id");

document.addEventListener("DOMContentLoaded", () => {
    renderAppShell("list", "Chi tiet Bao cao");
    if (reportId) {
        loadDetail();
    }
});

async function loadDetail() {
    const [detailRes, actionRes] = await Promise.all([
        fetchAPI(`/reports/${reportId}`),
        fetchAPI(`/reports/${reportId}/available-actions`)
    ]);

    if (detailRes.success) {
        const data = detailRes.data || {};
        const r = data.report || {};
        window._currentReport = r; // Store globally for action functions

        document.getElementById("repNo").innerText = r.ReportNo || "--";
        document.getElementById("repTitle").innerText = `${textOrDash(r.ExceptionTypeName)} - ${textOrDash(r.ProductName)}`;
        document.getElementById("repStatus").innerHTML = STATUS_BADGE[r.StatusCode] || textOrDash(r.StatusCode);

        renderInfoTab(data);
        document.getElementById("raw-data").innerText = JSON.stringify(data, null, 2);

        const history = data.history || [];
        const historyHtml = history
            .map(
                (h) => `
                    <div class="timeline-item">
                        <div class="timeline-dot bg-blue-500"></div>
                        <div class="flex gap-2 items-center">
                            <span class="font-bold text-slate-800">${textOrDash(h.ActionName)}</span>
                            <span class="text-xs text-slate-400">${formatDate(h.ActionAt) || "--"}</span>
                        </div>
                        <div class="text-sm text-slate-600">Thực hiện bởi: ${textOrDash(h.ActionByEmpName)} (${textOrDash(h.ActionByEmpCode)})</div>
                        ${h.Note ? `<div class="text-sm text-slate-500 italic mt-1">Ghi chú: ${h.Note}</div>` : ""}
                    </div>
                `
            )
            .join("");

        document.getElementById("history-timeline").innerHTML =
            historyHtml || '<div class="text-slate-500 text-sm">Chưa có lịch sử xử lý.</div>';

        if (actionRes.success) {
            renderActionButtons(actionRes.data || {}, r);
        }
    }
}

function renderInfoTab(data) {
    const r = data.report || {};
    const impacts = data.impacts || [];
    const coordDepartments = data.coordDepartments || [];

    document.getElementById("detail-overview").innerHTML = `
        ${summaryCard("Ngay phat sinh", formatDate(r.OccurrenceTime || r.CreatedAt) || "--", "clock-3")}
        ${summaryCard("Muc do", textOrDash(r.SeverityName || r.SeverityCode), "alert-triangle")}
        ${summaryCard("Loai phat sinh", textOrDash(r.ExceptionTypeName), "list-tree")}
        ${summaryCard("Nguyen nhan", textOrDash(r.ExceptionCauseName), "circle-help")}
    `;

    document.getElementById("content-section").innerHTML = `
        ${fieldRow("Mo ta ngan", textOrDash(r.ShortDescription))}
        ${fieldRow("Mo ta chi tiet", textOrDash(r.DetailedDescription))}
        ${fieldRow("De xuat xu ly", textOrDash(r.ProposedSolution))}
        ${fieldRow("Hanh dong tam thoi", textOrDash(r.InterimAction))}
        ${fieldRow("Ket qua ky vong", textOrDash(r.ExpectedResult))}
        ${fieldRow("Han hoan thanh", formatDate(r.DueDate) || "--")}
    `;

    const coordText = coordDepartments.length
        ? coordDepartments.map((x) => x.DepartmentName || x.DepartmentCode).join(", ")
        : "--";

    document.getElementById("assignment-section").innerHTML = `
        ${fieldRow("Bo phan chiu trach nhiem", textOrDash(r.ResponsibleDeptName || r.ResponsibleDeptCode))}
        ${fieldRow("Nguoi chiu trach nhiem chinh", textOrDash(r.MainResponsibleEmpName || r.MainResponsibleEmpCode))}
        ${fieldRow("Bo phan lien quan", coordText)}
    `;

    const impactTags = impacts.length
        ? impacts
            .map(
                (x) =>
                    `<span class="inline-flex px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mr-2 mb-2">${textOrDash(
                        x.ImpactName || x.ImpactCode
                    )}</span>`
            )
            .join("")
        : '<span class="text-slate-500">--</span>';

    document.getElementById("impact-cost-section").innerHTML = `
        ${fieldRow("Co phat sinh chi phi", yesNo(r.HasCost))}
        ${fieldRow("Anh huong ERP", yesNo(r.AffectsERP))}
        ${fieldRow("So luong anh huong", textOrDash(r.AffectedQty ? `${r.AffectedQty} ${r.AffectedUom || ""}`.trim() : "--"))}
        <div>
            <div class="text-xs text-slate-500 mb-1">Impact Codes</div>
            <div>${impactTags}</div>
        </div>
    `;

    document.getElementById("erp-section").innerHTML = `
        ${fieldRow("Ma ke hoach ERP", textOrDash(r.PlanSelectKey))}
        ${fieldRow("Ma don hang", textOrDash(r.OrderCode))}
        ${fieldRow("Ma san pham", textOrDash(r.ProductCode))}
        ${fieldRow("Ten san pham", textOrDash(r.ProductName))}
        ${fieldRow("Bo phan ERP", textOrDash(r.OccurredDeptName || r.OccurredDeptCode || r.DepartmentName || r.DepartmentCode))}
    `;

    lucide.createIcons();
}

function summaryCard(label, value, icon) {
    return `
        <div class="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div class="flex items-center text-slate-500 text-xs font-semibold mb-2">
                <i data-lucide="${icon}" class="w-4 h-4 mr-1"></i>${label}
            </div>
            <div class="text-slate-800 font-bold">${value}</div>
        </div>
    `;
}

function fieldRow(label, value) {
    return `
        <div>
            <div class="text-xs text-slate-500">${label}</div>
            <div class="text-slate-800 font-medium whitespace-pre-wrap">${value}</div>
        </div>
    `;
}

function textOrDash(v) {
    if (v === undefined || v === null) return "--";
    const t = String(v).trim();
    return t ? t : "--";
}

function yesNo(v) {
    return v ? "Co" : "Khong";
}

function renderActionButtons(actions, r) {
    const div = document.getElementById("actionButtons");
    let html = "";

    // Nút Trình phản hồi (Sau khi tạo nháp)
    if (actions.CanSubmit) {
        html += `<button onclick="submitReport()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 text-sm shadow-sm transition-all flex items-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Trình Phản hồi</button>`;
    }

    // Luôn cho phép ghi phản hồi nếu đang ở bước phản hồi
    if (r.StatusCode === 'WAITING_FEEDBACK') {
        html += `<button onclick="document.getElementById('responseModal').classList.remove('hidden')" class="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 text-sm shadow-sm transition-all flex items-center gap-2"><i data-lucide="message-square" class="w-4 h-4"></i> Ghi Phản hồi</button>`;
    }

    // CHỈ hiển thị Nhập Chi phí nếu CÓ PHÁT SINH CHI PHÍ
    if (r.HasCost && (r.StatusCode === 'WAITING_FEEDBACK' || r.StatusCode === 'WAITING_APPROVAL')) {
        html += `<button onclick="document.getElementById('costModal').classList.remove('hidden')" class="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-600 text-sm shadow-sm transition-all flex items-center gap-2"><i data-lucide="dollar-sign" class="w-4 h-4"></i> Nhập Chi phí</button>`;
    }

    // Nút Trình Phê duyệt (Dành cho người tạo khi đủ phản hồi)
    if (r.StatusCode === 'WAITING_FEEDBACK' && actions.CanSubmitApproval) {
        html += `<button onclick="submitApprovalReq()" class="bg-cyan-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-cyan-700 text-sm shadow-sm transition-all flex items-center gap-2"><i data-lucide="check-square" class="w-4 h-4"></i> Trình Phê Duyệt</button>`;
    }

    // Các nút Phê Duyệt / Trả lại / Từ chối (Dành cho cấp trên)
    if (actions.CanApprove) {
        html += `
            <button onclick="approveReport('RETURNED')" class="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 text-sm shadow-sm transition-all">Trả lại</button>
            <button onclick="approveReport('REJECTED')" class="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all">Từ chối</button>
            <button onclick="approveReport('APPROVED')" class="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all">Phê duyệt</button>
        `;
    }

    // Nút Đóng Hồ Sơ (Trưởng phòng Vật tư xác nhận đóng nếu không chi phí, hoặc sau khi duyệt)
    if (actions.CanClose) {
        html += `<button onclick="closeReportAction()" class="bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-800 text-sm shadow-sm transition-all flex items-center gap-2"><i data-lucide="archive" class="w-4 h-4"></i> Xác nhận & Đóng HS</button>`;
    }

    div.innerHTML = html;
    lucide.createIcons();
}

async function submitReport() {
    const ok = await UI.confirm("Xác nhận", "Bạn có chắc chắn muốn trình phản hồi báo cáo này?");
    if (!ok) return;

    const res = await fetchAPI(`/reports/${reportId}/submit`, "POST", {});
    if (res.success) {
        UI.showToast("Trình báo cáo thành công!", "success");
        setTimeout(() => window.location.reload(), 1000);
    }
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.add("hidden"));

    const activeButton = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (activeButton) activeButton.classList.add("active");

    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
}

// --- CÁC HÀM XỬ LÝ MỚI ---

// 1. Lưu phản hồi
async function submitResponse() {
    const body = {
        departmentCode: document.getElementById('respDept').value,
        responseContent: document.getElementById('respContent').value,
        causeAssessment: document.getElementById('respCause').value,
        proposedAction: document.getElementById('respAction').value,
        hasDeptCost: document.getElementById('respHasCost').checked,
        processingResult: "Đã rà soát",
        responseStatusCode: "RESPONDED"
    };

    if (!body.departmentCode || !body.responseContent) return UI.showToast("Vui lòng nhập Mã BP và Nội dung", "warning");

    const res = await fetchAPI(`/reports/${reportId}/responses`, "POST", body);
    if (res.success) {
        UI.showToast("Ghi phản hồi thành công!", "success");
        setTimeout(() => window.location.reload(), 1000);
    }
}

// 2. Lưu chi phí
async function submitCost() {
    const body = {
        departmentCode: document.getElementById('costDept').value,
        costTypeId: Number(document.getElementById('costType').value),
        costItemDesc: document.getElementById('costDesc').value,
        qty: Number(document.getElementById('costQty').value),
        unitCost: Number(document.getElementById('costUnit').value)
    };

    if (!body.departmentCode || !body.costItemDesc) return UI.showToast("Vui lòng nhập đủ Mã BP và Mô tả", "warning");

    const res = await fetchAPI(`/reports/${reportId}/cost-lines`, "POST", body);
    if (res.success) {
        UI.showToast("Đã thêm chi phí!", "success");
        setTimeout(() => window.location.reload(), 1000);
    }
}

// 3. Trình phê duyệt
async function submitApprovalReq() {
    const confirmAsk = await UI.confirm("Xác nhận", "Xác nhận Trình Phê duyệt hồ sơ này?");
    if (!confirmAsk) return;

    const res = await fetchAPI(`/reports/${reportId}/submit-approval`, "POST", {});
    if (res.success) {
        UI.showToast("Đã trình phê duyệt thành công!", "success");
        setTimeout(() => window.location.reload(), 1000);
    } else {
        UI.showToast(res.message || "Lỗi khi trình phê duyệt", "error");
    }
}

// 4. Đóng hồ sơ
async function closeReportAction() {
    const summary = await UI.prompt("Kết luận đóng hồ sơ", "Nhập tóm tắt kết quả xử lý...");
    if (!summary) return;

    const res = await fetchAPI(`/reports/${reportId}/close`, "POST", {
        finalResultSummary: summary,
        closureNote: "Hồ sơ kết thúc từ giao diện Web."
    });

    if (res.success) {
        UI.showToast("Đã ĐÓNG hồ sơ thành công!", "success");
        setTimeout(() => window.location.reload(), 1000);
    } else {
        UI.showToast(res.message || "Lỗi đóng hồ sơ", "error");
    }
}

// 5. Cập nhật hàm approveReport
async function approveReport(decision) {
    const actionName = decision === 'RETURNED' ? 'Trả lại bổ sung' : (decision === 'REJECTED' ? 'Từ chối' : 'Phê duyệt');
    const note = await UI.prompt(`Xác nhận ${actionName}`, `Nhập ghi chú cho hành động [${actionName}]...`, (decision !== "APPROVED"));

    if (decision !== "APPROVED" && !note) return; // Prompt already handles validation

    const res = await fetchAPI(`/reports/${reportId}/approval-decision`, "POST", {
        decisionCode: decision,
        decisionComment: note || "Phê duyệt hồ sơ"
    });

    if (res.success) {
        UI.showToast(`Thao tác ${actionName} thành công!`, "success");
        setTimeout(() => window.location.reload(), 1000);
    }
}