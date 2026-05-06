import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Save, X, AlertCircle, Info, FileText, Plus, Trash2, DollarSign } from 'lucide-react';
import api, { formatMoney, formatInputNumber, parseInputNumber } from '../utils/api';
import { useUI } from '../context/UIContext';
import { cn } from '../context/UIContext';
import SearchSelect from '../components/ui/SearchSelect';
import ConfirmModal from '../components/ui/ConfirmModal';

export default function ReportCreate() {
    const navigate = useNavigate();
    const { showToast } = useUI();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [masterData, setMasterData] = useState({
        exceptionTypes: [],
        exceptionCauses: [],
        impactTypes: [],
        severities: [],
        costTypes: []
    });

    const [erpSearch, setErpSearch] = useState('');
    const [erpPlans, setErpPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [file, setFile] = useState(null);
    const [managedDepts, setManagedDepts] = useState([]);

    const [form, setForm] = useState({
        shortDesc: '',
        solution: '',
        deptCode: '',
        empCode: '',
        occurredDeptCode_NT: '',
        typeId: '',
        causeId: '',
        severityCode: '',
        dueDate: '', // Hạn hoàn thành
        hasCost: false,
        costs: [], // Danh sách chi phí khởi tạo
        impactCodes: [],
        coordDeptCodes: []
    });

    const [costForm, setCostForm] = useState({
        costTypeId: '',
        costItemDesc: '',
        qty: '',
        unitCost: '',
        manualAmount: '',
        note: '',
        useManual: false
    });

    const [confirmModal, setConfirmModal] = useState({ open: false });

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const { data } = await api.get('/report-form/master-data');
                if (data.success) {
                    setMasterData({
                        exceptionTypes: data.data.exceptionTypes || [],
                        exceptionCauses: data.data.exceptionCauses || [],
                        impactTypes: data.data.impactTypes || [],
                        severities: data.data.severities || [],
                        costTypes: data.data.costTypes || []
                    });
                    if (data.data.exceptionTypes?.length > 0) setForm(prev => ({ ...prev, typeId: data.data.exceptionTypes[0].ExceptionTypeID }));
                    if (data.data.exceptionCauses?.length > 0) setForm(prev => ({ ...prev, causeId: data.data.exceptionCauses[0].ExceptionCauseID }));
                    if (data.data.severities?.length > 0) setForm(prev => ({ ...prev, severityCode: data.data.severities[0].SeverityCode }));
                }
            } catch {
                showToast('Lỗi tải dữ liệu danh mục', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadMasterData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!form.empCode) {
            setManagedDepts([]);
            setForm(prev => ({ ...prev, occurredDeptCode_NT: '' }));
            return;
        }
        const fetchManagedDepts = async () => {
            try {
                const { data } = await api.get(`/employees/${form.empCode}/managed-departments`);
                if (data.success) {
                    setManagedDepts(data.data.items);
                    // Reset if no managed depts
                    if (data.data.items.length === 0) {
                        setForm(prev => ({ ...prev, occurredDeptCode_NT: '' }));
                    }
                }
            } catch (err) {
                console.error("Lỗi lấy danh sách đơn vị quản lý:", err);
            }
        };
        fetchManagedDepts();
    }, [form.empCode]);

    const searchERP = async () => {
        if (!erpSearch.trim()) return showToast('Vui lòng nhập từ khóa ERP', 'warning');
        try {
            const { data } = await api.get(`/erp/production-plans/search?keyword=${encodeURIComponent(erpSearch)}&topN=50`);
            if (data.success && data.data.items.length > 0) {
                setErpPlans(data.data.items);
            } else {
                showToast('Không tìm thấy kế hoạch ERP nào phù hợp!', 'warning');
                setErpPlans([]);
            }
        } catch {
            showToast('Lỗi tìm kiếm ERP', 'error');
        }
    };

    const handleCheckbox = (field, value, checked) => {
        setForm(prev => {
            const arr = prev[field];
            if (checked) return { ...prev, [field]: [...arr, value] };
            return { ...prev, [field]: arr.filter(x => x !== value) };
        });
    };

    const addCoordDept = (dept) => {
        if (!dept) return;
        if (form.coordDeptCodes.includes(dept.DepartmentCode)) return;
        setForm(prev => ({ ...prev, coordDeptCodes: [...prev.coordDeptCodes, dept.DepartmentCode] }));
    };

    const removeCoordDept = (code) => {
        setForm(prev => ({ ...prev, coordDeptCodes: prev.coordDeptCodes.filter(c => c !== code) }));
    };

    const addCostLine = () => {
        if (!costForm.costTypeId) return showToast('Vui lòng chọn Loại Chi Phí', 'warning');
        if (!costForm.costItemDesc) return showToast('Vui lòng nhập Mô tả khoản chi phí', 'warning');
        if (costForm.useManual && !costForm.manualAmount) return showToast('Vui lòng nhập Thành Tiền', 'warning');
        if (!costForm.useManual && (!costForm.qty || !costForm.unitCost)) return showToast('Vui lòng nhập Số lượng và Đơn giá', 'warning');

        const typeObj = masterData.costTypes.find(t => t.CostTypeID == costForm.costTypeId);
        const newLine = {
            ...costForm,
            costTypeName: typeObj?.CostTypeName || 'N/A',
            amount: costForm.useManual ? Number(costForm.manualAmount) : (Number(costForm.qty) * Number(costForm.unitCost))
        };

        setForm(prev => ({ ...prev, costs: [...prev.costs, newLine] }));
        setCostForm({ costTypeId: '', costItemDesc: '', qty: '', unitCost: '', manualAmount: '', note: '', useManual: false });
    };

    const removeCostLine = (index) => {
        setForm(prev => ({ ...prev, costs: prev.costs.filter((_, i) => i !== index) }));
    };

    const submitDraft = async () => {
        if (!selectedPlan) return showToast('Vui lòng chọn kế hoạch ERP', 'warning');
        if (!form.shortDesc) return showToast('Vui lòng nhập mô tả ngắn', 'warning');
        if (!form.solution) return showToast('Vui lòng nhập đề xuất xử lý', 'warning');
        if (!form.deptCode) return showToast('Vui lòng chọn bộ phận chịu trách nhiệm', 'warning');
        if (!form.empCode) return showToast('Vui lòng nhập mã người chịu trách nhiệm chính', 'warning');
        if (form.impactCodes.length === 0) return showToast('Vui lòng chọn ít nhất 1 mức độ ảnh hưởng', 'warning');
        if (form.coordDeptCodes.length === 0) return showToast('Vui lòng chọn ít nhất 1 bộ phận liên quan', 'warning');

        setSaving(true);
        try {
            const body = {
                reportId: null,
                planSelectKey: selectedPlan.PlanSelectKey,
                occurrenceTime: new Date().toISOString(),
                exceptionTypeId: Number(form.typeId),
                exceptionCauseId: Number(form.causeId),
                severityCode: form.severityCode,
                shortDescription: form.shortDesc,
                detailedDescription: form.shortDesc,
                affectedQty: null,
                affectedUom: null,
                responsibleDeptCode: form.deptCode,
                mainResponsibleEmpCode: form.empCode,
                proposedSolution: form.solution,
                interimAction: null,
                expectedResult: null,
                dueDate: form.dueDate || null,
                hasCost: form.hasCost,
                affectsERP: true,
                impactCodesCsv: form.impactCodes.join(','),
                coordDepartmentCodesCsv: form.coordDeptCodes.join(','),
                occurredDeptCode_NT: form.occurredDeptCode_NT || null
            };

            const res = await api.post('/reports/draft', body);
            if (res.data.success) {
                const newReportId = res.data.data.reportId;

                // Nếu có file, upload file
                if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    await api.post(`/reports/${newReportId}/attachments`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                // Lưu danh sách chi phí (nếu có)
                if (form.hasCost && form.costs.length > 0) {
                    for (const cost of form.costs) {
                        const costPayload = {
                            departmentCode: form.deptCode, // Mặc định bộ phận chịu trách nhiệm
                            costTypeId: Number(cost.costTypeId),
                            costItemDesc: cost.costItemDesc,
                            note: cost.note || null,
                            qty: cost.useManual ? null : Number(cost.qty),
                            unitCost: cost.useManual ? null : Number(cost.unitCost),
                            manualAmount: cost.useManual ? Number(cost.manualAmount) : null
                        };
                        try {
                            await api.post(`/reports/${newReportId}/cost-lines`, costPayload);
                        } catch (err) {
                            console.error("Lỗi lưu dòng chi phí:", err);
                        }
                    }
                }

                showToast('Lưu bản nháp thành công!', 'success');
                navigate(`/reports/${newReportId}`);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Lỗi lưu bản nháp', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

    return (
        <div className="max-w-8xl mx-auto space-y-6 ">
            {/* Header Actions */}
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h1 className="text-xl font-bold text-slate-800 flex items-center">
                    <FileText className="w-6 h-6 mr-3 text-blue-600" />
                    Tạo mới Báo cáo Phát sinh
                </h1>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/reports')} className="px-5 py-2.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Hủy bỏ
                    </button>
                    <button onClick={submitDraft} disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-200 flex items-center transition-all active:scale-95 disabled:opacity-50">
                        <Save className="w-5 h-5 mr-2" /> {saving ? 'Đang lưu...' : 'Lưu Nháp Hồ Sơ'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col - ERP Search & Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* ERP Search */}
                    <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-[11px] md:text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">1. Chọn kế hoạch</h3>
                        <div className="flex flex-col md:flex-row gap-3 mb-4">
                            <input
                                type="text"
                                value={erpSearch}
                                onChange={e => setErpSearch(e.target.value)}
                                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm md:text-base"
                                placeholder="Nhập Lệnh SX, Mã kế hoạch..."
                            />
                            <button onClick={searchERP} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors text-sm">Tìm kế hoạch</button>
                        </div>

                        {erpPlans.length > 0 && (
                            <select
                                onChange={e => setSelectedPlan(erpPlans.find(p => p.PlanSelectKey === e.target.value))}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl mb-4 bg-slate-50 outline-none focus:border-blue-500 text-sm"
                            >
                                <option value="">-- Chọn dòng kế hoạch phù hợp --</option>
                                {erpPlans.map(p => (
                                    <option key={p.PlanSelectKey} value={p.PlanSelectKey}>{p.DisplayText}</option>
                                ))}
                            </select>
                        )}

                        {selectedPlan && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 animate-in fade-in">
                                <div><div className="text-[10px] font-bold text-slate-500 uppercase">Mã Đơn Hàng</div><div className="font-bold text-slate-900 text-sm">{selectedPlan.OrderCode}</div></div>
                                <div><div className="text-[10px] font-bold text-slate-500 uppercase">Sản phẩm</div><div className="font-bold text-slate-900 text-sm truncate">{selectedPlan.ProductName}</div></div>
                                <div><div className="text-[10px] font-bold text-slate-500 uppercase">Bộ phận</div><div className="font-bold text-slate-900 text-sm">{selectedPlan.DepartmentName}</div></div>
                            </div>
                        )}
                    </div>

                    {/* Main Form Box */}
                    <div className={cn("bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm transition-opacity", !selectedPlan && "opacity-50 pointer-events-none")}>
                        <h3 className="text-[11px] md:text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">2. Thông tin sự việc</h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả ngắn gọn sự cố (*)</label>
                                <textarea value={form.shortDesc} onChange={e => setForm({ ...form, shortDesc: e.target.value })} rows="2" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 text-sm md:text-base"></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-2">Loại phát sinh</label>
                                    <select value={form.typeId} onChange={e => setForm({ ...form, typeId: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold">
                                        {masterData.exceptionTypes.map(t => <option key={t.ExceptionTypeID} value={t.ExceptionTypeID}>{t.ExceptionTypeName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-2">Nguyên nhân</label>
                                    <select value={form.causeId} onChange={e => setForm({ ...form, causeId: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold">
                                        {masterData.exceptionCauses.map(c => <option key={c.ExceptionCauseID} value={c.ExceptionCauseID}>{c.ExceptionCauseName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] md:text-xs font-bold text-slate-500 uppercase mb-2">Mức độ ảnh hưởng (*)</label>
                                    <select value={form.severityCode} onChange={e => setForm({ ...form, severityCode: e.target.value })} className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold text-blue-600 text-sm">
                                        {masterData.severities.map(s => <option key={s.SeverityCode} value={s.SeverityCode}>{s.SeverityName}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-3">Mức độ ảnh hưởng (chọn nhiều)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {masterData.impactTypes.map(imp => {
                                        const val = imp.ImpactCode || imp.Code || imp.Value || imp.ID;
                                        const label = imp.ImpactName || imp.ImpactTypeName || imp.Name || val;
                                        return (
                                            <label key={val} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={form.impactCodes.includes(val)} onChange={e => handleCheckbox('impactCodes', val, e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <span className="font-medium">{label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col */}
                <div className={cn("space-y-6 transition-opacity", !selectedPlan && "opacity-50 pointer-events-none")}>

                    {/* Action form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">3. Xử lý & Trách nhiệm</h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Đơn vị chịu trách nhiệm</label>
                                <SearchSelect
                                    placeholder="Tìm bộ phận..."
                                    apiPath="/departments"
                                    valueField="DepartmentCode"
                                    labelField="DepartmentName"
                                    subLabelField="DepartmentCode"
                                    initialValue={form.deptCode}
                                    onSelect={dept => setForm(prev => ({ ...prev, deptCode: dept?.DepartmentCode || '', empCode: '' }))}
                                    className="mb-3"
                                />
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nhân viên phụ trách</label>
                                <SearchSelect
                                    placeholder="Tìm nhân viên..."
                                    apiPath={`/employees/search${form.deptCode ? `?departmentCode=${form.deptCode}` : ''}`}
                                    valueField="EmployeeCode"
                                    labelField="EmployeeName"
                                    subLabelField="DepartmentCode"
                                    initialValue={form.empCode}
                                    onSelect={emp => setForm(prev => ({ ...prev, empCode: emp?.EmployeeCode || '' }))}
                                />
                            </div>

                            {managedDepts.length > 0 && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-300">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 items-center gap-2">
                                        <Info className="w-3 h-3" /> Đơn vị gây phát sinh (nếu có)
                                    </label>
                                    <SearchSelect
                                        placeholder="-- Không có / Khác --"
                                        apiPath={`/employees/${form.empCode}/managed-departments`}
                                        valueField="DepartmentName"
                                        labelField="DepartmentName"
                                        // subLabelField="DepartmentCode"
                                        initialValue={form.occurredDeptCode_NT}
                                        initialLabel={form.occurredDeptCode_NT}
                                        onSelect={dept => setForm(prev => ({ ...prev, occurredDeptCode_NT: dept?.DepartmentName || '' }))}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Hạn hoàn thành xử lý (*)</label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold text-blue-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Đề xuất xử lý (*)</label>
                                <textarea value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} rows="3" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"></textarea>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-3">Thông báo phản hồi tới</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {form.coordDeptCodes.map(code => (
                                        <div key={code} className="bg-blue-600 text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                            {code}
                                            <X className="w-3 h-3 cursor-pointer" onClick={() => removeCoordDept(code)} />
                                        </div>
                                    ))}
                                    {form.coordDeptCodes.length === 0 && <span className="text-xs text-slate-400">Chưa chọn bộ phận nào.</span>}
                                </div>
                                <SearchSelect
                                    placeholder="Chọn bộ phận liên quan..."
                                    apiPath="/departments"
                                    valueField="DepartmentCode"
                                    labelField="DepartmentName"
                                    subLabelField="DepartmentCode"
                                    onSelect={addCoordDept}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cost Toggle */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="flex items-start gap-4 cursor-pointer group p-2">
                            <div className="relative flex items-center mt-1">
                                <input
                                    type="checkbox"
                                    checked={form.hasCost}
                                    onChange={e => {
                                        const checked = e.target.checked;
                                        if (!checked && form.costs.length > 0) {
                                            setConfirmModal({
                                                open: true,
                                                title: 'Xóa danh sách chi phí?',
                                                message: 'Hành động này sẽ xóa toàn bộ các dòng chi phí đã nhập. Bạn có chắc chắn muốn tiếp tục?',
                                                onConfirm: () => {
                                                    setForm({ ...form, hasCost: false, costs: [] });
                                                    setConfirmModal({ open: false });
                                                }
                                            });
                                        } else {
                                            setForm({ ...form, hasCost: checked });
                                        }
                                    }}
                                    className="sr-only"
                                />
                                <div className={cn("block w-10 h-6 rounded-full transition-colors", form.hasCost ? "bg-blue-500" : "bg-slate-300")}></div>
                                <div className={cn("absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", form.hasCost ? "translate-x-4" : "")}></div>
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-slate-800">Có phát sinh chi phí</div>
                                <div className="text-xs text-slate-500 mt-1">Đánh dấu nếu sự việc làm tăng chi phí.</div>
                            </div>
                        </label>
                        <div className={cn("mt-4 p-3 rounded-lg text-sm font-bold flex items-start gap-2", form.hasCost ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-cyan-50 text-cyan-700 border border-cyan-200')}>
                            {form.hasCost ? <AlertCircle className="w-5 h-5 shrink-0" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                            {form.hasCost ? 'Báo cáo CÓ CHI PHÍ sẽ do BAN GIÁM ĐỐC phê duyệt.' : 'Báo cáo KHÔNG chi phí sẽ được Trưởng phòng Vật tư duyệt.'}
                        </div>

                        {form.hasCost && (
                            <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                                <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> Chi phí phát sinh dự kiến
                                </h4>

                                {/* Bảng danh sách chi phí đã thêm */}
                                {form.costs.length > 0 && (
                                    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden mb-4">
                                        <table className="w-full text-xs">
                                            <thead className="bg-amber-100 text-amber-900 font-bold uppercase tracking-wider text-[10px]">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Loại / Mô tả</th>
                                                    <th className="px-4 py-2 text-right">Thành Tiền</th>
                                                    <th className="px-4 py-2 text-center w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-amber-100">
                                                {form.costs.map((c, idx) => (
                                                    <tr key={idx} className="hover:bg-amber-50">
                                                        <td className="px-4 py-2">
                                                            <div className="font-bold text-slate-800">{c.costTypeName}</div>
                                                            <div className="text-slate-500 text-[11px]">{c.costItemDesc}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-black text-slate-800">{formatMoney(c.amount)}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                type="button"
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

                                {/* Form nhập chi phí */}
                                <div className="bg-white/50 p-4 rounded-xl border border-dashed border-amber-300 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Loại Chi Phí (*)</label>
                                            <select
                                                value={costForm.costTypeId}
                                                onChange={e => setCostForm({ ...costForm, costTypeId: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-xl bg-white text-sm font-bold outline-none"
                                            >
                                                <option value="">-- Chọn loại --</option>
                                                {masterData.costTypes.map(ct => <option key={ct.CostTypeID} value={ct.CostTypeID}>{ct.CostTypeName}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Mô tả Khoản Chi Phí (*)</label>
                                            <input
                                                type="text"
                                                value={costForm.costItemDesc}
                                                onChange={e => setCostForm({ ...costForm, costItemDesc: e.target.value })}
                                                className="w-full px-3 py-2 border border-amber-200 rounded-xl bg-white text-sm font-bold outline-none"
                                                placeholder="VD: Chi phí vật tư..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setCostForm({ ...costForm, useManual: false })} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all", !costForm.useManual ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500")}>
                                            SL × Đơn giá
                                        </button>
                                        <button type="button" onClick={() => setCostForm({ ...costForm, useManual: true })} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all", costForm.useManual ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500")}>
                                            Thành tiền
                                        </button>
                                    </div>

                                    {!costForm.useManual ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Số Lượng</label>
                                                <input
                                                    type="text"
                                                    value={formatInputNumber(costForm.qty)}
                                                    onChange={e => setCostForm({ ...costForm, qty: parseInputNumber(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Đơn Giá (VNĐ)</label>
                                                <input
                                                    type="text"
                                                    value={formatInputNumber(costForm.unitCost)}
                                                    onChange={e => setCostForm({ ...costForm, unitCost: parseInputNumber(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[10px] font-bold text-red-500 uppercase mb-1">Thành Tiền (VNĐ) (*)</label>
                                            <input
                                                type="text"
                                                value={formatInputNumber(costForm.manualAmount)}
                                                onChange={e => setCostForm({ ...costForm, manualAmount: parseInputNumber(e.target.value) })}
                                                className="w-full px-3 py-2 border border-red-200 bg-red-50/30 rounded-xl text-sm font-black text-red-900 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={addCostLine}
                                        className="w-full py-2 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Thêm khoản chi phí
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* File Upload */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-2">Đính kèm minh chứng</h3>
                        <input type="file" onChange={e => setFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.open}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ open: false })}
                confirmText="Xóa dữ liệu"
                cancelText="Quay lại"
            />
        </div>
    );
}
