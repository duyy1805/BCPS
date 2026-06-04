import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onConfirm, onCancel, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy' }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 md:p-6 text-center">
                    <div className="flex justify-center mb-5">
                        <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center text-amber-600 animate-bounce">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-slate-800 mb-2">{title || 'Xác nhận hành động'}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
                </div>
                
                <div className="p-4 md:p-6 bg-slate-50 grid grid-cols-2 gap-3 border-t border-slate-100">
                    <button 
                        onClick={onCancel} 
                        className="px-4 md:px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className="px-4 md:px-6 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
