import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Clock, AlertTriangle, ListTree, HelpCircle, Send,
    MessageSquare, DollarSign, CheckSquare, Archive, CheckCircle, XCircle, Plus, Trash2, ChevronLeft
} from 'lucide-react';
import api, { formatDate, formatMoney } from '../utils/api';
import { useUI } from '../context/UIContext';
import StatusBadge from '../components/ui/StatusBadge';
import { cn } from '../context/UIContext';
import SearchSelect from '../components/ui/SearchSelect';

export default function ReportDetail() {
    const { id } = useParams();
    const { showToast, confirm, prompt } = useUI();

    const [data, setData] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // ── Response Modal ──────────────────────────────────────────
    const [showRespModal, setShowRespModal] = useState(false);
    const [respForm, setRespForm] = useState({
        departmentCode: '',
        responseContent: '',
        causeAssessment: '',
        proposedAction: '',
        hasDeptCost: false
    });

    // ── Cost Modal ──────────────────────────────────────────────
    const [showCostModal, setShowCostModal] = useState(false);
    const [costForm, setCostForm] = useState({
        departmentCode: '',
        costTypeId: '',
        costItemDesc: '',
        qty: '',
        unitCost: '',
        manualAmount: '',
        note: '',
        useManual: false           // true = nhập thẳng thành tiền; false = qty × unitCost
    });

    // Danh sách CostType (load từ master data khi mở modal)
    const [costTypes, setCostTypes] = useState([]);

    useEffect(() => {
        if (id && id !== 'undefined') {
            loadDetail();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        try {
            // Tách riêng 2 call để tránh call này lỗi kéo theo call kia (đặc biệt là available-actions hay bị 403 nếu k có quyền)
            const detailRes = await api.get(`/reports/${id}`);

            if (detailRes.data.success) {
                setData(detailRes.data.data);

                // Load actions sau khi đã có thông tin report
                try {
                    const actionRes = await api.get(`/reports/${id}/available-actions`);
                    setActions(actionRes.data.success ? actionRes.data.data : {});
                } catch (err) {
                    console.warn("Could not load actions:", err);
                    setActions({});
                }
            } else {
                setData(null);
            }
        } catch (err) {
            console.error("Error loading report:", err);
            // Nếu lỗi 403/401 thì interceptor đã xử lý hoặc sẽ throw ra đây
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionFn, successMsg) => {
        try {
            const res = await actionFn();
            if (res.data.success) {
                showToast(successMsg, 'success');
                setTimeout(loadDetail, 1000);
            } else {
                showToast(res.data.message || 'Lỗi thao tác', 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Lỗi thao tác', 'error');
        }
    };

    const submitReport = async () => {
        const ok = await confirm("Xác nhận", "Bạn có chắc chắn muốn trình phản hồi báo cáo này?");
        if (ok) handleAction(() => api.post(`/reports/${id}/submit`), "Trình báo cáo thành công!");
    };

    const submitApprovalReq = async () => {
        const ok = await confirm("Xác nhận", "Xác nhận Trình Phê duyệt hồ sơ này?");
        if (ok) handleAction(() => api.post(`/reports/${id}/submit-approval`), "Đã trình phê duyệt thành công!");
    };

    const closeReportAction = async () => {
        const summary = await prompt("Kết luận đóng hồ sơ", "Nhập tóm tắt kết quả xử lý...");
        if (summary) {
            handleAction(() => api.post(`/reports/${id}/close`, {
                finalResultSummary: summary,
                closureNote: "Hồ sơ kết thúc từ giao diện Web."
            }), "Đã ĐÓNG hồ sơ thành công!");
        }
    };

    const approveReport = async (decision) => {
        const actionName = decision === 'RETURNED' ? 'Trả lại bổ sung' : (decision === 'REJECTED' ? 'Từ chối' : 'Phê duyệt');
        const note = await prompt(`Xác nhận ${actionName}`, `Nhập ghi chú cho hành động [${actionName}]...`, decision !== 'APPROVED');
        if (decision !== 'APPROVED' && !note) return;

        handleAction(() => api.post(`/reports/${id}/approval-decision`, {
            decisionCode: decision,
            decisionComment: note || "Phê duyệt hồ sơ"
        }), `Thao tác ${actionName} thành công!`);
    };

    // ── Ghi phản hồi ────────────────────────────────────────────
    const submitResponse = async () => {
        if (!respForm.departmentCode || !respForm.responseContent)
            return showToast('Vui lòng nhập Mã Bộ Phận và Nội dung xác nhận', 'warning');
        try {
            const res = await api.post(`/reports/${id}/responses`, {
                ...respForm,
                processingResult: "Đã rà soát",
                responseStatusCode: "RESPONDED"
            });
            if (res.data.success) {
                showToast("Ghi phản hồi thành công!", "success");
                setShowRespModal(false);
                setRespForm({ departmentCode: '', responseContent: '', causeAssessment: '', proposedAction: '', hasDeptCost: false });
                loadDetail();
            }
        } catch (e) {
            showToast(e.response?.data?.message || 'Lỗi ghi phản hồi', 'error');
        }
    };

    // ── Mở modal chi phí + load costTypes ───────────────────────
    const openCostModal = async () => {
        if (costTypes.length === 0) {
            try {
                const res = await api.get('/report-form/master-data');
                if (res.data.success) setCostTypes(res.data.data.costTypes || []);
            } catch {
                showToast('Không tải được danh sách loại chi phí, vui lòng thử lại', 'error');
                return;
            }
        }
        setCostForm({ departmentCode: '', costTypeId: '', costItemDesc: '', qty: '', unitCost: '', manualAmount: '', note: '', useManual: false });
        setShowCostModal(true);
    };

    // ── Thêm dòng chi phí ────────────────────────────────────────
    const submitCostLine = async () => {
        if (!costForm.departmentCode) return showToast('Vui lòng nhập Mã Bộ Phận', 'warning');
        if (!costForm.costTypeId) return showToast('Vui lòng chọn Loại Chi Phí', 'warning');
        if (!costForm.costItemDesc) return showToast('Vui lòng nhập Mô tả khoản chi phí', 'warning');
        if (costForm.useManual && !costForm.manualAmount) return showToast('Vui lòng nhập Thành Tiền', 'warning');
        if (!costForm.useManual && (!costForm.qty || !costForm.unitCost)) return showToast('Vui lòng nhập Số lượng và Đơn giá', 'warning');

        const payload = {
            departmentCode: costForm.departmentCode,
            costTypeId: Number(costForm.costTypeId),
            costItemDesc: costForm.costItemDesc,
            note: costForm.note || null,
            qty: costForm.useManual ? null : Number(costForm.qty),
            unitCost: costForm.useManual ? null : Number(costForm.unitCost),
            manualAmount: costForm.useManual ? Number(costForm.manualAmount) : null
        };

        try {
            const res = await api.post(`/reports/${id}/cost-lines`, payload);
            if (res.data.success) {
                showToast("Đã thêm dòng chi phí!", "success");
                setShowCostModal(false);
                loadDetail();
            }
        } catch (e) {
            showToast(e.response?.data?.message || 'Lỗi thêm dòng chi phí', 'error');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="text-slate-500 font-bold animate-pulse text-lg tracking-tight">Đang tải hồ sơ...</div>
        </div>
    );

    if (!data || !data.report) return (
        <div className="max-w-xl mx-auto mt-12 p-12 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                <AlertTriangle className="w-10 h-10" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Không tìm thấy hồ sơ!</h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                    Hồ sơ <b className="text-slate-900">#{id}</b> không tồn tại hoặc bạn không có quyền xem thông tin này.
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
    console.log(r)
    const history = data.history || [];
    const costLines = data.costLines || [];

    // Tính tổng chi phí ước tính từ costLines (Amount = Computed)
    const totalCost = costLines.reduce((s, c) => s + (Number(c.Amount) || 0), 0);

    return (
        <div className="max-w-8xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        {r.ReportNo}
                        <StatusBadge status={r.StatusCode} />
                    </h1>
                    <div className="text-slate-500 font-medium mt-1">
                        {r.ExceptionTypeName || '--'} {r.ProductName ? `- ${r.ProductName}` : ''}
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                    {/* ── Action Buttons (dựa trên quyền từ API) ── */}

                    {/* Trình Phản Hồi: REPORTER khi phiếu ở DRAFT / NEED_SUPPLEMENT */}
                    {actions?.CanSubmit && (
                        <button onClick={submitReport} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200">
                            <Send className="w-4 h-4 mr-2" /> Trình Phản Hồi
                        </button>
                    )}

                    {/* Ghi Phản Hồi: DEPT_HANDLER khi phiếu WAITING_FEEDBACK & BP mình chưa phản hồi */}
                    {actions?.CanRespond && (
                        <button onClick={() => setShowRespModal(true)} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200">
                            <MessageSquare className="w-4 h-4 mr-2" /> Ghi Phản Hồi
                        </button>
                    )}

                    {/* Nhập Chi Phí: COST_HANDLER khi phiếu CÓ CHI PHÍ & đang chờ phản hồi/bổ sung */}
                    {actions?.CanInputCost && (
                        <button onClick={openCostModal} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200">
                            <DollarSign className="w-4 h-4 mr-2" /> Nhập Chi Phí
                        </button>
                    )}

                    {/* Trình Phê Duyệt: REPORTER / ADMIN khi phiếu WAITING_FEEDBACK
                        SP không có cờ riêng → dùng CanSubmit (cùng permission REPORT_SUBMIT) kết hợp status */}
                    {r.StatusCode === 'WAITING_FEEDBACK' && actions?.CanSubmitApproval && (
                        <button onClick={submitApprovalReq} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-200">
                            <CheckSquare className="w-4 h-4 mr-2" /> Trình Phê Duyệt
                        </button>
                    )}

                    {/* Phê Duyệt / Từ chối / Trả lại: VT_MANAGER (không phí) hoặc BGD (có phí) */}
                    {actions?.CanApprove && (
                        <>
                            <button onClick={() => approveReport('RETURNED')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700">
                                Trả Lại
                            </button>
                            <button onClick={() => approveReport('REJECTED')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-red-50 hover:bg-red-100 text-red-600">
                                <XCircle className="w-4 h-4 mr-2" /> Từ Chối
                            </button>
                            <button onClick={() => approveReport('APPROVED')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-green-600 hover:bg-green-700 text-white shadow-green-200">
                                <CheckCircle className="w-4 h-4 mr-2" /> Phê Duyệt
                            </button>
                        </>
                    )}

                    {/* Trình Ban giám đốc: VT_MANAGER khi phiếu CÓ CHI PHÍ */}
                    {actions?.CanForwardBGD && (
                        <>
                            <button onClick={() => approveReport('RETURNED')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700">
                                Trả Lại
                            </button>
                            <button onClick={() => approveReport('REJECTED')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-red-50 hover:bg-red-100 text-red-600">
                                <XCircle className="w-4 h-4 mr-2" /> Từ Chối
                            </button>
                            <button onClick={() => approveReport('FORWARD_BGD')} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200">
                                <Send className="w-4 h-4 mr-2" /> Trình Ban giám đốc
                            </button>
                        </>
                    )}

                    {/* Đóng hồ sơ: người chịu TN chính hoặc ADMIN khi phiếu APPROVED/PROCESSING */}
                    {actions?.CanClose && (
                        <button onClick={closeReportAction} className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all duration-200 active:scale-95 bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-200">
                            <Archive className="w-4 h-4 mr-2" /> Xác Nhận &amp; Đóng
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Content */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-100 bg-slate-50/50">
                            {['overview', 'responses', 'costs', 'attachments'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn("px-6 py-4 text-sm font-bold border-b-2 transition-colors uppercase tracking-wider", activeTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800")}
                                >
                                    {tab === 'overview' ? 'Tổng Quan' : tab === 'responses' ? 'Phản Hồi' : tab === 'costs' ? `Chi Phí${costLines.length > 0 ? ` (${costLines.length})` : ''}` : 'Đính Kèm'}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {/* ── Tab Tổng quan ── */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-in fade-in">
                                    <div className="grid grid-cols-4 gap-4">
                                        <Card label="Ngày phát sinh" value={formatDate(r.OccurrenceTime || r.CreatedAt)} icon={Clock} />
                                        <Card label="Mức độ" value={r.SeverityName || r.SeverityCode} icon={AlertTriangle} />
                                        <Card label="Loại phát sinh" value={r.ExceptionTypeName} icon={ListTree} />
                                        <Card label="Nguyên nhân" value={r.ExceptionCauseName} icon={HelpCircle} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">Nội dung chi tiết</h3>
                                            <Field label="Mô tả ngắn" value={r.ShortDescription} />
                                            <Field label="Mô tả chi tiết" value={r.DetailedDescription} />
                                            <Field label="Đề xuất xử lý" value={r.ProposedSolution} />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider border-b pb-2">Phân công</h3>
                                            <Field label="BP chịu trách nhiệm" value={r.ResponsibleDeptName || r.ResponsibleDeptCode} />
                                            <Field label="Người chịu TN chính" value={r.MainResponsibleEmpName || r.MainResponsibleEmpCode} />
                                            <Field label="Mã Kế hoạch ERP" value={r.PlanSelectKey} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Tab Phản hồi ── */}
                            {activeTab === 'responses' && (
                                <div className="animate-in fade-in space-y-4">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs border-b pb-2 mb-4">Các Bộ Phận Phản Hồi</h3>
                                    {(!data.responses || data.responses.length === 0) ? (
                                        <p className="text-slate-500 italic text-sm">Chưa có phản hồi nào.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {data.responses.map((resp, idx) => (
                                                <div key={idx} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-3 border-b border-slate-200 pb-3">
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm">{resp.DepartmentName || resp.DepartmentCode || 'N/A'}</div>
                                                            <div className="text-xs text-slate-500 mt-1 font-medium">Bởi: <span className="font-bold">{resp.ResponderEmpName || resp.ResponderEmpCode || 'SYSTEM'}</span> — {formatDate(resp.ResponseAt)}</div>
                                                        </div>
                                                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm", resp.HasDeptCost ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200")}>
                                                            {resp.HasDeptCost ? 'CÓ CHI PHÍ' : 'KHÔNG CHI PHÍ'}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-4 text-sm">
                                                        <div>
                                                            <span className="font-bold text-slate-700 block text-xs tracking-wider uppercase mb-1">Xác nhận / Nhận định:</span>
                                                            <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">{resp.ResponseContent || '--'}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <span className="font-bold text-slate-700 block text-xs tracking-wider uppercase mb-1">Đánh giá nguyên nhân:</span>
                                                                <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">{resp.CauseAssessment || '--'}</p>
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-slate-700 block text-xs tracking-wider uppercase mb-1">Đề xuất hành động:</span>
                                                                <p className="text-slate-800 bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">{resp.ProposedAction || '--'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Tab Chi phí ── */}
                            {activeTab === 'costs' && (
                                <div className="animate-in fade-in space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2 mb-4">
                                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Danh Sách Dòng Chi Phí</h3>
                                        {actions?.CanInputCost && (
                                            <button onClick={openCostModal} className="inline-flex items-center text-xs font-bold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg active:scale-95 transition-all">
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Thêm dòng
                                            </button>
                                        )}
                                    </div>
                                    {costLines.length === 0 ? (
                                        <p className="text-slate-500 italic text-sm">Chưa có dòng chi phí nào.</p>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
                                                        <tr>
                                                            <th className="text-left px-4 py-3 font-bold">Bộ Phận</th>
                                                            <th className="text-left px-4 py-3 font-bold">Mô tả</th>
                                                            <th className="text-right px-4 py-3 font-bold">SL</th>
                                                            <th className="text-right px-4 py-3 font-bold">Đơn giá</th>
                                                            <th className="text-right px-4 py-3 font-bold">Thành tiền</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {costLines.map((c, i) => (
                                                            <tr key={i} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 font-bold text-slate-700">{c.DepartmentName || c.DepartmentCode}</td>
                                                                <td className="px-4 py-3 text-slate-600">{c.CostItemDesc}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">{c.Qty ?? '—'}</td>
                                                                <td className="px-4 py-3 text-right text-slate-600">{c.UnitCost ? formatMoney(c.UnitCost) : '—'}</td>
                                                                <td className="px-4 py-3 text-right font-black text-slate-800">{formatMoney(c.Amount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Tổng ước tính:</td>
                                                            <td className="px-4 py-3 text-right font-black text-red-600 text-base">{formatMoney(totalCost)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right — History Timeline */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Clock className="w-32 h-32" /></div>
                        <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm mb-6 border-b border-slate-100 pb-2 relative">Lịch sử Xử lý</h3>
                        <div className="relative border-l-2 border-slate-100 ml-3 space-y-6 pl-5">
                            {history.length > 0 ? history.map((h, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[27px] bg-blue-500 w-3 h-3 rounded-full border-2 border-white shadow-sm shadow-blue-200 top-1.5"></div>
                                    <div className="font-bold text-slate-800 text-sm">{h.ActionName || '--'}</div>
                                    <div className="text-xs text-slate-500 mt-1">{formatDate(h.ActionAt)}</div>
                                    <div className="text-sm font-medium text-slate-600 mt-1">Bởi: {h.ActionByEmpName}</div>
                                    {h.Note && <div className="text-xs italic text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-100">{h.Note}</div>}
                                </div>
                            )) : <div className="text-slate-500 text-sm">Chưa có lịch sử.</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                Modal 1 — Ghi Phản Hồi
            ══════════════════════════════════════════════════════════ */}
            {showRespModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 my-auto border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center">
                            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                            Ghi Phản Hồi Từ Bộ Phận Liên Quan
                        </h3>
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Bộ Phận (*)</label>
                                    <SearchSelect
                                        placeholder="Chọn bộ phận..."
                                        apiPath="/departments"
                                        valueField="DepartmentCode"
                                        labelField="DepartmentName"
                                        subLabelField="DepartmentCode"
                                        onSelect={dept => {
                                            if (showRespModal) setRespForm({ ...respForm, departmentCode: dept?.DepartmentCode || '' });
                                            if (showCostModal) setCostForm({ ...costForm, departmentCode: dept?.DepartmentCode || '' });
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    {r.HasCost && (
                                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 w-full hover:bg-white hover:border-blue-200 transition-colors">
                                            <input type="checkbox" checked={respForm.hasDeptCost} onChange={e => setRespForm({ ...respForm, hasDeptCost: e.target.checked })} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
                                            <span className="font-bold text-sm text-slate-700 select-none">BP CÓ phát sinh chi phí</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Xác nhận &amp; Nhận định sự cố (*)</label>
                                <textarea value={respForm.responseContent} onChange={e => setRespForm({ ...respForm, responseContent: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800" rows="3" placeholder="Xác nhận lại sự việc và nhận định nguyên nhân khách quan..."></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Đánh giá Root Cause</label>
                                    <textarea value={respForm.causeAssessment} onChange={e => setRespForm({ ...respForm, causeAssessment: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800" rows="3" placeholder="Nguyên nhân gốc rễ là gì?"></textarea>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Đề xuất Hành động</label>
                                    <textarea value={respForm.proposedAction} onChange={e => setRespForm({ ...respForm, proposedAction: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-800" rows="3" placeholder="Biện pháp xử lý/ngăn chặn..."></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-6">
                                <button onClick={() => setShowRespModal(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors active:scale-95">Hủy</button>
                                <button onClick={submitResponse} className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-sm shadow-blue-200 transition-all active:scale-95 flex items-center">
                                    <Send className="w-4 h-4 mr-2" /> Lưu Phản Hồi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Modal 2 — Nhập Chi Phí
            ══════════════════════════════════════════════════════════ */}
            {showCostModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 my-auto border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2 text-amber-500" />
                            Thêm Dòng Chi Phí
                        </h3>
                        <div className="space-y-5">
                            {/* Row 1: BP + Loại chi phí */}
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Bộ Phận (*)</label>
                                    <SearchSelect
                                        placeholder="Chọn bộ phận..."
                                        apiPath="/departments"
                                        valueField="DepartmentCode"
                                        labelField="DepartmentName"
                                        subLabelField="UnitName"
                                        onSelect={dept => setCostForm({ ...costForm, departmentCode: dept?.DepartmentCode || '' })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Loại Chi Phí (*)</label>
                                    {costTypes.length > 0 ? (
                                        <select value={costForm.costTypeId} onChange={e => setCostForm({ ...costForm, costTypeId: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800">
                                            <option value="">-- Chọn loại --</option>
                                            {costTypes.map(ct => <option key={ct.CostTypeID} value={ct.CostTypeID}>{ct.CostTypeName}</option>)}
                                        </select>
                                    ) : (
                                        <input type="number" value={costForm.costTypeId} onChange={e => setCostForm({ ...costForm, costTypeId: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800" placeholder="Nhập CostTypeID (số)" />
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Mô tả */}
                            <div>
                                <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Mô tả Khoản Chi Phí (*)</label>
                                <input type="text" value={costForm.costItemDesc} onChange={e => setCostForm({ ...costForm, costItemDesc: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800" placeholder="VD: Chi phí kiểm tra lại nguyên vật liệu..." />
                            </div>

                            {/* Toggle: nhập theo qty×unitCost hay manualAmount */}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setCostForm({ ...costForm, useManual: false })} className={cn("flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors", !costForm.useManual ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}>
                                    SL × Đơn giá
                                </button>
                                <button type="button" onClick={() => setCostForm({ ...costForm, useManual: true })} className={cn("flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors", costForm.useManual ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}>
                                    Nhập thẳng Thành Tiền
                                </button>
                            </div>

                            {/* Input theo mode */}
                            {!costForm.useManual ? (
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Số Lượng (*)</label>
                                        <input type="number" min="0" value={costForm.qty} onChange={e => setCostForm({ ...costForm, qty: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800" placeholder="0.000" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Đơn Giá (VNĐ) (*)</label>
                                        <input type="number" min="0" value={costForm.unitCost} onChange={e => setCostForm({ ...costForm, unitCost: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800" placeholder="0.00" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[11px] font-bold tracking-widest text-red-500 uppercase mb-2">Thành Tiền (VNĐ) (*)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <DollarSign className="h-5 w-5 text-amber-400" />
                                        </div>
                                        <input type="number" min="0" value={costForm.manualAmount} onChange={e => setCostForm({ ...costForm, manualAmount: e.target.value })} className="w-full pl-11 pr-4 py-3 border border-amber-200 rounded-xl bg-amber-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-bold text-amber-800" placeholder="0.00" />
                                    </div>
                                </div>
                            )}

                            {/* Ghi chú */}
                            <div>
                                <label className="block text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-2">Ghi Chú</label>
                                <input type="text" value={costForm.note} onChange={e => setCostForm({ ...costForm, note: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-amber-500 outline-none transition-all font-medium text-slate-800" placeholder="Ghi chú thêm (nếu có)..." />
                            </div>

                            <div className="flex justify-end gap-3 mt-8 border-t border-slate-100 pt-6">
                                <button onClick={() => setShowCostModal(false)} className="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors active:scale-95">Hủy</button>
                                <button onClick={submitCostLine} className="px-6 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl font-bold shadow-sm shadow-amber-200 transition-all active:scale-95 flex items-center">
                                    <Plus className="w-4 h-4 mr-2" /> Thêm Dòng Chi Phí
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, value }) {
    return (
        <div>
            <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">{label}</div>
            <div className="text-sm font-bold text-slate-700">{value || '--'}</div>
        </div>
    );
}

// eslint-disable-next-line no-unused-vars
function Card({ label, value, icon: Icon }) {
    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 shadow-sm border-l-4 border-l-blue-500">
            <div className="flex items-center text-slate-500 text-xs font-bold mb-2 tracking-wide uppercase"><Icon className="w-4 h-4 mr-1 text-blue-500" />{label}</div>
            <div className="text-slate-800 font-black truncate">{value || '--'}</div>
        </div>
    );
}
