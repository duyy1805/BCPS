const API_URL = "http://localhost:5000/api";

const UI = {
    toastContainer: null,

    showToast(message, type = "info") {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement("div");
            this.toastContainer.id = "toast-container";
            document.body.appendChild(this.toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const colors = {
            success: "text-emerald-500",
            error: "text-red-500",
            warning: "text-amber-500",
            info: "text-blue-500"
        };

        toast.innerHTML = `
            <div class="${colors[type] || 'text-slate-500'}">
                <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}" class="w-5 h-5"></i>
            </div>
            <div class="text-sm font-medium text-slate-700">${message}</div>
        `;

        this.toastContainer.appendChild(toast);
        lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(20px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    async confirm(title, message) {
        return new Promise((resolve) => {
            const backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop";
            backdrop.innerHTML = `
                <div class="modal-content p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-2">${title}</h3>
                    <p class="text-slate-600 mb-6">${message}</p>
                    <div class="flex justify-end gap-3">
                        <button id="modal-cancel" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Bỏ qua</button>
                        <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors">Đồng ý</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            
            // Force reflow for animation
            backdrop.offsetHeight;
            backdrop.classList.add("show");

            const close = (result) => {
                backdrop.classList.remove("show");
                setTimeout(() => {
                    backdrop.remove();
                    resolve(result);
                }, 200);
            };

            backdrop.querySelector("#modal-cancel").onclick = () => close(false);
            backdrop.querySelector("#modal-confirm").onclick = () => close(true);
            backdrop.onclick = (e) => { if (e.target === backdrop) close(false); };
        });
    },

    async prompt(title, placeholder = "", required = true) {
        return new Promise((resolve) => {
            const backdrop = document.createElement("div");
            backdrop.className = "modal-backdrop";
            backdrop.innerHTML = `
                <div class="modal-content p-6">
                    <h3 class="text-lg font-bold text-slate-900 mb-2">${title}</h3>
                    <textarea id="modal-prompt-input" class="w-full p-3 border border-slate-200 rounded-lg text-sm mb-6 focus:ring-2 focus:ring-blue-500 outline-none" rows="3" placeholder="${placeholder}"></textarea>
                    <div class="flex justify-end gap-3">
                        <button id="modal-cancel" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Hủy</button>
                        <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors">Xác nhận</button>
                    </div>
                </div>
            `;
            document.body.appendChild(backdrop);
            backdrop.offsetHeight;
            backdrop.classList.add("show");

            const input = backdrop.querySelector("#modal-prompt-input");
            input.focus();

            const close = (val) => {
                backdrop.classList.remove("show");
                setTimeout(() => {
                    backdrop.remove();
                    resolve(val);
                }, 200);
            };

            backdrop.querySelector("#modal-cancel").onclick = () => close(null);
            backdrop.querySelector("#modal-confirm").onclick = () => {
                const val = input.value.trim();
                if (required && !val) {
                    input.classList.add("border-red-500");
                    UI.showToast("Vui lòng nhập nội dung!", "error");
                    return;
                }
                close(val);
            };
        });
    }
};

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem("jwt_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    const options = { method, headers };
    if (body) {
        if (body instanceof FormData) {
            delete headers["Content-Type"];
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
        }
    }

    try {
        const res = await fetch(API_URL + endpoint, options);
        
        if (res.status === 401 || res.status === 403) {
            UI.showToast("Phiên đăng nhập hết hạn hoặc không có quyền!", "error");
            setTimeout(() => {
                localStorage.clear();
                window.location.href = "login.html";
            }, 1500);
            throw new Error("Unauthorized");
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error(`[API Error] ${method} ${endpoint}:`, err);
        UI.showToast("Lỗi kết nối máy chủ!", "error");
        return { success: false, message: "Lỗi kết nối máy chủ!" };
    }
}

// Format Helper
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';