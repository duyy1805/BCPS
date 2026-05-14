import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Filter, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import api, { formatMoney, formatDate } from "../utils/api";
import StatusBadge from "../components/ui/StatusBadge";
import { useUI } from "../context/UIContext";
import { useAuth } from "../context/AuthContext";

export default function ReportList() {
    const { showToast } = useUI();
    const { user } = useAuth();
    const [keyword, setKeyword] = useState("");
    const [status, setStatus] = useState("");
    const [onlyMyPending, setOnlyMyPending] = useState(true);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [meta, setMeta] = useState({ totalRows: 0, totalPages: 0 });

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

            const query = `?pageNumber=${pageNum}&pageSize=${pageSize}&keyword=${encodeURIComponent(keyword)}&statusCode=${status}${onlyPending}`;
            const { data } = await api.get(`/reports${query}`);
            if (data.success) {
                setReports(data.data.items || []);
                setMeta(data.data.meta || { totalRows: 0, totalPages: 0 });
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

    // Reset to page 1 when status or onlyMyPending filters change
    useEffect(() => {
        setPage(1);
        loadData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, onlyMyPending]);

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
                    <div className="flex flex-row gap-3">
                        <div className="relative flex-1 md:flex-none">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="block w-full md:w-48 pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="DRAFT">Nháp</option>
                                <option value="WAITING_FEEDBACK">Chờ phản hồi</option>
                                <option value="WAITING_APPROVAL">Chờ phê duyệt</option>
                                <option value="APPROVED">Đã duyệt</option>
                                <option value="REJECTED">Từ chối</option>
                                <option value="CLOSED">Đã đóng</option>
                            </select>
                        </div>

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
                                <th className="p-4 md:p-5 font-bold tracking-wide text-xs md:text-sm hidden sm:table-cell">Lệnh SX / Mã hàng</th>
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
                                            <div className="font-bold text-slate-700 text-sm">
                                                {r.OrderCode || "N/A"}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 truncate max-w-37.5 lg:max-w-50">
                                                {r.ProductName || ""}
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
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-4 md:gap-8 px-2 py-4 text-slate-600 font-medium border-t border-slate-100 sm:border-none">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] md:text-[13px] text-slate-500">Dòng/trang:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-transparent border-none outline-none text-[11px] md:text-[13px] font-bold text-slate-700 cursor-pointer focus:ring-0 appearance-none pr-1"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-500 -ml-1 mt-0.5 pointer-events-none"></div>
                    </div>

                    {/* Status Text */}
                    <div className="text-[11px] md:text-[13px] tracking-tight">
                        <span className="font-bold text-slate-800">
                            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, meta.totalRows)}
                        </span>
                        <span className="mx-1 text-slate-400">/</span>
                        <span className="font-bold text-slate-800">{meta.totalRows}</span>
                    </div>

                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                            title="Trang trước"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90"
                            title="Trang sau"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

