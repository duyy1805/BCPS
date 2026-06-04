/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [modal, setModal] = useState(null);
    const toastCount = useRef(0);

    const showToast = useCallback((message, type = 'info') => {
        const id = toastCount.current++;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const confirm = useCallback((title, message) => {
        return new Promise((resolve) => {
            setModal({
                type: 'confirm',
                title,
                message,
                onConfirm: () => {
                    setModal(null);
                    resolve(true);
                },
                onCancel: () => {
                    setModal(null);
                    resolve(false);
                }
            });
        });
    }, []);

    const prompt = useCallback((title, placeholder = '', required = true) => {
        return new Promise((resolve) => {
            setModal({
                type: 'prompt',
                title,
                placeholder,
                required,
                onConfirm: (val) => {
                    if (required && !val.trim()) {
                        showToast('Vui lòng nhập nội dung!', 'error');
                        return;
                    }
                    setModal(null);
                    resolve(val.trim());
                },
                onCancel: () => {
                    setModal(null);
                    resolve(null);
                }
            });
        });
    }, [showToast]);

    return (
        <UIContext.Provider value={{ showToast, confirm, prompt }}>
            {children}
            
            {/* Modal Renderer */}
            {modal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 md:p-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{modal.title}</h3>
                            {modal.type === 'confirm' && (
                                <p className="text-slate-600 mb-6">{modal.message}</p>
                            )}
                            {modal.type === 'prompt' && (
                                <textarea 
                                    autoFocus
                                    className="w-full p-3 border border-slate-200 rounded-xl mb-6 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 transition-all font-medium text-slate-700"
                                    rows="3"
                                    placeholder={modal.placeholder}
                                    id="prompt-input"
                                />
                            )}
                            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                                <button 
                                    onClick={modal.onCancel}
                                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
                                >
                                    Hủy
                                </button>
                                <button 
                                    onClick={() => {
                                        if(modal.type === 'prompt') {
                                            modal.onConfirm(document.getElementById('prompt-input').value);
                                        } else {
                                            modal.onConfirm();
                                        }
                                    }}
                                    className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-sm shadow-blue-200 transition-all active:scale-95"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Renderer */}
            <div className="fixed bottom-3 left-3 right-3 z-50 flex flex-col gap-2 pointer-events-none sm:bottom-4 sm:left-auto sm:right-4">
                {toasts.map(toast => {
                    const icons = {
                        success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
                        error: <AlertCircle className="w-5 h-5 text-red-500" />,
                        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
                        info: <Info className="w-5 h-5 text-blue-500" />
                    };
                    return (
                        <div key={toast.id} className="pointer-events-auto w-full bg-white border border-slate-100 shadow-lg rounded-xl p-3 sm:p-4 flex items-center gap-3 animate-in slide-in-from-right-8 duration-300 sm:min-w-64 sm:w-auto">
                            {icons[toast.type] || icons.info}
                            <span className="font-medium text-slate-700">{toast.message}</span>
                        </div>
                    );
                })}
            </div>
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);
