// js/create.js
let erpPlans = [];

function escapeHtml(text) {
    return String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderMultiCheckbox(containerId, items, valueSelector, labelSelector, className) {
    const box = document.getElementById(containerId);
    if (!box) return;

    if (!Array.isArray(items) || items.length === 0) {
        box.innerHTML = '<div class="text-sm text-slate-500">Khong co du lieu.</div>';
        return;
    }

    box.innerHTML = items
        .map((item) => {
            const value = String(valueSelector(item) || "").trim();
            const label = String(labelSelector(item) || value).trim();
            if (!value) return "";

            return `
                <label class="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" class="${className} rounded border-slate-300" value="${escapeHtml(value)}" />
                    <span>${escapeHtml(label)}</span>
                </label>
            `;
        })
        .join("");
}

function getCheckedCsv(selector) {
    const values = Array.from(document.querySelectorAll(selector))
        .filter((el) => el.checked)
        .map((el) => String(el.value || "").trim())
        .filter(Boolean);

    return values.length ? values.join(",") : null;
}

document.addEventListener("DOMContentLoaded", async () => {
    renderAppShell("create", "Tao moi bao cao phat sinh");

    const res = await fetchAPI("/report-form/master-data");
    if (res.success) {
        const d = res.data;

        document.getElementById("typeId").innerHTML = d.exceptionTypes
            .map((x) => `<option value="${x.ExceptionTypeID}">${x.ExceptionTypeName}</option>`)
            .join("");

        document.getElementById("causeId").innerHTML = d.exceptionCauses
            .map((x) => `<option value="${x.ExceptionCauseID}">${x.ExceptionCauseName}</option>`)
            .join("");

        document.getElementById("deptCode").innerHTML = d.departments
            .map((x) => `<option value="${x.DepartmentCode}">${x.DepartmentName}</option>`)
            .join("");

        renderMultiCheckbox(
            "impactCodesBox",
            d.impactTypes || [],
            (x) => x.ImpactCode || x.Code || x.Value || x.ID,
            (x) => x.ImpactName || x.ImpactTypeName || x.Name || x.Description || x.ImpactCode || x.Code,
            "impact-code-checkbox"
        );

        renderMultiCheckbox(
            "coordDepartmentsBox",
            d.departments || [],
            (x) => x.DepartmentCode,
            (x) => `${x.DepartmentCode} - ${x.DepartmentName}`,
            "coord-dept-checkbox"
        );
    }
});

async function searchERP() {
    const kw = document.getElementById("erpSearch").value;
    const res = await fetchAPI(`/erp/production-plans/search?keyword=${encodeURIComponent(kw)}&topN=200`);

    if (res.success && res.data.items.length > 0) {
        erpPlans = res.data.items;
        const select = document.getElementById("erpSelect");
        select.innerHTML =
            `<option value="">-- Chọn một dòng kế hoạch --</option>` +
            erpPlans.map((p) => `<option value="${p.PlanSelectKey}">${p.DisplayText}</option>`).join("");
        select.classList.remove("hidden");
    } else {
        UI.showToast("Không tìm thấy kế hoạch ERP nào phù hợp!", "warning");
    }
}

function onSelectERP() {
    const key = document.getElementById("erpSelect").value;
    if (!key) return;

    const p = erpPlans.find((x) => x.PlanSelectKey === key);
    if (!p) return;

    const box = document.getElementById("erpDataBox");
    box.classList.remove("hidden");
    box.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <div><div class="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Mã Đơn Hàng</div><div class="font-bold text-slate-900">${escapeHtml(p.OrderCode)}</div></div>
            <div><div class="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Sản phẩm</div><div class="font-bold text-slate-900">${escapeHtml(p.ProductName)}</div></div>
            <div><div class="text-xs text-slate-500 mb-1 uppercase tracking-wider font-bold">Bộ phận ERP</div><div class="font-bold text-slate-900">${escapeHtml(p.DepartmentName)}</div></div>
        </div>
    `;

    document.getElementById("formSection").classList.remove("opacity-50", "pointer-events-none");
    document.getElementById("costSection").classList.remove("opacity-50", "pointer-events-none");
}

function toggleCost() {
    const isCost = document.getElementById("hasCost").checked;
    const alertBox = document.getElementById("costAlert");

    if (isCost) {
        alertBox.className = "p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-sm font-medium mt-4";
        alertBox.innerHTML = "<i data-lucide='alert-circle' class='w-4 h-4 inline-block mb-0.5 mr-1'></i> Báo cáo CÓ CHI PHÍ tài chính sẽ do BAN GIÁM ĐỐC phê duyệt.";
    } else {
        alertBox.className = "p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg text-sm font-medium mt-4";
        alertBox.innerHTML = "<i data-lucide='info' class='w-4 h-4 inline-block mb-0.5 mr-1'></i> Báo cáo KHÔNG chi phí sẽ được Trưởng phòng Vật tư duyệt.";
    }

    lucide.createIcons();
}

async function submitDraft() {
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";

    const planSelectKey = getVal("erpSelect");
    const shortDesc = getVal("shortDesc");
    const solution = getVal("solution");
    const responsibleDeptCode = getVal("deptCode");
    const mainResponsibleEmpCode = getVal("empCode").toUpperCase();
    const impactCodesCsv = getCheckedCsv(".impact-code-checkbox");
    const coordDepartmentCodesCsv = getCheckedCsv(".coord-dept-checkbox");

    if (!planSelectKey) return UI.showToast("Vui lòng chọn kế hoạch ERP.", "warning");
    if (!shortDesc) return UI.showToast("Vui lòng nhập mô tả ngắn.", "warning");
    if (!solution) return UI.showToast("Vui lòng nhập đề xuất xử lý.", "warning");
    if (!responsibleDeptCode) return UI.showToast("Vui lòng chọn bộ phận chịu trách nhiệm.", "warning");
    if (!mainResponsibleEmpCode) return UI.showToast("Vui lòng nhập mã người chịu trách nhiệm chính.", "warning");
    if (!impactCodesCsv) return UI.showToast("Vui lòng chọn ít nhất 1 ImpactCode.", "warning");
    if (!coordDepartmentCodesCsv) return UI.showToast("Vui lòng chọn ít nhất 1 bộ phận liên quan.", "warning");

    const body = {
        reportId: null,
        planSelectKey,
        occurrenceTime: new Date().toISOString(),
        exceptionTypeId: Number(getVal("typeId")),
        exceptionCauseId: Number(getVal("causeId")),
        severityCode: "HIGH",
        shortDescription: shortDesc,
        detailedDescription: shortDesc,
        affectedQty: null,
        affectedUom: null,
        responsibleDeptCode,
        mainResponsibleEmpCode,
        proposedSolution: solution,
        interimAction: null,
        expectedResult: null,
        dueDate: null,
        hasCost: document.getElementById("hasCost").checked,
        affectsERP: true,
        impactCodesCsv,
        coordDepartmentCodesCsv
    };

    const res = await fetchAPI("/reports/draft", "POST", body);
    if (!res.success) {
        UI.showToast(res.message || "Không thể lưu nháp.", "error");
        return;
    }

    const reportId = res.data.reportId;
    const fileInput = document.getElementById("attachmentFile");
    if (fileInput.files.length > 0) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        formData.append("attachmentScope", "REPORT");

        await fetchAPI(`/reports/${reportId}/attachments`, "POST", formData);
    }

    UI.showToast(`Đã lưu nháp và tải tệp lên thành công!`, "success");

    setTimeout(() => {
        window.location.href = `detail.html?id=${reportId}`;
    }, 1000);
}
