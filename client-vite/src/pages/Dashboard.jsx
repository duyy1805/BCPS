import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api, { formatMoney, formatDate } from '../utils/api';
import { useUI } from '../context/UIContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const toLocalIsoDate = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
].join('-');

export default function Dashboard() {
    const navigate = useNavigate();
    const { showToast } = useUI();

    const [filter, setFilter] = useState({
        fromDate: toLocalIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        toDate: toLocalIsoDate(new Date())
    });

    const [data, setData] = useState({
        summary: null,
        trendByDay: [],
        statusBreakdown: [],
        topOccurredDepartments: [],
        topResponsibleDepartments: [],
        topResponsibleEmployees: [],
        topCausedByDepartments: [],
        overdueItems: []
    });
    const [loading, setLoading] = useState(true);
    const [overdueLoading, setOverdueLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [overdue, setOverdue] = useState({ items: [], total: 0, dateRangeTotal: 0, page: 1, pageSize: 20 });
    const [overdueFilters, setOverdueFilters] = useState({
        keyword: '',
        statusCode: '',
        waitingDepartment: '',
        sortBy: 'overdueDays',
        sortDirection: 'DESC',
        pageSize: 20
    });
    const overdueSectionRef = useRef(null);

    const getOverdueParams = (page = 1, activeFilters = overdueFilters) => ({
        fromDate: filter.fromDate,
        toDate: filter.toDate,
        keyword: activeFilters.keyword,
        statusCode: activeFilters.statusCode,
        waitingDepartment: activeFilters.waitingDepartment,
        sortBy: activeFilters.sortBy,
        sortDirection: activeFilters.sortDirection,
        page,
        pageSize: activeFilters.pageSize
    });

    const loadOverdue = async (page = 1, showError = true, activeFilters = overdueFilters) => {
        setOverdueLoading(true);
        try {
            const res = await api.get('/dashboard/overdue', { params: getOverdueParams(page, activeFilters) });
            if (res.data.success && res.data.data) setOverdue(res.data.data);
        } catch {
            if (showError) showToast('Lỗi tải danh sách phiếu quá hạn', 'error');
        } finally {
            setOverdueLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const query = `?fromDate=${filter.fromDate}&toDate=${filter.toDate}`;
            const [res] = await Promise.all([
                api.get(`/dashboard/management${query}`),
                loadOverdue(1, false)
            ]);
            if (res.data.success && res.data.data) {
                setData(prev => ({ ...prev, ...res.data.data }));
            }
        } catch {
            showToast('Lỗi tải dữ liệu Dashboard', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportOverdue = async () => {
        setExporting(true);
        try {
            const response = await api.get('/dashboard/overdue/export', {
                params: getOverdueParams(overdue.page),
                responseType: 'blob'
            });
            const disposition = response.headers['content-disposition'] || '';
            const match = disposition.match(/filename="?([^";]+)"?/i);
            const filename = match?.[1] || 'BCPS-phieu-qua-han.xlsx';
            const url = URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            showToast('Không thể xuất dữ liệu quá hạn', 'error');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const trendChartData = {
        labels: data.trendByDay.map(d => formatDate(d.ReportDate).split(' ')[1] || d.ReportDate.substring(5, 10)),
        datasets: [
            {
                label: 'Không chi phí',
                data: data.trendByDay.map(d => d.ReportCount - d.HasCostCount),
                borderColor: '#3b82f6',
                backgroundColor: '#3b82f6',
                tension: 0.3,
                borderWidth: 3
            },
            {
                label: 'Có chi phí',
                data: data.trendByDay.map(d => d.HasCostCount),
                borderColor: '#ef4444',
                backgroundColor: '#ef4444',
                tension: 0.3,
                borderWidth: 3
            }
        ]
    };

    const statusColors = {
        'DRAFT': '#94a3b8',
        'WAITING_FEEDBACK': '#f97316',
        'WAITING_APPROVAL': '#06b6d4',
        'APPROVED': '#22c55e',
        'PROCESSING': '#3b82f6',
        'CLOSED': '#10b981',
        'REJECTED': '#ef4444'
    };

    const statusChartData = {
        labels: data.statusBreakdown.map(d => d.StatusName || d.StatusCode),
        datasets: [{
            data: data.statusBreakdown.map(d => d.ReportCount),
            backgroundColor: data.statusBreakdown.map(d => statusColors[d.StatusCode] || '#cbd5e1'),
            borderWidth: 1
        }]
    };

    const chartColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899',
        '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#ef4444'
    ];

    const causedByDeptChartData = {
        labels: (data.topCausedByDepartments || []).map(d => d.OccurredDeptName_NT || d.OccurredDeptCode_NT || 'N/A'),
        datasets: [{
            data: (data.topCausedByDepartments || []).map(d => d.ReportCount),
            backgroundColor: (data.topCausedByDepartments || []).map((_, i) => chartColors[(i + 2) % chartColors.length]),
            borderWidth: 1
        }]
    };

    const responsibleDeptChartData = {
        labels: (data.topResponsibleDepartments || []).map(d => d.ResponsibleDeptName || 'N/A'),
        datasets: [{
            data: (data.topResponsibleDepartments || []).map(d => d.ReportCount),
            backgroundColor: (data.topResponsibleDepartments || []).map((_, i) => chartColors[i % chartColors.length]),
            borderWidth: 1
        }]
    };

    const responsibleEmpChartData = {
        labels: (data.topResponsibleEmployees || []).map(d => d.MainResponsibleEmpName || 'N/A'),
        datasets: [{
            data: (data.topResponsibleEmployees || []).map(d => d.ReportCount),
            backgroundColor: (data.topResponsibleEmployees || []).map((_, i) => chartColors[i % chartColors.length]),
            borderWidth: 1
        }]
    };

    return (
        <div className="max-w-8xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto_1fr_auto] sm:items-center lg:w-auto">
                    <div className="font-bold text-slate-700 sm:whitespace-nowrap">Bộ lọc thời gian:</div>
                    <input
                        type="date"
                        value={filter.fromDate}
                        onChange={e => setFilter({ ...filter, fromDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    />
                    <span className="hidden text-slate-400 font-bold sm:block">-</span>
                    <input
                        type="date"
                        value={filter.toDate}
                        onChange={e => setFilter({ ...filter, toDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                    />
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 sm:w-auto"
                    >
                        {loading ? 'Đang tải...' : 'Áp dụng'}
                    </button>
                </div>
                <button
                    onClick={exportOverdue}
                    disabled={exporting || overdueLoading}
                    className="w-full justify-center bg-slate-50 text-slate-700 px-5 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 flex items-center transition-all disabled:opacity-50 lg:w-auto"
                >
                    <Download className="w-4 h-4 mr-2" /> {exporting ? 'Đang xuất...' : 'Xuất Excel quá hạn'}
                </button>
            </div>

            {/* KPIs */}
            {data.summary ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-sm font-bold mb-2">Tổng báo cáo</div>
                        <div className="text-3xl md:text-4xl font-extrabold text-slate-800">{data.summary.TotalReports || 0}</div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-sm font-bold mb-2">Chờ phản hồi / phê duyệt</div>
                        <div className="text-3xl md:text-4xl font-extrabold text-slate-800">
                            {(data.summary.WaitingFeedbackCount || 0) + (data.summary.WaitingApprovalCount || 0)}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => overdueSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow text-left"
                    >
                        <div className="text-slate-500 text-sm font-bold mb-2">Quá hạn xử lý</div>
                        <div className="text-3xl md:text-4xl font-extrabold text-red-600">{overdue.dateRangeTotal || 0}</div>
                    </button>
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-sm font-bold mb-2">Tổng chi phí dự tính</div>
                        <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 truncate" title={data.summary.TotalEstimatedCost || 0}>
                            {formatMoney(data.summary.TotalEstimatedCost || 0)}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-6 md:p-12 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500 font-medium">
                    {loading ? 'Đang tải KPI...' : 'Không có dữ liệu'}
                </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:col-span-2">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Xu hướng phát sinh theo ngày</div>
                    <div className="p-3 md:p-6 h-64 md:h-80 flex-1">
                        <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Cơ cấu theo Trạng thái</div>
                    <div className="p-3 md:p-6 flex-1 flex items-center justify-center">
                        <div className="h-56 md:h-64 w-full">
                            <Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } }, cutout: '65%' }} />
                        </div>
                    </div>
                </div>
            </div>



            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm">Cơ cấu Đơn vị gây phát sinh</div>
                    <div className="p-4 flex-1 flex items-center justify-center">
                        <div className="h-52 md:h-56 w-full">
                            {(!data.topCausedByDepartments || data.topCausedByDepartments.length === 0) ? (
                                <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm">Không có dữ liệu</div>
                            ) : (
                                <Doughnut data={causedByDeptChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }} />
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm">Cơ cấu BP chịu trách nhiệm</div>
                    <div className="p-4 flex-1 flex items-center justify-center">
                        <div className="h-52 md:h-56 w-full">
                            {(!data.topResponsibleDepartments || data.topResponsibleDepartments.length === 0) ? (
                                <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm">Không có dữ liệu</div>
                            ) : (
                                <Doughnut data={responsibleDeptChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }} />
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm">Cơ cấu Nhân viên phụ trách</div>
                    <div className="p-4 flex-1 flex items-center justify-center">
                        <div className="h-52 md:h-56 w-full">
                            {(!data.topResponsibleEmployees || data.topResponsibleEmployees.length === 0) ? (
                                <div className="h-full flex items-center justify-center text-slate-400 font-medium text-sm">Không có dữ liệu</div>
                            ) : (
                                <Doughnut data={responsibleEmpChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '60%' }} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 md:gap-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Top Bộ phận xảy ra lỗi</div>
                    <div className="p-0 overflow-auto max-h-80 custom-scrollbar mobile-table-wrap">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm">
                                <tr>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Bộ phận</th>
                                    <th className="p-3 md:p-4 text-center font-bold text-slate-600">Số lượng BC</th>
                                    <th className="p-3 md:p-4 text-right font-bold text-slate-600">Chi phí (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!data.topOccurredDepartments || data.topOccurredDepartments.length === 0) ? (
                                    <tr><td colSpan="3" className="p-6 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                                ) : (
                                    data.topOccurredDepartments.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 md:p-4 font-bold text-slate-700">{d.OccurredDepartmentName || d.OccurredDepartmentCode}</td>
                                            <td className="p-3 md:p-4 text-center font-bold text-slate-800 bg-slate-50/50">{d.ReportCount}</td>
                                            <td className="p-3 md:p-4 text-right font-bold text-red-600">{formatMoney(d.TotalEstimatedCost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Top Đơn vị gây phát sinh</div>
                    <div className="p-0 overflow-auto max-h-80 custom-scrollbar mobile-table-wrap">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm">
                                <tr>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Đơn vị</th>
                                    <th className="p-3 md:p-4 text-center font-bold text-slate-600">Số lượng BC</th>
                                    <th className="p-3 md:p-4 text-right font-bold text-slate-600">Chi phí (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!data.topCausedByDepartments || data.topCausedByDepartments.length === 0) ? (
                                    <tr><td colSpan="3" className="p-6 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                                ) : (
                                    data.topCausedByDepartments.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 md:p-4 font-bold text-slate-700">{d.OccurredDeptName_NT || d.OccurredDeptCode_NT || 'N/A'}</td>
                                            <td className="p-3 md:p-4 text-center font-bold text-slate-800 bg-slate-50/50">{d.ReportCount}</td>
                                            <td className="p-3 md:p-4 text-right font-bold text-red-600">{formatMoney(d.TotalEstimatedCost)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Top Bộ phận chịu trách nhiệm</div>
                    <div className="p-0 overflow-auto max-h-80 custom-scrollbar mobile-table-wrap">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm">
                                <tr>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Bộ phận</th>
                                    <th className="p-3 md:p-4 text-right font-bold text-slate-600">Số lượng BC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!data.topResponsibleDepartments || data.topResponsibleDepartments.length === 0) ? (
                                    <tr><td colSpan="2" className="p-6 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                                ) : (
                                    data.topResponsibleDepartments.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 md:p-4 font-bold text-slate-700">{d.ResponsibleDeptName || 'N/A'}</td>
                                            <td className="p-3 md:p-4 text-right font-bold text-slate-800 bg-slate-50/50">{d.ReportCount}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 shrink-0 text-sm md:text-base">Top Nhân viên phụ trách</div>
                    <div className="p-0 overflow-auto max-h-80 custom-scrollbar mobile-table-wrap">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm">
                                <tr>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Nhân viên</th>
                                    <th className="p-3 md:p-4 text-right font-bold text-slate-600">Số lượng BC</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!data.topResponsibleEmployees || data.topResponsibleEmployees.length === 0) ? (
                                    <tr><td colSpan="2" className="p-6 text-center text-slate-500 font-medium">Không có dữ liệu</td></tr>
                                ) : (
                                    data.topResponsibleEmployees.map((d, i) => (
                                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3 md:p-4 font-bold text-slate-700">{d.MainResponsibleEmpName || 'N/A'}</td>
                                            <td className="p-3 md:p-4 text-right font-bold text-slate-800 bg-slate-50/50">{d.ReportCount}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <section ref={overdueSectionRef} className="scroll-mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex flex-col gap-2 px-4 py-4 border-b border-slate-100 bg-red-50/40 md:px-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="font-extrabold text-slate-900">Danh sách phiếu đang quá hạn</h2>
                        <p className="mt-1 text-xs text-slate-500">Khoảng thời gian phía trên được áp dụng theo hạn xử lý của phiếu.</p>
                    </div>
                    <div className="text-sm font-bold text-red-700">{overdue.total} phiếu</div>
                </div>

                <div className="grid grid-cols-1 gap-3 p-4 border-b border-slate-100 md:grid-cols-2 xl:grid-cols-5 md:p-5">
                    <label className="relative xl:col-span-2">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            value={overdueFilters.keyword}
                            onChange={e => setOverdueFilters({ ...overdueFilters, keyword: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') loadOverdue(1); }}
                            placeholder="Mã phiếu, nội dung, người tạo"
                            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </label>
                    <select
                        value={overdueFilters.statusCode}
                        onChange={e => setOverdueFilters({ ...overdueFilters, statusCode: e.target.value })}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="WAITING_FEEDBACK">Chờ phản hồi</option>
                        <option value="WAITING_APPROVAL">Chờ phê duyệt</option>
                        <option value="NEED_SUPPLEMENT">Yêu cầu bổ sung</option>
                        <option value="APPROVED">Đã phê duyệt</option>
                        <option value="PROCESSING">Đang xử lý</option>
                    </select>
                    <input
                        value={overdueFilters.waitingDepartment}
                        onChange={e => setOverdueFilters({ ...overdueFilters, waitingDepartment: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') loadOverdue(1); }}
                        placeholder="Bộ phận đang chờ"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-2">
                        <select
                            value={`${overdueFilters.sortBy}:${overdueFilters.sortDirection}`}
                            onChange={e => {
                                const [sortBy, sortDirection] = e.target.value.split(':');
                                setOverdueFilters({ ...overdueFilters, sortBy, sortDirection });
                            }}
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                            <option value="overdueDays:DESC">Quá hạn lâu nhất</option>
                            <option value="overdueDays:ASC">Quá hạn ít nhất</option>
                            <option value="dueDate:ASC">Hạn xử lý tăng dần</option>
                            <option value="dueDate:DESC">Hạn xử lý giảm dần</option>
                            <option value="createdAt:DESC">Tạo mới nhất</option>
                            <option value="createdAt:ASC">Tạo cũ nhất</option>
                        </select>
                        <button
                            type="button"
                            onClick={() => loadOverdue(1)}
                            disabled={overdueLoading}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Lọc
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[1750px] w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-xs uppercase tracking-wide text-slate-500">
                                <th className="p-3">Mã phiếu / Nội dung</th>
                                <th className="p-3">Ngày tạo</th>
                                <th className="p-3">Hạn xử lý</th>
                                <th className="p-3 text-center">Quá hạn</th>
                                <th className="p-3">Người tạo / Bộ phận</th>
                                <th className="p-3">Trạng thái / Bước hiện tại</th>
                                <th className="p-3">Đang chờ bộ phận</th>
                                <th className="p-3">Lý do quá hạn</th>
                                <th className="p-3">Bộ phận chậm đầu tiên</th>
                                <th className="p-3">Người phụ trách chính</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {overdueLoading ? (
                                <tr><td colSpan="10" className="p-10 text-center font-medium text-slate-500">Đang tải dữ liệu quá hạn...</td></tr>
                            ) : overdue.items.length === 0 ? (
                                <tr><td colSpan="10" className="p-10 text-center font-medium text-slate-500">Không có phiếu quá hạn phù hợp bộ lọc.</td></tr>
                            ) : overdue.items.map(item => (
                                <tr
                                    key={item.ReportID}
                                    tabIndex="0"
                                    role="button"
                                    onClick={() => navigate(`/reports/${item.ReportID}`)}
                                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/reports/${item.ReportID}`); }}
                                    className="cursor-pointer bg-red-50/20 align-top hover:bg-red-50/70 focus:bg-red-50 focus:outline-none"
                                >
                                    <td className="p-3 max-w-80">
                                        <div className="font-extrabold text-blue-700">{item.ReportNo}</div>
                                        <div className="mt-1 line-clamp-2 text-xs text-slate-600" title={item.ShortDescription}>{item.ShortDescription}</div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap text-slate-700">{formatDate(item.CreatedAt)}</td>
                                    <td className="p-3 whitespace-nowrap font-bold text-slate-800">{formatDate(item.DueDate, false)}</td>
                                    <td className="p-3 text-center"><span className="inline-flex whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-extrabold text-red-700">{item.OverdueDays} ngày</span></td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{item.CreatedByEmpName || 'Chưa xác định'}</div>
                                        <div className="mt-1 text-xs text-slate-500">{item.CreatorDepartment}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{item.StatusName}</div>
                                        <div className="mt-1 text-xs text-slate-500">{item.CurrentStep}</div>
                                    </td>
                                    <td className="p-3 font-bold text-orange-700">{item.WaitingDepartment}</td>
                                    <td className="p-3 max-w-80 text-slate-700">{item.OverdueReason}</td>
                                    <td className="p-3 font-semibold text-slate-700">{item.FirstLateDepartment || '—'}</td>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{item.MainResponsibleEmpName || 'Chưa xác định'}</div>
                                        <div className="mt-1 text-xs text-slate-500">{item.ResponsibleDeptName}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Hiển thị</span>
                        <select
                            value={overdueFilters.pageSize}
                            onChange={e => {
                                const nextFilters = { ...overdueFilters, pageSize: Number(e.target.value) };
                                setOverdueFilters(nextFilters);
                                loadOverdue(1, true, nextFilters);
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1"
                        >
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                        <span>phiếu/trang</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => loadOverdue(overdue.page - 1)}
                            disabled={overdueLoading || overdue.page <= 1}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            aria-label="Trang trước"
                        ><ChevronLeft className="h-4 w-4" /></button>
                        <span className="min-w-28 text-center text-sm font-bold text-slate-700">
                            Trang {overdue.page} / {Math.max(1, Math.ceil(overdue.total / overdue.pageSize))}
                        </span>
                        <button
                            type="button"
                            onClick={() => loadOverdue(overdue.page + 1)}
                            disabled={overdueLoading || overdue.page >= Math.ceil(overdue.total / overdue.pageSize)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            aria-label="Trang sau"
                        ><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
            </section>
        </div>
    );
}
