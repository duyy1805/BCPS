import React from 'react';
import { cn } from '../../context/UIContext';

export default function StatusBadge({ status, text, className }) {
    const config = {
        'DRAFT': { label: 'Nháp', className: 'bg-slate-100 text-slate-700 border-slate-200' },
        'WAITING_FEEDBACK': { label: 'Chờ phản hồi', className: 'bg-orange-50 text-orange-700 border-orange-200' },
        'WAITING_APPROVAL': { label: 'Chờ phê duyệt', className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        'APPROVED': { label: 'Đã duyệt', className: 'bg-green-50 text-green-700 border-green-200' },
        'REJECTED': { label: 'Từ chối', className: 'bg-red-50 text-red-700 border-red-200' },
        'CLOSED': { label: 'Đã đóng', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    };

    const current = config[status] || { label: status, className: 'bg-slate-100 text-slate-700 border-slate-200' };

    return (
        <span className={cn("px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border shadow-sm whitespace-nowrap", current.className, className)}>
            {text || current.label}
        </span>
    );
}
