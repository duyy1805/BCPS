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
                        <div class="text-sm text-slate-600">Thuc hien boi: ${textOrDash(h.ActionByEmpName)} (${textOrDash(h.ActionByEmpCode)})</div>
                        ${h.Note ? `<div class="text-sm text-slate-500 italic mt-1">Ghi chu: ${h.Note}</div>` : ""}
                    </div>
                `
            )
            .join("");

        document.getElementById("history-timeline").innerHTML =
            historyHtml || '<div class="text-slate-500 text-sm">Chua co lich su xu ly.</div>';
    }

    if (actionRes.success) {
        renderActionButtons(actionRes.data || {});
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

function renderActionButtons(actions) {
    const div = document.getElementById("actionButtons");
    let html = "";

    if (actions.CanSubmit) {
        html += `<button onclick="submitReport()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Trinh Phan Hoi</button>`;
    }
    if (actions.CanApprove) {
        html += `
            <button onclick="approveReport('REJECTED')" class="bg-red-50 text-red-600 border border-red-200 px-6 py-2 rounded-lg font-bold">Tu choi</button>
            <button onclick="approveReport('APPROVED')" class="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">Phe duyet</button>
        `;
    }

    div.innerHTML = html;
}

async function submitReport() {
    const res = await fetchAPI(`/reports/${reportId}/submit`, "POST", {});
    if (res.success) {
        alert("Trinh thanh cong!");
        window.location.reload();
    }
}

async function approveReport(decision) {
    const note = prompt("Nhap ghi chu phe duyet (Bat buoc neu tu choi):");
    if (decision === "REJECTED" && !note) return alert("Phai nhap ly do tu choi!");

    const res = await fetchAPI(`/reports/${reportId}/approval-decision`, "POST", {
        decisionCode: decision,
        decisionComment: note
    });

    if (res.success) {
        alert("Thao tac thanh cong!");
        window.location.reload();
    }
}

function switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.add("hidden"));

    const activeButton = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (activeButton) activeButton.classList.add("active");

    document.getElementById(`tab-${tabId}`).classList.remove("hidden");
}
