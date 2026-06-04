import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, AlertTriangle } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api, { formatMoney, formatDate } from '../utils/api';
import { useUI } from '../context/UIContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
    const navigate = useNavigate();
    const { showToast } = useUI();

    const [filter, setFilter] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
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

    const loadData = async () => {
        setLoading(true);
        try {
            const query = `?fromDate=${filter.fromDate}&toDate=${filter.toDate}`;
            const res = await api.get(`/dashboard/management${query}`);
            if (res.data.success && res.data.data) {
                setData(prev => ({ ...prev, ...res.data.data }));
            }
        } catch {
            showToast('Lỗi tải dữ liệu Dashboard', 'error');
        } finally {
            setLoading(false);
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
                <button className="w-full justify-center bg-slate-50 text-slate-700 px-5 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 flex items-center transition-all lg:w-auto">
                    <Download className="w-4 h-4 mr-2" /> Xuất Excel
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
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                        <div className="text-slate-500 text-sm font-bold mb-2">Quá hạn xử lý</div>
                        <div className="text-3xl md:text-4xl font-extrabold text-red-600">{data.summary.OverdueOpenCount || 0}</div>
                    </div>
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

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-red-100 bg-red-50/80 font-bold text-red-800 shrink-0 flex justify-between items-center">
                        <span>Cần xử lý khẩn cấp (Quá hạn)</span>
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="p-0 overflow-auto max-h-80 custom-scrollbar mobile-table-wrap">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 shadow-sm">
                                <tr>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Mã BCPS</th>
                                    <th className="p-3 md:p-4 font-bold text-slate-600">Người chịu TN</th>
                                    <th className="p-3 md:p-4 text-right font-bold text-slate-600">Quá hạn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(!data.overdueItems || data.overdueItems.length === 0) ? (
                                    <tr><td colSpan="3" className="p-6 text-center text-emerald-600 font-bold">Tuyệt vời! Không có báo cáo nào quá hạn.</td></tr>
                                ) : (
                                    data.overdueItems.map((item, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => navigate(`/reports/${item.ReportID}`)}
                                            className="hover:bg-red-50/50 cursor-pointer transition-colors group"
                                        >
                                            <td className="p-3 md:p-4 font-bold text-blue-600 group-hover:text-blue-700 group-hover:underline">{item.ReportNo}</td>
                                            <td className="p-3 md:p-4 font-medium text-slate-700">{item.MainResponsibleEmpName || 'N/A'}</td>
                                            <td className="p-3 md:p-4 text-right">
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs">{item.OverdueDays} ngày</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
