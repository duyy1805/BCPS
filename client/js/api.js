const API_URL = "http://localhost:5000/api";

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem("jwt_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(API_URL + endpoint, options);
        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
            alert("Phiên đăng nhập hết hạn hoặc không có quyền truy cập!");
            localStorage.clear();
            window.location.href = "login.html";
            throw new Error("Unauthorized");
        }
        return data;
    } catch (err) {
        console.error(`[API Error] ${method} ${endpoint}:`, err);
        return { success: false, message: "Lỗi kết nối máy chủ!" };
    }
}

// Format Helper
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';