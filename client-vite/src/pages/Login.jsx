import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import api from '../utils/api';
import { getRememberedUsername, setRememberedUsername } from '../utils/authStorage';
import { AlertTriangle, Lock, User, ArrowRight } from 'lucide-react';

export default function Login() {
    const { login } = useAuth();
    const { showToast } = useUI();
    const [loading, setLoading] = useState(false);
    const rememberedUsername = getRememberedUsername();
    const [formData, setFormData] = useState({
        username: rememberedUsername,
        password: '',
        rememberMe: true
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', formData);
            if (data.success) {
                console.log(data.data.user)
                setRememberedUsername(formData.rememberMe ? formData.username : '');
                showToast('Đăng nhập thành công!', 'success');
                login({
                    token: data.data.token,
                    userName: data.data.user.userName,
                    empCode: data.data.user.employeeCode,
                    deptCode: data.data.user.departmentCode,
                    roles: data.data.user.roles,
                    rememberMe: formData.rememberMe,
                });
            } else {
                showToast(data.message || 'Đăng nhập thất bại', 'error');
            }
        } catch (error) {
            showToast(error?.response?.data?.message || 'Lỗi kết nối máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-3xl rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-3xl rounded-full"></div>

            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform -rotate-6">
                        <AlertTriangle className="w-8 h-8 text-white transform rotate-6" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-slate-800 mb-2 tracking-tight">Chào mừng trở lại</h2>
                <p className="text-center text-slate-500 mb-8 font-medium">Hệ thống Quản lý Báo cáo Sự cố (BCPS)</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tên đăng nhập</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                placeholder="Sử dụng tài khoản ERP"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Mật khẩu</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-slate-600 font-medium select-none cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.rememberMe}
                            onChange={e => {
                                if (!e.target.checked) setRememberedUsername('');
                                setFormData({ ...formData, rememberMe: e.target.checked });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Ghi nhớ đăng nhập</span>
                    </label>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                Đăng nhập <ArrowRight className="ml-2 w-4 h-4" />
                            </>
                        )}
                    </button>

                    <div className="text-center mt-6 text-sm text-slate-500 font-medium">
                        Không dùng cho máy tính công cộng. Hệ thống tự động theo dõi IP truy cập.
                    </div>

                </form>
            </div>
        </div>
    );
}
