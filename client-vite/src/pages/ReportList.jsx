import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Eye } from 'lucide-react';
import api, { formatMoney, formatDate } from '../utils/api';
import StatusBadge from '../components/ui/StatusBadge';
import { useUI } from '../context/UIContext';

export default function ReportList() {
    const { showToast } = useUI();
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const query = `?pageNumber=1&pageSize=50&keyword=${encodeURIComponent(keyword)}&statusCode=${status}`;
            const { data } = await api.get(`/reports${query}`);
            console.log(data)
            if (data.success) {
                setReports(data.data.items || []);
            }
        } catch {
            showToast('Lỗi tải danh sách báo cáo', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        loadData();
    };

    return (
        <div className="max-w-8xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex items-center gap-4">
                    <div className="relative flex-1 max-w-lg">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
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
                            onChange={e => setStatus(e.target.value)}
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
                    <button type="submit" className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm active:scale-95">
                        Tìm kiếm
                    </button>
                </form>

                <Link to="/reports/create" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 flex items-center transition-all active:scale-95">
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
                                <th className="p-5 font-bold tracking-wide">Lệnh SX / Mã hàng</th>
                                <th className="p-5 font-bold tracking-wide">Loại phát sinh</th>
                                <th className="p-5 font-bold tracking-wide">Bộ phận chịu TN</th>
                                <th className="p-5 text-right font-bold tracking-wide">Tổng CP (VNĐ)</th>
                                <th className="p-5 text-center font-bold tracking-wide">Trạng thái</th>
                                <th className="p-5 text-center font-bold tracking-wide">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-12 text-center text-slate-500 font-medium">Đang tải danh sách báo cáo...</td></tr>
                            ) : reports.length > 0 ? (
                                reports.map(r => (
                                    <tr key={r.ReportID} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-5">
                                            <Link to={`/reports/${r.ReportID}`} className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                                {r.ReportNo}
                                            </Link>
                                            <div className="text-xs text-slate-500 mt-1 font-medium">{formatDate(r.CreatedAt)}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-bold text-slate-700">{r.OrderCode || 'N/A'}</div>
                                            <div className="text-sm text-slate-500 mt-1 truncate max-w-[200px]">{r.ProductName || ''}</div>
                                        </td>
                                        <td className="p-5 font-medium text-slate-700">
                                            {r.ExceptionTypeName}
                                        </td>
                                        <td className="p-5 font-medium text-slate-700">
                                            {r.ResponsibleDeptName || r.ResponsibleDeptCode}
                                        </td>
                                        <td className="p-5 text-right font-bold text-red-600">
                                            {r.HasCost ? formatMoney(r.EstimatedTotalCost) : '-'}
                                        </td>
                                        <td className="p-5 text-center whitespace-nowrap">
                                            <StatusBadge status={r.StatusCode} />
                                        </td>
                                        <td className="p-5 text-center">
                                            <Link to={`/reports/${r.ReportID}`} className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="7" className="p-12 text-center text-slate-500 font-medium tracking-wide">Không tìm thấy báo cáo nào phù hợp.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
