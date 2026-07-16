import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    Clock,
    AlertTriangle,
    ListTree,
    HelpCircle,
    Send,
    MessageSquare,
    DollarSign,
    CheckSquare,
    Archive,
    CheckCircle,
    XCircle,
    Plus,
    Trash2,
    ChevronLeft,
    Save,
    Info,
    Paperclip,
    Download,
    Eye,
    Printer,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { ProductionIssuePrintTemplate } from "../components/print/ProductionIssuePrintTemplate";

import api, {
    formatDate,
    formatMoney,
    formatInputNumber,
    parseInputNumber,
} from "../utils/api";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/ui/StatusBadge";
import { cn } from "../context/UIContext";
import SearchSelect from "../components/ui/SearchSelect";
import StaticSelect from "../components/ui/StaticSelect";
import { useNotifications } from "../context/NotificationContext";

export default function ReportDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast, confirm, prompt } = useUI();
    const { user } = useAuth();
    const { refreshNotifications } = useNotifications();

    const [data, setData] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [editErpSearch, setEditErpSearch] = useState("");
    const [editErpPlans, setEditErpPlans] = useState([]);
    const [editSelectedPlans, setEditSelectedPlans] = useState([]);

    // ── Print Logic ─────────────────────────────────────────────
    const printRef = React.useRef();
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `BCPS_${data?.report?.ReportNo || "Report"}`,
    });

    // ── Response Modal ──────────────────────────────────────────
    const [showRespModal, setShowRespModal] = useState(false);
    const [respForm, setRespForm] = useState({
        departmentCode: user?.deptCode || "",
        responseContent: "",
        causeAssessment: "",
        proposedAction: "",
        hasDeptCost: false,
        costs: [], // Danh sách chi phí lưu tạm tại client
    });

    const [previewFile, setPreviewFile] = useState(null);

    const openResponseModal = async () => {
        if (costTypes.length === 0) {
            try {
                const res = await api.get("/report-form/master-data");
                if (res.data.success) setCostTypes(res.data.data.costTypes || []);
            } catch {
                showToast("Không tải được danh mục", "error");
            }
        }
        setRespForm((prev) => ({
            ...prev,
            departmentCode: user?.deptCode || "",
            responseContent: "",
            causeAssessment: "",
            proposedAction: "",
            hasDeptCost: false,
            costs: []
        }));
        setShowRespModal(true);
    };

    /**
     * Hàm tải file thủ công bằng Blob để ép trình duyệt tải về thay vì mở trực tiếp
     */
    const handleDownload = async (url, fileName) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Network response was not ok");
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            showToast("Tải tệp thất bại", "error");
        }
    };

    const [costForm, setCostForm] = useState({
        costTypeId: "",
        costItemDesc: "",
        qty: "",
        unitCost: "",
        manualAmount: "",
        note: "",
        useManual: false,
    });

    // Danh sách CostType (load từ master data khi mở modal)
    const [costTypes, setCostTypes] = useState([]);
    const [managedDepts, setManagedDepts] = useState([]);

    // ── Edit Mode ───────────────────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [masterData, setMasterData] = useState(null);
    const [saving, setSaving] = useState(false);
    console.log(user);
    const loadMasterData = async () => {
        if (masterData) return;
        try {
            const res = await api.get("/report-form/master-data");
            if (res.data.success) {
                setMasterData(res.data.data);
                setCostTypes(res.data.data.costTypes || []);
            }
        } catch {
            showToast("Không tải được danh mục", "error");
        }
    };

    useEffect(() => {
        if (id && id !== "undefined") {
            loadDetail();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        try {
            // Tách riêng 2 call để tránh call này lỗi kéo theo call kia
            const detailRes = await api.get(`/reports/${id}`);

            if (detailRes.data.success) {
                console.log("chi tiết báo cáo", detailRes.data.data);
                const reportData = detailRes.data.data;
                let actionData = {};

                // Load actions sau khi đã có thông tin report
                try {
                    const actionRes = await api.get(`/reports/${id}/available-actions`);
                    actionData = actionRes.data.success ? actionRes.data.data : {};
                } catch (err) {
                    console.warn("Could not load actions:", err);
                }

                // Restriction logic cho KHO_MANAGER, VT_MANAGER và BGD
                // Cho phép xem nếu:
                // 1. Họ là người tạo (Reporter)
                // 2. Họ có quyền xử lý hiện tại (CanApprove/CanForwardBGD/CanClose)
                // 3. Họ nằm trong danh sách phê duyệt (đã phê duyệt hoặc sẽ phê duyệt)
                // 4. Họ có trong lịch sử xử lý (đã từng thao tác)
                const roles = user?.roles || [];
                const isApprovalRole =
                    roles.includes("KHO_MANAGER") ||
                    roles.includes("VT_MANAGER") ||
                    roles.includes("BGD");
                const isReporter =
                    reportData.report?.CreatedByEmpCode === user?.empCode;

                if (isApprovalRole && !isReporter) {
                    const canDoSomething =
                        actionData.CanApprove ||
                        actionData.CanForwardBGD ||
                        actionData.CanClose;
                    const isInApprovalChain = reportData.approvals?.some(
                        (a) => a.ApproverEmpCode === user?.empCode,
                    );
                    const hasActed = reportData.history?.some(
                        (h) => h.ActionByEmpCode === user?.empCode,
                    );

                    if (!canDoSomething && !isInApprovalChain && !hasActed) {
                        // setData(null);
                        setData(reportData);
                        setActions(null);
                        setLoading(false);
                        return;
                    }
                }
                console.log("coordDepartments data:", reportData.coordDepartments);
                setData(reportData);
                console.log(actionData)
                setActions(actionData);
            } else {
                setData(null);
            }
        } catch (err) {
            console.error("Error loading report:", err);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionFn, successMsg, afterSuccess) => {
        try {
            const res = await actionFn();
            if (res.data.success) {
                showToast(successMsg, "success");
                refreshNotifications();
                if (afterSuccess) {
                    afterSuccess();
                } else {
                    setTimeout(loadDetail, 1000);
                }
            } else {
                showToast(res.data.message || "Lỗi thao tác", "error");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi thao tác", "error");
        }
    };

    const submitReport = async () => {
        const ok = await confirm(
            "Xác nhận",
            "Bạn có chắc chắn muốn trình phản hồi báo cáo này?",
        );
        if (ok)
            handleAction(
                () => api.post(`/reports/${id}/submit`),
                "Trình báo cáo thành công!",
            );
    };

    const submitApprovalReq = async () => {
        const ok = await confirm("Xác nhận", "Xác nhận Trình Phê duyệt hồ sơ này?");
        if (ok)
            handleAction(
                () => api.post(`/reports/${id}/submit-approval`),
                "Đã trình phê duyệt thành công!",
            );
    };

    const closeReportAction = async () => {
        const summary = await prompt(
            "Kết luận đóng hồ sơ",
            "Nhập tóm tắt kết quả xử lý...",
        );
        if (summary) {
            handleAction(
                () =>
                    api.post(`/reports/${id}/close`, {
                        finalResultSummary: summary,
                        closureNote: "Hồ sơ kết thúc từ giao diện Web.",
                    }),
                "Đã ĐÓNG hồ sơ thành công!",
            );
        }
    };

    const deleteDraftAction = async () => {
        const accepted = await confirm(
            "Xóa phiếu nháp",
            "Bạn có chắc muốn xóa không?",
        );
        if (!accepted) return;

        handleAction(
            () => api.delete(`/reports/${id}`),
            "Đã xóa phiếu nháp",
            () => navigate("/reports"),
        );
    };

    const approveReport = async (decision) => {
        const actionName =
            decision === "RETURNED"
                ? "Trả lại bổ sung"
                : decision === "REJECTED"
                    ? "Từ chối"
                    : decision === "FORWARD_BGD"
                        ? "Trình Ban giám đốc"
                        : "Phê duyệt";
        const note = await prompt(
            `Xác nhận ${actionName}`,
            `Nhập ghi chú cho hành động [${actionName}]...`,
            decision !== "APPROVED",
        );
        if (decision !== "APPROVED" && !note) return;

        handleAction(
            () =>
                api.post(`/reports/${id}/approval-decision`, {
                    decisionCode: decision,
                    decisionComment: note || (decision === "FORWARD_BGD" ? "Trình Ban giám đốc" : "Phê duyệt hồ sơ"),
                }),
            `Thao tác ${actionName} thành công!`,
        );
    };

    const addCostLine = () => {
        if (!costForm.costTypeId)
            return showToast("Vui lòng chọn Loại Chi Phí", "warning");
        if (!costForm.costItemDesc)
            return showToast("Vui lòng nhập Mô tả khoản chi phí", "warning");
        if (costForm.useManual && !costForm.manualAmount)
            return showToast("Vui lòng nhập Thành Tiền", "warning");
        if (!costForm.useManual && (!costForm.qty || !costForm.unitCost))
            return showToast("Vui lòng nhập Số lượng và Đơn giá", "warning");

        // Lấy tên loại chi phí từ master data để hiển thị ở client
        const typeObj = costTypes.find((t) => t.CostTypeID == costForm.costTypeId);

        const newLine = {
            ...costForm,
            costTypeName: typeObj?.CostTypeName || "N/A",
            // Tính toán amount để hiển thị
            amount: costForm.useManual
                ? Number(costForm.manualAmount)
                : Number(costForm.qty) * Number(costForm.unitCost),
        };

        setRespForm((prev) => ({
            ...prev,
            costs: [...prev.costs, newLine],
        }));

        // Reset form nhập
        setCostForm({
            costTypeId: "",
            costItemDesc: "",
            qty: "",
            unitCost: "",
            manualAmount: "",
            note: "",
            useManual: false,
        });
    };

    const removeCostLine = (index) => {
        setRespForm((prev) => ({
            ...prev,
            costs: prev.costs.filter((_, i) => i !== index),
        }));
    };

    // ── Ghi phản hồi ────────────────────────────────────────────
    const submitResponse = async () => {
        if (!respForm.departmentCode || !respForm.responseContent)
            return showToast(
                "Vui lòng nhập Mã Bộ Phận và Nội dung xác nhận",
                "warning",
            );

        if (respForm.hasDeptCost && respForm.costs.length === 0) {
            return showToast("Vui lòng thêm ít nhất một dòng chi phí", "warning");
        }

        try {
            const res = await api.post(`/reports/${id}/responses`, {
                departmentCode: respForm.departmentCode,
                responseContent: respForm.responseContent,
                causeAssessment: respForm.causeAssessment,
                proposedAction: respForm.proposedAction,
                hasDeptCost: respForm.hasDeptCost,
                processingResult: "Đã rà soát",
                responseStatusCode: "RESPONDED",
                costs: respForm.costs.map((cost) => ({
                    costTypeId: Number(cost.costTypeId),
                    costItemDesc: cost.costItemDesc,
                    note: cost.note || null,
                    qty: cost.useManual ? null : Number(cost.qty),
                    unitCost: cost.useManual ? null : Number(cost.unitCost),
                    manualAmount: cost.useManual ? Number(cost.manualAmount) : null,
                    useManual: cost.useManual,
                })),
            });

            if (res.data.success) {
                showToast(res.data.message || "Ghi phản hồi thành công!", "success");
                setShowRespModal(false);
                setRespForm({
                    departmentCode: "",
                    responseContent: "",
                    causeAssessment: "",
                    proposedAction: "",
                    hasDeptCost: false,
                    costs: [],
                });
                setCostForm({
                    costTypeId: "",
                    costItemDesc: "",
                    qty: "",
                    unitCost: "",
                    manualAmount: "",
                    note: "",
                    useManual: false,
                });
                refreshNotifications();
                loadDetail();
            }
        } catch (e) {
            showToast(e.response?.data?.message || "Lỗi ghi phản hồi", "error");
        }
    };

    // ── Chỉnh sửa nội dung (Draft) ──────────────────────────────
    const startEditing = async () => {
        await loadMasterData();
        const r = data.report;
        const normalizedPlans = (data.plans || []).map((plan) => ({
            ...plan,
            adjustQty: plan.AdjustQty ?? '',
            adjustDate: plan.AdjustDate ? String(plan.AdjustDate).split("T")[0] : '',
            isAdditionalPlan: Boolean(plan.IsAdditionalPlan),
        }));
        setEditForm({
            reportId: id ? Number(id) : null,
            planSelectKeys: normalizedPlans.map((plan) => plan.PlanSelectKey),
            occurrenceTime: r.OccurrenceTime,
            exceptionTypeId: r.ExceptionTypeID,
            exceptionCauseId: r.ExceptionCauseID,
            severityCode: r.SeverityCode || "HIGH",
            shortDescription: r.ShortDescription,
            detailedDescription: r.DetailedDescription,
            responsibleDeptCode: r.ResponsibleDeptCode,
            mainResponsibleEmpCode: r.MainResponsibleEmpCode,
            proposedSolution: r.ProposedSolution,
            hasCost: r.HasCost,
            dueDate: r.DueDate ? r.DueDate.split("T")[0] : "", // Chuyển định dạng ISO sang YYYY-MM-DD
            coordDepartmentCodesCsv:
                data.coordDepartments?.map((d) => d.DepartmentCode).join(",") || "",
            impactCodesCsv: data.impacts?.map((i) => i.ImpactCode).join(",") || "",
            occurredDeptCode_NT: r.OccurredDeptName_NT || "",
        });
        setEditSelectedPlans(normalizedPlans);
        setIsEditing(true);
    };

    const searchEditERP = async () => {
        if (!editErpSearch.trim()) return showToast("Vui lòng nhập từ khóa ERP", "warning");
        try {
            const { data: res } = await api.get(`/erp/production-plans/search?keyword=${encodeURIComponent(editErpSearch)}&topN=50`);
            setEditErpPlans(res.success ? (res.data.items || []) : []);
        } catch {
            showToast("Lỗi tìm kiếm ERP", "error");
        }
    };

    const addEditPlan = (plan) => {
        if (!plan) return;
        if (editSelectedPlans.some((item) => item.PlanSelectKey === plan.PlanSelectKey)) {
            return showToast("Kế hoạch này đã được chọn", "warning");
        }
        const nextPlans = [...editSelectedPlans, { ...plan, adjustQty: '', adjustDate: '', isAdditionalPlan: false }];
        setEditSelectedPlans(nextPlans);
        setEditForm((prev) => ({ ...prev, planSelectKeys: nextPlans.map((item) => item.PlanSelectKey) }));
    };

    const removeEditPlan = (planSelectKey) => {
        const nextPlans = editSelectedPlans.filter((plan) => plan.PlanSelectKey !== planSelectKey);
        setEditSelectedPlans(nextPlans);
        setEditForm((prev) => ({ ...prev, planSelectKeys: nextPlans.map((item) => item.PlanSelectKey) }));
    };

    const updateEditPlanAdjustment = (planSelectKey, field, value) => {
        setEditSelectedPlans((prev) => prev.map((plan) => (
            plan.PlanSelectKey === planSelectKey
                ? { ...plan, [field]: value }
                : plan
        )));
    };

    useEffect(() => {
        if (!isEditing || !editForm.mainResponsibleEmpCode) {
            setManagedDepts([]);
            return;
        }

        const fetchManagedDepts = async () => {
            try {
                const { data: res } = await api.get(
                    `/employees/${editForm.mainResponsibleEmpCode}/managed-departments`,
                );
                if (res.success) {
                    setManagedDepts(res.data.items);
                }
            } catch (err) {
                console.error("Lỗi lấy danh sách đơn vị quản lý:", err);
            }
        };
        fetchManagedDepts();
    }, [isEditing, editForm.mainResponsibleEmpCode]);

    const saveEdit = async () => {
        setSaving(true);
        try {
            const payload = {
                ...editForm,
                planSelectKeys: editSelectedPlans.map((plan) => plan.PlanSelectKey),
                plans: editSelectedPlans.map((plan) => ({
                    planSelectKey: plan.PlanSelectKey,
                    adjustQty: plan.adjustQty === '' || plan.adjustQty === null || plan.adjustQty === undefined ? null : plan.adjustQty,
                    adjustDate: plan.adjustDate === '' || plan.adjustDate === null || plan.adjustDate === undefined ? null : plan.adjustDate,
                    isAdditionalPlan: Boolean(plan.isAdditionalPlan),
                })),
            };
            const res = await api.post("/reports/draft", payload);
            if (res.data.success) {
                showToast("Đã cập nhật thông tin hồ sơ!", "success");
                setIsEditing(false);
                loadDetail();
            } else {
                showToast(res.data.message || "Lỗi cập nhật", "error");
            }
        } catch (err) {
            showToast(err.response?.data?.message || "Lỗi cập nhật", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading)
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-slate-500 font-bold animate-pulse text-lg tracking-tight">
                    Đang tải hồ sơ...
                </div>
            </div>
        );

    if (!data || !data.report)
        return (
            <div className="max-w-xl mx-auto mt-12 p-12 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <AlertTriangle className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                        Không tìm thấy hồ sơ!
                    </h2>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Hồ sơ <b className="text-slate-900">#{id}</b> không tồn tại hoặc bạn
                        không có quyền xem thông tin này.
                    </p>
                </div>
                <div className="pt-4">
                    <Link
                        to="/reports"
                        className="inline-flex items-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95 group"
                    >
                        <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Quay lại danh sách
                    </Link>
                </div>
            </div>
        );

    const r = data.report;
    const plans = data.plans || [];
    const history = data.history || [];
    const costLines = data.costLines || [];
    const impacts = data.impacts || [];
    console.log(impacts);
    // Tính tổng chi phí ước tính từ costLines (Amount = Computed)
    const totalCost = costLines.reduce((s, c) => s + (Number(c.Amount) || 0), 0);

    return (
        <div className="max-w-8xl mx-auto space-y-4 md:space-y-6 pb-20 md:pb-12">
            <div className="flex items-center justify-between gap-2">
                <Link
                    to="/reports"
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-700 active:scale-95"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại danh sách
                </Link>
            </div>

            {/* Header Card */}
            <div
                className={cn(
                    "p-4 md:p-6 rounded-2xl border shadow-sm flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4 ",
                    r.HasCost
                        ? "bg-linear-to-r from-white to-orange-50/30 border-orange-200 shadow-orange-100/50"
                        : "bg-white border-slate-200",
                )}
            >
                <div>
                    <h1 className="flex flex-wrap items-center gap-2 text-lg font-black tracking-tight text-slate-800 md:gap-3 md:text-2xl">
                        {r.ReportNo}
                        <div className="grid grid-cols-2 gap-2">
                            <StatusBadge status={r.StatusCode} text={r.DynamicCurrentStep} />
                            {r.HasCost && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white rounded-full text-[10px] font-black tracking-tighter shadow-sm animate-pulse-subtle">
                                    <DollarSign className="w-3 h-3" />
                                    CÓ CHI PHÍ
                                </span>
                            )}
                        </div>
                    </h1>
                    <div className="text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                        <span>Loại phát sinh: {r.ExceptionTypeName || "--"}</span>
                        {r.HasCost && totalCost > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold">
                                <DollarSign className="w-3 h-3" />
                                Tổng dự kiến: {formatMoney(totalCost)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
                    {/* ── Action Buttons (dựa trên quyền từ API) ── */}

                    {/* Chỉnh sửa / Trình phản hồi: REPORTER khi phiếu ở DRAFT / NEED_SUPPLEMENT */}
                    {(actions?.CanEditDraft || actions?.CanSubmit) && (
                        <>
                            {actions?.CanEditDraft && !isEditing && (
                                <button
                                    onClick={startEditing}
                                    className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Chỉnh Sửa
                                </button>
                            )}
                            {actions?.CanSubmit && !isEditing && (
                                <button
                                    onClick={submitReport}
                                    className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                                >
                                    <Send className="w-4 h-4 mr-2" /> Trình Phản Hồi
                                </button>
                            )}
                        </>
                    )}

                    {isEditing && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                disabled={saving}
                                className="px-3 sm:px-4 py-2 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="justify-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 mr-2" />{" "}
                                {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
                            </button>
                        </div>
                    )}

                    {actions?.CanDeleteDraft && !isEditing && (
                        <button
                            onClick={deleteDraftAction}
                            className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-red-50 hover:bg-red-100 text-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa
                        </button>
                    )}

                    {/* Ghi Phản Hồi: DEPT_HANDLER khi phiếu WAITING_FEEDBACK & BP mình chưa phản hồi */}
                    {actions?.CanRespond && (
                        <button
                            onClick={openResponseModal}
                            className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
                        >
                            <MessageSquare className="w-4 h-4 mr-2" /> Ghi Phản Hồi
                        </button>
                    )}

                    {/* Trình Phê Duyệt: REPORTER / ADMIN khi phiếu WAITING_FEEDBACK
                        SP không có cờ riêng → dùng CanSubmit (cùng permission REPORT_SUBMIT) kết hợp status */}
                    {r.StatusCode === "WAITING_FEEDBACK" &&
                        actions?.CanSubmitApproval && (
                            <button
                                onClick={submitApprovalReq}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-200"
                            >
                                <CheckSquare className="w-4 h-4 mr-2" /> Trình Phê Duyệt
                            </button>
                        )}

                    {/* Phê Duyệt / Từ chối / Trả lại: VT_MANAGER (không phí) hoặc BGD (có phí) */}
                    {actions?.CanApprove && (
                        <>
                            <button
                                onClick={() => approveReport("RETURNED")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                                Trả Lại
                            </button>
                            {/* <button
                                onClick={() => approveReport("REJECTED")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-red-50 hover:bg-red-100 text-red-600"
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Từ Chối
                            </button> */}
                            <button
                                onClick={() => approveReport("APPROVED")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" /> Phê Duyệt
                            </button>
                        </>
                    )}

                    {/* Trình Ban giám đốc: VT_MANAGER khi phiếu CÓ CHI PHÍ */}
                    {actions?.CanForwardBGD && (
                        <>
                            <button
                                onClick={() => approveReport("RETURNED")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                                Trả Lại
                            </button>
                            <button
                                onClick={() => approveReport("REJECTED")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-red-50 hover:bg-red-100 text-red-600"
                            >
                                <XCircle className="w-4 h-4 mr-2" /> Từ Chối
                            </button>
                            <button
                                onClick={() => approveReport("FORWARD_BGD")}
                                className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                            >
                                <Send className="w-4 h-4 mr-2" /> Trình Ban giám đốc
                            </button>
                        </>
                    )}

                    {/* Đóng hồ sơ: người chịu TN chính hoặc ADMIN khi phiếu APPROVED/PROCESSING */}
                    {actions?.CanClose && (
                        <button
                            onClick={closeReportAction}
                            className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-200"
                        >
                            <Archive className="w-4 h-4 mr-2" /> Xác Nhận &amp; Đóng
                        </button>
                    )}

                    {/* Nút In báo cáo (Luôn hiển thị nếu có dữ liệu) */}
                    <button
                        onClick={handlePrint}
                        className="inline-flex min-w-0 items-center justify-center px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 sm:px-4 bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200"
                    >
                        <Printer className="w-4 h-4 mr-2" /> In Báo Cáo
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
                {/* Left Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto custom-scrollbar">
                            {["overview", "costs", "attachments"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-4 md:px-6 py-4 text-[11px] md:text-sm font-bold border-b-2 transition-colors uppercase tracking-wider whitespace-nowrap",
                                        activeTab === tab
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-slate-500 hover:text-slate-800",
                                    )}
                                >
                                    {tab === "overview"
                                        ? "Tổng Quan"
                                        : tab === "costs"
                                            ? `Chi Phí${costLines.length > 0 ? ` (${costLines.length})` : ""}`
                                            : `Đính Kèm${data?.attachments?.length > 0 ? ` (${data.attachments.length})` : ""}`}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 md:p-6">
                            {/* ── Tab Tổng quan ── */}
                            {activeTab === "overview" && (
                                <div className="space-y-6 animate-in fade-in">
                                    {isEditing ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                            Mô tả ngắn sự cố (*)
                                                        </label>
                                                        <textarea
                                                            value={editForm.shortDescription}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    shortDescription: e.target.value,
                                                                })
                                                            }
                                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800"
                                                            rows="2"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                                Mức độ (*)
                                                            </label>
                                                            <select
                                                                value={editForm.severityCode}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        severityCode: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold"
                                                            >
                                                                {masterData?.severities.map((s) => (
                                                                    <option
                                                                        key={s.SeverityCode}
                                                                        value={s.SeverityCode}
                                                                    >
                                                                        {s.SeverityName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                                Hạn hoàn thành (*)
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={editForm.dueDate}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        dueDate: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold text-blue-600 focus:bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                                Loại phát sinh
                                                            </label>
                                                            <select
                                                                value={editForm.exceptionTypeId}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        exceptionTypeId: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold"
                                                            >
                                                                {masterData?.exceptionTypes.map((t) => (
                                                                    <option
                                                                        key={t.ExceptionTypeID}
                                                                        value={t.ExceptionTypeID}
                                                                    >
                                                                        {t.ExceptionTypeName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                                Nguyên nhân
                                                            </label>
                                                            <select
                                                                value={editForm.exceptionCauseId}
                                                                onChange={(e) =>
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        exceptionCauseId: e.target.value,
                                                                    })
                                                                }
                                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold"
                                                            >
                                                                {masterData?.exceptionCauses.map((c) => (
                                                                    <option
                                                                        key={c.ExceptionCauseID}
                                                                        value={c.ExceptionCauseID}
                                                                    >
                                                                        {c.ExceptionCauseName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                            Mô tả chi tiết
                                                        </label>
                                                        <textarea
                                                            value={editForm.detailedDescription}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    detailedDescription: e.target.value,
                                                                })
                                                            }
                                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-sm"
                                                            rows="4"
                                                        />
                                                    </div>
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                                                            Mức độ ảnh hưởng
                                                        </label>
                                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                            {masterData?.impactTypes.map((imp) => {
                                                                const val =
                                                                    imp.ImpactCode || imp.Code || imp.Value;
                                                                const label =
                                                                    imp.ImpactName || imp.ImpactTypeName || val;
                                                                const codes = editForm.impactCodesCsv
                                                                    ? editForm.impactCodesCsv.split(",")
                                                                    : [];
                                                                const isChecked = codes.includes(val);
                                                                return (
                                                                    <label
                                                                        key={val}
                                                                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                let newCodes = isChecked
                                                                                    ? codes.filter((c) => c !== val)
                                                                                    : [...codes, val];
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    impactCodesCsv: newCodes.join(","),
                                                                                });
                                                                            }}
                                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600"
                                                                        />
                                                                        <span className="font-medium">{label}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                            BP chịu trách nhiệm
                                                        </label>
                                                        <SearchSelect
                                                            placeholder="Tìm bộ phận..."
                                                            apiPath="/departments"
                                                            valueField="DepartmentCode"
                                                            labelField="DepartmentName"
                                                            initialValue={editForm.responsibleDeptCode}
                                                            initialLabel={data.report.ResponsibleDeptName}
                                                            onSelect={(dept) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    responsibleDeptCode:
                                                                        dept?.DepartmentCode || "",
                                                                    mainResponsibleEmpCode: "",
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                            Người chịu TN chính
                                                        </label>
                                                        <SearchSelect
                                                            placeholder="Tìm nhân viên..."
                                                            apiPath={`/employees/search${editForm.responsibleDeptCode ? `?departmentCode=${editForm.responsibleDeptCode}` : ""}`}
                                                            valueField="EmployeeCode"
                                                            labelField="EmployeeName"
                                                            initialValue={editForm.mainResponsibleEmpCode}
                                                            initialLabel={data.report.MainResponsibleEmpName}
                                                            onSelect={(emp) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    mainResponsibleEmpCode:
                                                                        emp?.EmployeeCode || "",
                                                                    occurredDeptCode_NT: "",
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                                            Đề xuất xử lý
                                                        </label>
                                                        <textarea
                                                            value={editForm.proposedSolution}
                                                            onChange={(e) =>
                                                                setEditForm({
                                                                    ...editForm,
                                                                    proposedSolution: e.target.value,
                                                                })
                                                            }
                                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-sm"
                                                            rows="4"
                                                        />
                                                    </div>
                                                    {managedDepts.length > 0 && (
                                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                                Đơn vị / nhà cung cấp gây phát sinh (nếu có)
                                                            </label>
                                                            <StaticSelect
                                                                placeholder="-- Không có / Khác --"
                                                                options={managedDepts}
                                                                valueField="DepartmentName"
                                                                labelField="DepartmentName"
                                                                subLabelField="SourceCode"
                                                                value={editForm.occurredDeptCode_NT}
                                                                onSelect={dept => setEditForm(prev => ({ ...prev, occurredDeptCode_NT: dept?.DepartmentName || '' }))}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                                                            Thông báo phản hồi tới
                                                        </label>
                                                        <div className="flex flex-wrap gap-2 mb-3">
                                                            {editForm.coordDepartmentCodesCsv
                                                                ?.split(",")
                                                                .filter(Boolean)
                                                                .map((code) => (
                                                                    <div
                                                                        key={code}
                                                                        className="bg-blue-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1"
                                                                    >
                                                                        {code}
                                                                        <XCircle
                                                                            className="w-3 h-3 cursor-pointer"
                                                                            onClick={() => {
                                                                                const codes =
                                                                                    editForm.coordDepartmentCodesCsv
                                                                                        .split(",")
                                                                                        .filter((c) => c !== code);
                                                                                setEditForm({
                                                                                    ...editForm,
                                                                                    coordDepartmentCodesCsv:
                                                                                        codes.join(","),
                                                                                });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                        </div>
                                                        <SearchSelect
                                                            placeholder="Thêm bộ phận liên quan..."
                                                            apiPath="/departments"
                                                            valueField="DepartmentCode"
                                                            labelField="DepartmentName"
                                                            onSelect={(dept) => {
                                                                if (!dept) return;
                                                                const codes = editForm.coordDepartmentCodesCsv
                                                                    ? editForm.coordDepartmentCodesCsv.split(",")
                                                                    : [];
                                                                if (codes.includes(dept.DepartmentCode)) return;
                                                                setEditForm({
                                                                    ...editForm,
                                                                    coordDepartmentCodesCsv: [
                                                                        ...codes,
                                                                        dept.DepartmentCode,
                                                                    ].join(","),
                                                                });
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.hasCost}
                                                            disabled={true}
                                                            className="w-5 h-5 text-blue-600 rounded opacity-50 cursor-not-allowed"
                                                        />
                                                        <span className="font-bold text-sm text-slate-700">
                                                            Có phát sinh chi phí
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                    Danh sách kế hoạch ERP
                                                </h3>
                                                <div className="flex gap-3">
                                                    <input
                                                        value={editErpSearch}
                                                        onChange={(e) => setEditErpSearch(e.target.value)}
                                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                                                        placeholder="Nhập lệnh SX, mã kế hoạch..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={searchEditERP}
                                                        className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold"
                                                    >
                                                        Tìm kế hoạch
                                                    </button>
                                                </div>
                                                {editErpPlans.length > 0 && (
                                                    <StaticSelect
                                                        placeholder="-- Chọn dòng kế hoạch phù hợp --"
                                                        options={editErpPlans}
                                                        valueField="PlanSelectKey"
                                                        labelField="DisplayText"
                                                        value={null}
                                                        onSelect={addEditPlan}
                                                    />
                                                )}
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 mobile-table-wrap">
                                                    <table className="w-full min-w-[1180px] text-xs">
                                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Mã kế hoạch</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Đơn hàng</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Sản phẩm</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">ItemCode</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Công đoạn</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Bộ phận</th>
                                                                <th colSpan="2" className="border-l border-slate-200 px-3 py-2 text-center text-blue-700">Kế hoạch</th>
                                                                <th colSpan="3" className="border-l border-slate-200 px-3 py-2 text-center text-red-600">Điều chỉnh</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-right">Xóa</th>
                                                            </tr>
                                                            <tr>
                                                                <th className="border-l border-slate-200 px-3 py-2 text-center">Ngày KH</th>
                                                                <th className="px-3 py-2 text-right">Số lượng</th>
                                                                <th className="border-l border-slate-200 px-3 py-2 text-center">Ngày</th>
                                                                <th className="px-3 py-2 text-right">Số lượng</th>
                                                                <th className="px-3 py-2 text-center">Bổ sung</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {editSelectedPlans.length > 0 ? editSelectedPlans.map((plan) => (
                                                                <tr key={plan.PlanSelectKey}>
                                                                    <td className="px-3 py-2 font-bold text-slate-800">{plan.PlanNo || plan.PlanID}</td>
                                                                    <td className="px-3 py-2">{plan.OrderCode || '--'}</td>
                                                                    <td className="px-3 py-2 max-w-56 truncate" title={plan.ProductName}>{plan.ProductName || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.ProductCode || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.OperationName || plan.OperationCode || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.DepartmentName || '--'}</td>
                                                                    <td className="px-3 py-2 text-center">{formatDate(plan.PlanDate, false) || '--'}</td>
                                                                    <td className="px-3 py-2 text-right font-bold text-slate-800">{plan.PlanQty ?? '--'}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <input
                                                                            type="date"
                                                                            value={plan.adjustDate || ''}
                                                                            onChange={(e) => updateEditPlanAdjustment(plan.PlanSelectKey, 'adjustDate', e.target.value)}
                                                                            className="w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-800 outline-none focus:border-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <input
                                                                            type="text"
                                                                            value={formatInputNumber(plan.adjustQty)}
                                                                            onChange={(e) => updateEditPlanAdjustment(plan.PlanSelectKey, 'adjustQty', parseInputNumber(e.target.value))}
                                                                            className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right font-bold text-slate-800 outline-none focus:border-blue-500"
                                                                            placeholder="0"
                                                                        />
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <label
                                                                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 py-1"
                                                                            title="Tích nếu đây là kế hoạch bổ sung ngoài kế hoạch ban đầu"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(plan.isAdditionalPlan)}
                                                                                onChange={(e) => updateEditPlanAdjustment(plan.PlanSelectKey, 'isAdditionalPlan', e.target.checked)}
                                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                                                                aria-label="Kế hoạch bổ sung"
                                                                            />
                                                                        </label>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        <button type="button" onClick={() => removeEditPlan(plan.PlanSelectKey)} className="text-red-500 hover:text-red-700">
                                                                            <Trash2 className="w-4 h-4 inline" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="12" className="px-3 py-5 text-center text-slate-400 italic">
                                                                        Không gắn kế hoạch ERP
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                    Phản hồi các bộ phận
                                                </h3>
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 mobile-table-wrap">
                                                    <table className="w-full min-w-[640px] text-xs">
                                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Bộ phận</th>
                                                                <th className="px-3 py-2 text-left">Người phản hồi</th>
                                                                <th className="px-3 py-2 text-left">Nội dung phản hồi</th>
                                                                <th className="px-3 py-2 text-left">Đánh giá nguyên nhân</th>
                                                                <th className="px-3 py-2 text-left">Đề xuất hành động</th>
                                                                <th className="px-3 py-2 text-center">Chi phí</th>
                                                                <th className="px-3 py-2 text-center">Thời gian</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {data.responses?.length > 0 ? data.responses.map((resp, idx) => (
                                                                <tr key={idx} className="align-top">
                                                                    <td className="px-3 py-2 font-bold text-slate-800">
                                                                        {resp.DepartmentName || resp.DepartmentCode || "N/A"}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {resp.ResponderEmpName || resp.ResponderEmpCode || "SYSTEM"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-48">
                                                                        {resp.ResponseContent || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-40">
                                                                        {resp.CauseAssessment || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-40">
                                                                        {resp.ProposedAction || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className={cn(
                                                                            "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                                            resp.HasDeptCost
                                                                                ? "bg-red-50 text-red-600 border-red-100"
                                                                                : "bg-emerald-50 text-emerald-600 border-emerald-100",
                                                                        )}>
                                                                            {resp.HasDeptCost ? "Có" : "Không"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                        {formatDate(resp.ResponseAt)}
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="7" className="px-3 py-5 text-center text-slate-400 italic">
                                                                        Chưa có phản hồi nào
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 md:gap-4">
                                                <Card
                                                    label="Ngày phát sinh"
                                                    value={formatDate(
                                                        r.OccurrenceTime || r.CreatedAt,
                                                        false,
                                                    )}
                                                    icon={Clock}
                                                />
                                                <Card
                                                    label="Hạn hoàn thành"
                                                    value={formatDate(r.DueDate, false)}
                                                    icon={Clock}
                                                />
                                                <Card
                                                    label="Mức độ"
                                                    value={r.SeverityName || r.SeverityCode}
                                                    icon={AlertTriangle}
                                                />
                                                <Card
                                                    label="Loại phát sinh"
                                                    value={r.ExceptionTypeName}
                                                    icon={ListTree}
                                                />
                                                <Card
                                                    label="Nguyên nhân"
                                                    value={r.ExceptionCauseName}
                                                    icon={HelpCircle}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                                                <div className="space-y-4">
                                                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                        Nội dung chi tiết
                                                    </h3>
                                                    <Field
                                                        label="Mô tả ngắn"
                                                        value={r.ShortDescription}
                                                    />
                                                    <Field
                                                        label="Mô tả chi tiết"
                                                        value={r.DetailedDescription}
                                                    />
                                                    <Field
                                                        label="Đề xuất xử lý"
                                                        value={r.ProposedSolution}
                                                    />
                                                    <Field
                                                        label="Mức độ ảnh hưởng"
                                                        value={impacts?.map(i => i.ImpactName || i.ImpactCode).join(", ")}
                                                    />
                                                    {r.OccurredDeptCode_NT && (
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                                                            <Info className="w-3 h-3" />
                                                            <span>
                                                                Đơn vị / nhà cung cấp gây phát sinh:{" "}
                                                                <b className="text-slate-700">
                                                                    {r.OccurredDeptName_NT ||
                                                                        r.OccurredDeptCode_NT}
                                                                </b>
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-4">
                                                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                        Phân công
                                                    </h3>
                                                    <Field
                                                        label="Đơn vị chịu trách nhiệm"
                                                        value={
                                                            r.ResponsibleDeptName || r.ResponsibleDeptCode
                                                        }
                                                    />
                                                    <Field
                                                        label="Nhân viên phụ trách"
                                                        value={r.MainResponsibleEmpName}
                                                    />
                                                    {data?.coordDepartments?.filter(cd => cd.FeedbackStatusCode?.toUpperCase() === 'PENDING').length > 0 && (
                                                        <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> Chờ phản hồi từ
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {data.coordDepartments
                                                                    .filter(cd => cd.FeedbackStatusCode?.toUpperCase() === 'PENDING')
                                                                    .map((cd, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-white border border-red-200 text-red-600 rounded-lg text-[11px] font-black shadow-sm">
                                                                            {cd.DepartmentName || cd.DepartmentCode}
                                                                        </span>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <Field
                                                        label="Bộ phận xảy ra lỗi"
                                                        value={r.OccurredDepartmentName}
                                                    />

                                                    {/* Hiển thị chi phí của đơn vị tạo (nếu có) */}
                                                    {r.HasCost && data.costLines?.some(c => c.DepartmentCode === r.CreatedByDeptCode || c.DepartmentCode === r.ResponsibleDeptCode && !data.responses?.some(resp => resp.DepartmentCode === c.DepartmentCode)) && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                                            <h3 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2">
                                                                <DollarSign className="w-4 h-4 text-orange-500" />
                                                                Chi phí dự kiến của đơn vị
                                                            </h3>
                                                            <div className="bg-orange-50/30 rounded-xl border border-orange-100 overflow-hidden shadow-sm">
                                                                <table className="w-full min-w-[640px] text-xs">
                                                                    <thead className="bg-orange-50 text-orange-700/60 font-bold border-b border-orange-100">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">Nội dung</th>
                                                                            <th className="px-3 py-2 text-right">T.Tiền</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-orange-100 text-slate-700">
                                                                        {(data.costLines || [])
                                                                            .filter(c => {
                                                                                // Lọc lấy chi phí của người tạo (Thường là ResponsibleDeptCode ban đầu nếu chưa có response)
                                                                                // Hoặc lọc theo CreatedByDeptCode nếu có
                                                                                const creatorDept = r.CreatedByDeptCode || r.ResponsibleDeptCode;
                                                                                return c.DepartmentCode === creatorDept && !data.responses?.some(resp => resp.DepartmentCode === c.DepartmentCode);
                                                                            })
                                                                            .map((c, ki) => (
                                                                                <tr key={ki}>
                                                                                    <td className="px-3 py-2 italic font-medium">
                                                                                        {c.CostTypeName}: {c.CostItemDesc}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-right font-black text-slate-900">
                                                                                        {formatMoney(c.Amount)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                    Danh sách kế hoạch ERP
                                                </h3>
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 mobile-table-wrap">
                                                    <table className="w-full min-w-[1100px] text-xs">
                                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Mã kế hoạch</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Đơn hàng</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Sản phẩm</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">ItemCode</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Công đoạn</th>
                                                                <th rowSpan="2" className="px-3 py-2 text-left">Bộ phận</th>
                                                                <th colSpan="2" className="border-l border-slate-200 px-3 py-2 text-center text-blue-700">Kế hoạch</th>
                                                                <th colSpan="3" className="border-l border-slate-200 px-3 py-2 text-center text-red-600">Điều chỉnh</th>
                                                            </tr>
                                                            <tr>
                                                                <th className="border-l border-slate-200 px-3 py-2 text-center">Ngày KH</th>
                                                                <th className="px-3 py-2 text-right">Số lượng</th>
                                                                <th className="border-l border-slate-200 px-3 py-2 text-center">Ngày</th>
                                                                <th className="px-3 py-2 text-right">Số lượng</th>
                                                                <th className="px-3 py-2 text-center">Bổ sung</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {plans.length > 0 ? plans.map((plan) => (
                                                                <tr key={plan.PlanSelectKey}>
                                                                    <td className="px-3 py-2 font-bold text-slate-800">{plan.PlanNo || plan.PlanID}</td>
                                                                    <td className="px-3 py-2">{plan.OrderCode || '--'}</td>
                                                                    <td className="px-3 py-2 max-w-56 truncate" title={plan.ProductName}>{plan.ProductName || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.ProductCode || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.OperationName || plan.OperationCode || '--'}</td>
                                                                    <td className="px-3 py-2">{plan.DepartmentName || '--'}</td>
                                                                    <td className="px-3 py-2 text-center">{formatDate(plan.PlanDate, false) || '--'}</td>
                                                                    <td className="px-3 py-2 text-right">{plan.PlanQty ?? '--'}</td>
                                                                    <td className="px-3 py-2 text-center">{formatDate(plan.AdjustDate, false) || '--'}</td>
                                                                    <td className="px-3 py-2 text-right">{plan.AdjustQty ?? '--'}</td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        {plan.IsAdditionalPlan ? (
                                                                            <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 ring-1 ring-amber-200">
                                                                                Bổ sung
                                                                            </span>
                                                                        ) : '--'}
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="11" className="px-3 py-5 text-center text-slate-400 italic">
                                                                        Không gắn kế hoạch ERP
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">
                                                    Phản hồi các bộ phận
                                                </h3>
                                                <div className="overflow-x-auto rounded-xl border border-slate-200 mobile-table-wrap">
                                                    <table className="w-full min-w-[900px] text-xs">
                                                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left">Bộ phận</th>
                                                                <th className="px-3 py-2 text-left">Người phản hồi</th>
                                                                <th className="px-3 py-2 text-left">Nội dung phản hồi</th>
                                                                <th className="px-3 py-2 text-left">Đánh giá nguyên nhân</th>
                                                                <th className="px-3 py-2 text-left">Đề xuất hành động</th>
                                                                <th className="px-3 py-2 text-center">Chi phí</th>
                                                                <th className="px-3 py-2 text-center">Thời gian</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {data.responses?.length > 0 ? data.responses.map((resp, idx) => (
                                                                <tr key={idx} className="align-top">
                                                                    <td className="px-3 py-2 font-bold text-slate-800">
                                                                        {resp.DepartmentName || resp.DepartmentCode || "N/A"}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        {resp.ResponderEmpName || resp.ResponderEmpCode || "SYSTEM"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-48">
                                                                        {resp.ResponseContent || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-40">
                                                                        {resp.CauseAssessment || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-pre-wrap min-w-40">
                                                                        {resp.ProposedAction || "--"}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className={cn(
                                                                            "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                                            resp.HasDeptCost
                                                                                ? "bg-red-50 text-red-600 border-red-100"
                                                                                : "bg-emerald-50 text-emerald-600 border-emerald-100",
                                                                        )}>
                                                                            {resp.HasDeptCost ? "Có" : "Không"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                                                        {formatDate(resp.ResponseAt)}
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="7" className="px-3 py-5 text-center text-slate-400 italic">
                                                                        Chưa có phản hồi nào
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── Tab Chi phí ── */}
                            {activeTab === "costs" && (
                                <div className="animate-in fade-in space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2 mb-4">
                                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
                                            Danh Sách Dòng Chi Phí
                                        </h3>
                                    </div>
                                    {costLines.length === 0 ? (
                                        <p className="text-slate-500 italic text-sm">
                                            Chưa có dòng chi phí nào.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto rounded-xl border border-slate-200 mobile-table-wrap">
                                                <table className="w-full min-w-[640px] text-sm">
                                                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
                                                        <tr>
                                                            <th className="text-left px-4 py-3 font-bold">
                                                                Bộ Phận
                                                            </th>
                                                            <th className="text-left px-4 py-3 font-bold">
                                                                Mô tả
                                                            </th>
                                                            <th className="text-right px-4 py-3 font-bold">
                                                                SL
                                                            </th>
                                                            <th className="text-right px-4 py-3 font-bold">
                                                                Đơn giá
                                                            </th>
                                                            <th className="text-right px-4 py-3 font-bold">
                                                                Thành tiền
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {costLines.map((c, i) => (
                                                            <tr key={i} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 font-bold text-slate-700">
                                                                    {c.DepartmentName || c.DepartmentCode}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {c.CostItemDesc}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-slate-600">
                                                                    {c.Qty ?? "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-slate-600">
                                                                    {c.UnitCost ? formatMoney(c.UnitCost) : "—"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-black text-slate-800">
                                                                    {formatMoney(c.Amount)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                        <tr>
                                                            <td
                                                                colSpan={4}
                                                                className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs tracking-wider"
                                                            >
                                                                Tổng ước tính:
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-red-600 text-base">
                                                                {formatMoney(totalCost)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === "attachments" && (
                                <div className="animate-in fade-in space-y-4">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-2 mb-4">
                                        Các Tệp Đính Kèm
                                    </h3>
                                    {!data.attachments || data.attachments.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                            <Paperclip className="w-12 h-12 text-slate-200 mb-2" />
                                            <p className="text-slate-400 italic text-sm font-medium">
                                                Chưa có tệp đính kèm nào.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                                            {data.attachments.map((file, idx) => {
                                                // 1. Trích xuất tên file thực tế từ đường dẫn vật lý (xử lý cả \ của Windows và / của Linux)
                                                const actualFileName =
                                                    file.FilePath.split(/[/\\]/).pop();

                                                const baseUrl = import.meta.env.VITE_API_URL.replace(
                                                    /\/api\/?$/,
                                                    "",
                                                );

                                                // 3. Tạo URL chuẩn xác như ảnh bạn vừa gửi
                                                const fileUrl = `${baseUrl}/uploads/${actualFileName}`;
                                                console.log(fileUrl);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4"
                                                    >
                                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            <Paperclip className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div
                                                                className="font-bold text-slate-800 text-sm truncate"
                                                                title={file.FileName}
                                                            >
                                                                {file.FileName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-tight">
                                                                {formatDate(file.UploadedAt || file.CreatedAt)}{" "}
                                                                —{" "}
                                                                {file.FileSize
                                                                    ? `${(file.FileSize / 1024).toFixed(1)} KB`
                                                                    : "N/A"}
                                                            </div>
                                                            <div className="text-[10px] text-blue-600 mt-0.5 font-medium italic">
                                                                Bởi: {file.UploadedByEmpName}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {(['jpg', 'jpeg', 'png', 'gif', 'svg', 'pdf'].some(ext => file.FileName?.toLowerCase().endsWith(ext))) && (
                                                                <button
                                                                    onClick={() => setPreviewFile({ url: fileUrl, name: file.FileName })}
                                                                    className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 hover:border-blue-200 transition-all active:scale-95"
                                                                    title="Xem nhanh"
                                                                >
                                                                    <Eye className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDownload(fileUrl, file.FileName)}
                                                                className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 hover:border-blue-200 transition-all active:scale-95"
                                                                title="Tải về máy"
                                                            >
                                                                <Download className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — History Timeline */}
                <div className="space-y-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Clock className="w-32 h-32" />
                        </div>
                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm mb-6 border-b border-slate-100 pb-2 relative">
                            Lịch sử Xử lý
                        </h3>
                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pl-5">
                            {history.length > 0 ? (
                                history.map((h, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-6.75 bg-blue-500 w-3 h-3 rounded-full border-2 border-white shadow-sm shadow-blue-200 top-1.5"></div>
                                        <div className="font-bold text-slate-800 text-sm">
                                            {h.ActionName || "--"}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {formatDate(h.ActionAt)}
                                        </div>
                                        <div className="text-sm font-medium text-slate-600 mt-1">
                                            Bởi: {h.ActionByEmpName}
                                        </div>
                                        {h.Note && (
                                            <div className="text-xs italic text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                                                {h.Note}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-slate-500 text-sm">Chưa có lịch sử.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                Modal 1 — Ghi Phản Hồi
            ══════════════════════════════════════════════════════════ */}
            {showRespModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-8 my-auto border border-slate-100 max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                            Ghi Phản Hồi Từ Bộ Phận Liên Quan
                        </h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">
                                        Bộ Phận Phản Hồi
                                    </label>
                                    {user?.deptCode ? (
                                        <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                            {user?.unitName} ({user?.deptCode})
                                        </div>
                                    ) : (
                                        <SearchSelect
                                            placeholder="Chọn bộ phận phản hồi..."
                                            apiPath="/departments"
                                            valueField="DepartmentCode"
                                            labelField="DepartmentName"
                                            subLabelField="DepartmentCode"
                                            initialValue={respForm.departmentCode}
                                            onSelect={(dept) =>
                                                setRespForm({
                                                    ...respForm,
                                                    departmentCode: dept?.DepartmentCode || "",
                                                })
                                            }
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    {r.HasCost && (
                                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 w-full hover:bg-white hover:border-blue-200 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={respForm.hasDeptCost}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    if (!checked && respForm.costs.length > 0) {
                                                        if (
                                                            !window.confirm(
                                                                "Hành động này sẽ xóa các dòng chi phí đã nhập. Bạn có chắc chắn?",
                                                            )
                                                        )
                                                            return;
                                                        setRespForm({
                                                            ...respForm,
                                                            hasDeptCost: false,
                                                            costs: [],
                                                        });
                                                    } else {
                                                        setRespForm({ ...respForm, hasDeptCost: checked });
                                                    }
                                                }}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span className="font-bold text-sm text-slate-700 select-none">
                                                BP CÓ phát sinh chi phí
                                            </span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">
                                    Xác nhận &amp; Nhận định sự cố (*)
                                </label>
                                <textarea
                                    value={respForm.responseContent}
                                    onChange={(e) =>
                                        setRespForm({
                                            ...respForm,
                                            responseContent: e.target.value,
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                    rows="3"
                                    placeholder="Xác nhận lại sự việc và nhận định nguyên nhân khách quan..."
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">
                                        Đánh giá Root Cause
                                    </label>
                                    <textarea
                                        value={respForm.causeAssessment}
                                        onChange={(e) =>
                                            setRespForm({
                                                ...respForm,
                                                causeAssessment: e.target.value,
                                            })
                                        }
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                        rows="3"
                                        placeholder="Nguyên nhân gốc rễ là gì?"
                                    ></textarea>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">
                                        Đề xuất Hành động
                                    </label>
                                    <textarea
                                        value={respForm.proposedAction}
                                        onChange={(e) =>
                                            setRespForm({
                                                ...respForm,
                                                proposedAction: e.target.value,
                                            })
                                        }
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800"
                                        rows="3"
                                        placeholder="Biện pháp xử lý/ngăn chặn..."
                                    ></textarea>
                                </div>
                            </div>

                            {respForm.hasDeptCost && (
                                <div className="border-t border-slate-100 pt-5 mt-5 space-y-4 animate-in fade-in slide-in-from-top-4">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center">
                                        <DollarSign className="w-4 h-4 mr-1 text-amber-500" />
                                        Thông Tin Chi Phí Phát Sinh
                                    </h4>

                                    {/* Mảng chi phí đã thêm */}
                                    {respForm.costs.length > 0 && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-4">
                                            <table className="w-full min-w-[640px] text-xs">
                                                <thead className="bg-slate-100 text-slate-600 font-bold">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">
                                                            Loại / Mô tả
                                                        </th>
                                                        <th className="px-3 py-2 text-right">T.Tiền</th>
                                                        <th className="px-3 py-2 text-center w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200">
                                                    {respForm.costs.map((c, idx) => (
                                                        <tr key={idx} className="hover:bg-amber-50/50">
                                                            <td className="px-3 py-2">
                                                                <div className="font-bold text-slate-700">
                                                                    {c.costTypeName}
                                                                </div>
                                                                <div className="text-slate-500 truncate max-w-50">
                                                                    {c.costItemDesc}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-black text-slate-800">
                                                                {formatMoney(c.amount)}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                <button
                                                                    onClick={() => removeCostLine(idx)}
                                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Form nhập dòng chi phí mới */}
                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-300 space-y-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                    Loại Chi Phí (*)
                                                </label>
                                                <select
                                                    value={costForm.costTypeId}
                                                    onChange={(e) =>
                                                        setCostForm({
                                                            ...costForm,
                                                            costTypeId: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold focus:border-amber-500 outline-none"
                                                >
                                                    <option value="">-- Chọn loại --</option>
                                                    {costTypes.map((ct) => (
                                                        <option key={ct.CostTypeID} value={ct.CostTypeID}>
                                                            {ct.CostTypeName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                    Mô tả Khoản Chi Phí (*)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={costForm.costItemDesc}
                                                    onChange={(e) =>
                                                        setCostForm({
                                                            ...costForm,
                                                            costItemDesc: e.target.value,
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold focus:border-amber-500 outline-none"
                                                    placeholder="VD: Chi phí vật tư..."
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCostForm({ ...costForm, useManual: false })
                                                }
                                                className={cn(
                                                    "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                    !costForm.useManual
                                                        ? "border-amber-500 bg-amber-50 text-amber-700"
                                                        : "border-slate-200 bg-white text-slate-500",
                                                )}
                                            >
                                                SL × Đơn giá
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCostForm({ ...costForm, useManual: true })
                                                }
                                                className={cn(
                                                    "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                    costForm.useManual
                                                        ? "border-amber-500 bg-amber-50 text-amber-700"
                                                        : "border-slate-200 bg-white text-slate-500",
                                                )}
                                            >
                                                Thành tiền
                                            </button>
                                        </div>

                                        {!costForm.useManual ? (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                        Số Lượng
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formatInputNumber(costForm.qty)}
                                                        onChange={(e) =>
                                                            setCostForm({
                                                                ...costForm,
                                                                qty: parseInputNumber(e.target.value),
                                                            })
                                                        }
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                        Đơn Giá
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formatInputNumber(costForm.unitCost)}
                                                        onChange={(e) =>
                                                            setCostForm({
                                                                ...costForm,
                                                                unitCost: parseInputNumber(e.target.value),
                                                            })
                                                        }
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                                    Thành Tiền (VNĐ) (*)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formatInputNumber(costForm.manualAmount)}
                                                    onChange={(e) =>
                                                        setCostForm({
                                                            ...costForm,
                                                            manualAmount: parseInputNumber(e.target.value),
                                                        })
                                                    }
                                                    className="w-full px-3 py-2 border border-amber-200 bg-amber-50/30 rounded-xl text-sm font-black text-amber-900 outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={addCostLine}
                                            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Thêm Dòng Vào Danh Sách
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-6">
                                <button
                                    onClick={() => setShowRespModal(false)}
                                    className="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors active:scale-95"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={submitResponse}
                                    className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center"
                                >
                                    <Send className="w-4 h-4 mr-2" /> Lưu Phản Hồi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Modal 3 — Xem Trước Tệp (Preview)
            ══════════════════════════════════════════════════════════ */}
            {previewFile && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-100 flex flex-col animate-in fade-in transition-all">
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 text-white rounded-lg">
                                <Paperclip className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-white text-sm truncate max-w-[55vw] md:max-w-md">
                                {previewFile.name}
                            </span>
                        </div>
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="p-2 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all group"
                        >
                            <XCircle className="w-8 h-8 group-hover:scale-110" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-4 md:p-12 flex items-center justify-center">
                        {previewFile.name.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={`${previewFile.url}#toolbar=0`}
                                className="w-full h-full max-w-5xl bg-white rounded-2xl shadow-2xl border-none"
                                title="PDF Preview"
                            ></iframe>
                        ) : (
                            <img
                                src={previewFile.url}
                                crossOrigin="anonymous"
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300"
                            />
                        )
                        }
                    </div>

                    <div className="p-4 flex justify-center gap-4">
                        <button
                            onClick={() => handleDownload(previewFile.url, previewFile.name)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            <Download className="w-5 h-5" /> Tải về tệp
                        </button>
                    </div>
                </div>
            )}
            {/* --- Hidden Print Template --- */}
            <div style={{ display: "none" }}>
                <ProductionIssuePrintTemplate ref={printRef} data={data} />
            </div>
        </div>
    );
}


function Field({ label, value }) {
    return (
        <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                {label}
            </div>
            <div className="text-sm font-bold text-slate-700">{value || "--"}</div>
        </div>
    );
}

// eslint-disable-next-line no-unused-vars
function Card({ label, value, icon: Icon }) {
    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 shadow-sm border-l-4 border-l-blue-500">
            <div className="flex items-center text-slate-500 text-xs font-bold mb-2 tracking-wide uppercase">
                <Icon className="w-4 h-4 mr-1 text-blue-500" />
                {label}
            </div>
            <div className="text-slate-800 font-black truncate">{value || "--"}</div>
        </div>
    );
}


