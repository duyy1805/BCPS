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
            const isManagerOrBGD =
                roles.includes("VT_MANAGER") || roles.includes("BGD");
            const onlyPending =
                isManagerOrBGD && onlyMyPending ? "&onlyNeedMyApproval=true" : "";

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
        <div className="max-w-8xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <form
                    onSubmit={handleSearch}
                    className="flex-1 flex items-center gap-4"
                >
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="Tiềm kiếm theo số BCPS, Lệnh SX, Mã hàng..."
                            className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="block w-48 pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium appearance-none"
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

                    {(user?.roles?.includes("VT_MANAGER") ||
                        user?.roles?.includes("BGD")) && (
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-white transition-all shadow-sm">
                                <input
                                    type="checkbox"
                                    checked={onlyMyPending}
                                    onChange={(e) => setOnlyMyPending(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-slate-700 select-none whitespace-nowrap">
                                    Chờ tôi duyệt
                                </span>
                            </label>
                        )}

                    <button
                        type="submit"
                        className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm active:scale-95"
                    >
                        Tìm kiếm
                    </button>
                </form>

                <Link
                    to="/reports/create"
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 flex items-center transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" /> Tạo báo cáo
                </Link>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                                <th className="p-5 font-bold tracking-wide">Mã BCPS / Ngày</th>
                                <th className="p-5 font-bold tracking-wide">
                                    Lệnh SX / Mã hàng
                                </th>
                                <th className="p-5 font-bold tracking-wide">Loại phát sinh</th>
                                <th className="p-5 font-bold tracking-wide">Bộ phận chịu TN</th>
                                <th className="p-5 text-right font-bold tracking-wide">
                                    Tổng CP (VNĐ)
                                </th>
                                <th className="p-5 text-center font-bold tracking-wide">
                                    Trạng thái
                                </th>
                                <th className="p-5 text-center font-bold tracking-wide">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="7"
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
                                        <td className="p-5">
                                            <Link
                                                to={`/reports/${r.ReportID}`}
                                                className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors"
                                            >
                                                {r.ReportNo}
                                            </Link>
                                            <div className="text-xs text-slate-500 mt-1 font-medium">
                                                {formatDate(r.CreatedAt, false)}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-slate-700">
                                                {r.OrderCode || "N/A"}
                                            </div>
                                            <div className="text-sm text-slate-500 mt-1 truncate max-w-[200px]">
                                                {r.ProductName || ""}
                                            </div>
                                        </td>
                                        <td className="p-5 font-medium text-slate-700">
                                            {r.ExceptionTypeName}
                                        </td>
                                        <td className="p-5 font-medium text-slate-700">
                                            {r.ResponsibleDeptName || r.ResponsibleDeptCode}
                                        </td>
                                        <td className="p-5 text-right font-bold text-red-600">
                                            {r.HasCost ? formatMoney(r.EstimatedTotalCost) : "-"}
                                        </td>
                                        <td className="p-5 text-center whitespace-nowrap">
                                            <StatusBadge
                                                status={r.StatusCode}
                                                text={r.DynamicCurrentStep}
                                            />
                                        </td>
                                        <td className="p-5 text-center">
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
                                        colSpan="7"
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

            {/* Pagination Control - Style Material/DataTable like requested */}
            {!loading && meta.totalRows > 0 && (
                <div className="flex items-center justify-end gap-8 px-2 py-4 text-slate-600 font-medium">
                    {/* Rows per page selector */}
                    <div className="flex items-center gap-3">
                        <span className="text-[13px] text-slate-500">Số dòng/trang:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-transparent border-none outline-none text-[13px] font-bold text-slate-700 cursor-pointer focus:ring-0 appearance-none pr-1"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        {/* Custom arrow for select if needed, or keep it standard */}
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500 -ml-1 mt-0.5 pointer-events-none"></div>
                    </div>

                    {/* Status Text: x-y trên z */}
                    <div className="text-[13px] tracking-tight">
                        <span className="font-bold text-slate-800">
                            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, meta.totalRows)}
                        </span>
                        <span className="mx-1 text-slate-400">trên</span>
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

/**
 * Helper to combine class names
 */
function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}