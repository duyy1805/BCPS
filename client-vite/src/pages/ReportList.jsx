import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Eye, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import api, { formatMoney, formatDate } from "../utils/api";
import StatusBadge from "../components/ui/StatusBadge";
import { useUI } from "../context/UIContext";
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

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-175 md:min-w-0">
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
                                reports.map((r) => (
                                    <tr
                                        key={r.ReportID}
                                        className="hover:bg-slate-50/80 transition-colors group"
                                    >
                                        <td className="p-4 md:p-5">
                                            <Link
                                                to={`/reports/${r.ReportID}`}
                                                className="font-bold text-slate-800 text-sm md:text-base group-hover:text-blue-600 transition-colors"
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
                                ))
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
                <div className="sticky bottom-0 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur text-slate-600 font-medium">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] md:text-[13px] text-slate-500">Dòng/trang:</span>
                        <StaticSelect
                            options={PAGE_SIZE_OPTIONS}
                            value={pageSize}
                            onSelect={(opt) => {
                                setPageSize(Number(opt?.value || 20));
                                setPage(1);
                            }}
                            className="w-22"
                            controlClassName="h-10 rounded-xl bg-slate-50 px-3 py-0 text-sm border-slate-200 shadow-inner shadow-slate-100/70"
                            valueClassName="text-sm"
                            clearable={false}
                            searchable={false}
                        />
                    </div>

                    {/* Status Text */}
                    <div className="rounded-xl bg-slate-50 px-4 py-2 text-xs md:text-sm tracking-tight text-slate-500">
                        <span className="font-bold text-slate-800">
                            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, meta.totalRows)}
                        </span>
                        <span className="mx-1.5 text-slate-300">/</span>
                        <span className="font-bold text-slate-800">{meta.totalRows}</span>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:shadow-none transition-all active:scale-95"
                            title="Trang trước"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-blue-600 hover:shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 disabled:hover:shadow-none transition-all active:scale-95"
                            title="Trang sau"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

