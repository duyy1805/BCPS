import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Eye, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import api, { formatMoney, formatDate } from "../utils/api";
import StatusBadge from "../components/ui/StatusBadge";
import { cn, useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";
import StaticSelect from "../components/ui/StaticSelect";
import SearchSelect from "../components/ui/SearchSelect";

const STATUS_FILTER_OPTIONS = [
    { value: "ALL", label: "Tất cả trạng thái" },
    { value: "DRAFT", label: "Nháp" },
    { value: "WAITING_FEEDBACK", label: "Chờ phản hồi" },
    { value: "WAITING_APPROVAL", label: "Chờ phê duyệt" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "REJECTED", label: "Từ chối" },
    { value: "CLOSED", label: "Đã đóng" },
];

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
];

export default function ReportList() {
    const { showToast } = useUI();
    const { user } = useAuth();
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [pendingResponseDept, setPendingResponseDept] = useState(null);
    const [onlyMyPending, setOnlyMyPending] = useState(true);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [meta, setMeta] = useState({ totalRows: 0, totalPages: 0 });

    const normalizeMeta = (rawMeta = {}) => {
        const normalizedPageSize = Number(rawMeta.pageSize ?? rawMeta.PageSize ?? pageSize);
        const totalRows = Number(rawMeta.totalRows ?? rawMeta.TotalRows ?? 0);

        return {
            totalRows,
            pageNumber: Number(rawMeta.pageNumber ?? rawMeta.PageNumber ?? page),
            pageSize: normalizedPageSize,
            totalPages: Number(
                rawMeta.totalPages ??
                rawMeta.TotalPages ??
                Math.ceil(totalRows / Math.max(1, normalizedPageSize))
            ),
        };
    };

    const loadData = async (pageNum = page) => {
        setLoading(true);
        try {
            const roles = user?.roles || [];
            const isApprovalRole =
                roles.includes("KHO_MANAGER") ||
                roles.includes("VT_MANAGER") ||
                roles.includes("BGD");
            const onlyPending =
                isApprovalRole && onlyMyPending ? "&onlyNeedMyApproval=true" : "";

            const queryParams = new URLSearchParams({
                pageNumber: String(pageNum),
                pageSize: String(pageSize),
                keyword,
                statusCode: status,
            });

            if (pendingResponseDept?.DepartmentCode) {
                queryParams.set("pendingResponseDeptCode", pendingResponseDept.DepartmentCode);
            }

            const query = `?${queryParams.toString()}${onlyPending}`;
            const { data } = await api.get(`/reports${query}`);
            if (data.success) {
                setReports(data.data.items || []);
                setMeta(normalizeMeta(data.data.meta));
            }
        } catch {
            showToast("Lỗi tải danh sách báo cáo", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize]);

    // Reset to page 1 when status, pending response department, or onlyMyPending filters change
    useEffect(() => {
        setPage(1);
        loadData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, pendingResponseDept, onlyMyPending]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadData(1);
    };

    const isOverdue = (report) => {
        const overdueWorkflowStatuses = ["WAITING_FEEDBACK", "WAITING_APPROVAL"];
        return Number(report?.OverdueDays || 0) > 0 && overdueWorkflowStatuses.includes(report?.StatusCode);
    };

    return (
        <div className="max-w-8xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <form
                    onSubmit={handleSearch}
                    className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4"
                >
                    <div className="relative flex-1 max-w-none lg:max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tìm số BCPS, Lệnh SX..."
                            className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm md:text-base"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <StaticSelect
                            options={STATUS_FILTER_OPTIONS}
                            value={status || "ALL"}
                            onSelect={(opt) => setStatus(opt?.value === "ALL" ? "" : opt?.value || "")}
                            className="flex-1 md:flex-none md:w-56"
                            controlClassName="py-2.5 text-sm"
                            leftIcon={Filter}
                            clearable={false}
                        />

                        <SearchSelect
                            placeholder="Bộ phận chưa phản hồi"
                            apiPath="/departments"
                            valueField="DepartmentCode"
                            labelField="DepartmentName"
                            initialValue={pendingResponseDept?.DepartmentCode || ""}
                            initialLabel={pendingResponseDept?.DepartmentName || ""}
                            onSelect={(dept) => setPendingResponseDept(dept)}
                            className="flex-1 md:flex-none md:w-64"
                            leftIcon={Building2}
                        />

                        {(user?.roles?.includes("KHO_MANAGER") ||
                            user?.roles?.includes("VT_MANAGER") ||
                            user?.roles?.includes("BGD")) && (
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white transition-all shadow-sm shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={onlyMyPending}
                                        onChange={(e) => setOnlyMyPending(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-[11px] md:text-sm font-bold text-slate-700 select-none whitespace-nowrap">
                                        Chờ duyệt
                                    </span>
                                </label>
                            )}
                    </div>

                    <button
                        type="submit"
                        className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm active:scale-95 text-sm"
                    >
                        Tìm kiếm
                    </button>
                </form>

                <Link
                    to="/reports/create"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 flex items-center justify-center transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" /> Tạo báo cáo
                </Link>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500 shadow-sm">
                        Đang tải danh sách báo cáo...
                    </div>
                ) : reports.length > 0 ? (
                    reports.map((r) => {
                        const overdue = isOverdue(r);

                        return (
                            <Link
                                key={r.ReportID}
                                to={`/reports/${r.ReportID}`}
                                className={cn(
                                    "block rounded-2xl border bg-white p-4 shadow-sm transition active:scale-[0.99]",
                                    overdue ? "border-red-200 bg-red-50/40" : "border-slate-200 hover:border-blue-200"
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className={cn("truncate text-base font-black", overdue ? "text-red-800" : "text-slate-900")}>{r.ReportNo}</div>
                                        <div className="mt-1 text-xs font-medium text-slate-500">{formatDate(r.CreatedAt, false)}</div>
                                    </div>
                                    <StatusBadge
                                        status={r.StatusCode}
                                        text={r.DynamicCurrentStep}
                                        className="shrink-0 justify-center text-[10px]"
                                    />
                                </div>

                                <div className="mt-3 space-y-2 text-sm text-slate-700">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Loại phát sinh</div>
                                        <div className="font-bold">{r.ExceptionTypeName || "--"}</div>
                                    </div>

                                    {(r.Plans || []).length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Kế hoạch / sản phẩm</div>
                                            <div className="space-y-1">
                                                {(r.Plans || []).slice(0, 2).map((plan) => (
                                                    <div key={plan.PlanSelectKey} className="rounded-xl bg-slate-50 px-3 py-2">
                                                        <div className="font-bold text-slate-800">{plan.OrderCode || plan.PlanNo || "N/A"}</div>
                                                        <div className="truncate text-xs text-slate-500">{plan.ProductName || plan.PlanNo || ""}</div>
                                                        {plan.IsAdditionalPlan && (
                                                            <div className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 ring-1 ring-amber-200">
                                                                Bổ sung
                                                            </div>
                                                        )}
                                                        {(plan.AdjustQty !== null && plan.AdjustQty !== undefined || plan.AdjustDate) && (
                                                            <div className="mt-1 text-[11px] font-bold text-blue-600">
                                                                ĐC: {plan.AdjustQty ?? "--"} {plan.AdjustDate ? `- ${formatDate(plan.AdjustDate, false)}` : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Người tạo</div>
                                            <div className="truncate font-bold">{r.CreatedByEmpName || "--"}</div>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Chi phí</div>
                                            <div className="truncate font-black text-red-600">{r.HasCost ? formatMoney(r.EstimatedTotalCost) : "-"}</div>
                                        </div>
                                    </div>

                                    {(r.ResponsibleDeptName || r.ResponsibleDeptCode) && (
                                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                                            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">Bộ phận chịu trách nhiệm</div>
                                            <div className="font-bold">{r.ResponsibleDeptName || r.ResponsibleDeptCode}</div>
                                        </div>
                                    )}

                                    {overdue && (
                                        <div className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700">
                                            Quá hạn {Number(r.OverdueDays)} ngày
                                        </div>
                                    )}
                                    {r.StatusCode === "WAITING_FEEDBACK" && r.PendingDepts && (
                                        <div className="text-xs font-medium italic text-slate-500">Chờ: {r.PendingDepts}</div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500 shadow-sm">
                        Không tìm thấy báo cáo nào phù hợp.
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="hidden bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden md:block">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm">Mã BCPS / Ngày</th>
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm hidden sm:table-cell">Đơn hàng/ Sản phẩm</th>
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm">Loại phát sinh</th>
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm">Người tạo</th>
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm hidden lg:table-cell">Bộ phận chịu TN</th>
                                <th className="p-4 md:p-5 text-right font-bold tracking-wide text-xs md:text-sm hidden md:table-cell">Tổng CP (VNĐ)</th>
                                <th className="p-4 md:p-5 text-center font-bold tracking-wide text-xs md:text-sm">Trạng thái</th>
                                <th className="p-4 md:p-5 text-center font-bold tracking-wide text-xs md:text-sm">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="p-12 text-center text-slate-500 font-medium"
                                    >
                                        Đang tải danh sách báo cáo...
                                    </td>
                                </tr>
                            ) : reports.length > 0 ? (
                                reports.map((r) => {
                                    const overdue = isOverdue(r);

                                    return (
                                        <tr
                                            key={r.ReportID}
                                            className={`transition-colors group ${overdue ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-slate-50/80"}`}
                                        >
                                            <td className="p-4 md:p-5">
                                                <Link
                                                    to={`/reports/${r.ReportID}`}
                                                    className={`font-bold text-sm md:text-base transition-colors ${overdue ? "text-red-800 group-hover:text-red-700" : "text-slate-800 group-hover:text-blue-600"}`}
                                                >
                                                    {r.ReportNo}
                                                </Link>
                                                <div className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium">
                                                    {formatDate(r.CreatedAt, false)}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-5 hidden sm:table-cell">
                                                <div className="space-y-1">
                                                    {(r.Plans || []).length > 0 ? (
                                                        r.Plans.map((plan) => (
                                                            <div key={plan.PlanSelectKey} className="leading-tight">
                                                                <div className="font-bold text-slate-700 text-sm">
                                                                    {plan.OrderCode || plan.PlanNo || "N/A"}
                                                                </div>
                                                                <div className="text-xs text-slate-500 truncate max-w-37.5 lg:max-w-50" title={plan.ProductName}>
                                                                    {plan.ProductName || plan.PlanNo || ""}
                                                                </div>
                                                                {plan.IsAdditionalPlan && (
                                                                    <div className="mt-0.5 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 ring-1 ring-amber-200">
                                                                        Bổ sung
                                                                    </div>
                                                                )}
                                                                {(plan.AdjustQty !== null && plan.AdjustQty !== undefined || plan.AdjustDate) && (
                                                                    <div className="text-[11px] font-bold text-blue-600">
                                                                        ĐC: {plan.AdjustQty ?? "--"} {plan.AdjustDate ? `- ${formatDate(plan.AdjustDate, false)}` : ""}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-sm text-slate-400 italic">Không có kế hoạch</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-5 font-medium text-slate-700 text-sm">
                                                {r.ExceptionTypeName}
                                                <div className="md:hidden text-[10px] text-slate-400 mt-1 font-bold">
                                                    {r.HasCost ? formatMoney(r.EstimatedTotalCost) : ""}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-5 font-medium text-slate-700 text-sm">
                                                {r.CreatedByEmpName}
                                            </td>
                                            <td className="p-4 md:p-5 font-medium text-slate-700 text-sm hidden lg:table-cell">
                                                {r.ResponsibleDeptName || r.ResponsibleDeptCode}
                                            </td>
                                            <td className="p-4 md:p-5 text-right font-bold text-red-600 text-sm hidden md:table-cell">
                                                {r.HasCost ? formatMoney(r.EstimatedTotalCost) : "-"}
                                            </td>
                                            <td className="p-4 md:p-5 text-center align-middle">
                                                <div className="flex flex-col items-center gap-1">
                                                    <StatusBadge
                                                        status={r.StatusCode}
                                                        text={r.DynamicCurrentStep}
                                                        className="inline-flex justify-center text-[10px] md:text-xs"
                                                    />
                                                    {overdue && (
                                                        <div className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] md:text-[10px] font-bold text-red-700 leading-tight">
                                                            Quá hạn {Number(r.OverdueDays)} ngày
                                                        </div>
                                                    )}
                                                    {r.StatusCode === "WAITING_FEEDBACK" && r.PendingDepts && (
                                                        <div className="w-full max-w-56 text-center text-[9px] md:text-[10px] text-slate-400 font-medium italic leading-tight whitespace-normal break-words">
                                                            Chờ: {r.PendingDepts}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 md:p-5 text-center">
                                                <Link
                                                    to={`/reports/${r.ReportID}`}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="p-12 text-center text-slate-500 font-medium tracking-wide"
                                    >
                                        Không tìm thấy báo cáo nào phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Control */}
            {!loading && meta.totalRows > 0 && (
                <div className="md:sticky md:bottom-0 z-30 flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/95 px-2.5 py-2 shadow-sm shadow-slate-900/5 backdrop-blur text-slate-600 font-medium md:px-4 md:py-3 md:shadow-lg md:shadow-slate-900/10">
                    {/* Rows per page selector */}
                    <div className="flex min-w-0 items-center gap-1.5 md:gap-3">
                        <span className="hidden text-[11px] text-slate-500 sm:inline md:text-[13px]">Dòng/trang:</span>
                        <StaticSelect
                            options={PAGE_SIZE_OPTIONS}
                            value={pageSize}
                            onSelect={(opt) => {
                                setPageSize(Number(opt?.value || 20));
                                setPage(1);
                            }}
                            className="w-16 md:w-22"
                            controlClassName="h-8 min-h-8 rounded-xl bg-slate-50 px-2 py-0 text-xs border-slate-200 shadow-inner shadow-slate-100/70 md:h-10 md:text-sm md:px-3"
                            valueClassName="text-xs md:text-sm"
                            clearable={false}
                            searchable={false}
                            menuPlacement="top"
                        />
                    </div>

                    {/* Status Text */}
                    <div className="min-w-0 flex-1 truncate rounded-xl bg-slate-50 px-2.5 py-1.5 text-center text-[11px] tracking-tight text-slate-500 md:flex-none md:px-4 md:py-2 md:text-sm">
                        <span className="font-black text-slate-800">{page}</span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className="font-black text-slate-800">{Math.max(1, meta.totalPages)}</span>
                        <span className="mx-1.5 text-slate-300">•</span>
                        <span className="font-bold text-slate-700">
                            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, meta.totalRows)}
                        </span>
                        <span className="hidden sm:inline">/{meta.totalRows}</span>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5 md:p-1">
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:shadow-none transition-all active:scale-95 md:h-9 md:w-9"
                            title="Trang trước"
                        >
                            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:shadow-none transition-all active:scale-95 md:h-9 md:w-9"
                            title="Trang sau"
                        >
                            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

