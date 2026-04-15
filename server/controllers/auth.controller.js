const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { ok, fail } = require("../common/api-response");

/**
 * Danh sách tài khoản test theo từng Role trong hệ thống BCPS.
 * Tương ứng với bảng ps.RoleMaster và ps.UserRole trong database.
 *
 * RoleMaster:
 *   ADMIN        - Quản trị hệ thống        (empCode: 1)
 *   REPORTER     - Người lập báo cáo        (empCode: 10)
 *   DEPT_HANDLER - Bộ phận phản hồi/xử lý  (empCode: 20)
 *   COST_HANDLER - Nhập và xác nhận chi phí (empCode: 30)
 *   VT_MANAGER   - Trưởng phòng Vật tư      (empCode: 101)
 *   BGD          - Ban giám đốc             (empCode: 1)   ← dùng empCode 1 (từ ApprovalRouteConfig)
 *   LEADER       - Lãnh đạo xem dashboard   (empCode: 50)
 */
const ACCOUNTS = [
    {
        username: "admin",
        password: "123456",
        employeeCode: "1",
        userName: "Quản Trị Hệ Thống",
        roles: ["ADMIN"],
        unitName: "Ban CNTT"
    },
    {
        username: "reporter",
        password: "123456",
        employeeCode: "104",
        userName: "Nguyễn Văn Lập (REPORTER)",
        roles: ["REPORTER"],
        unitName: "Xưởng 1"
    },
    {
        username: "dept_order",
        password: "123456",
        employeeCode: "984",
        userName: "Trần Thị Đơn Hàng (ORDER)",
        roles: ["DEPT_HANDLER"],
        departmentCode: "1100",
        unitName: "Quản lý đơn hàng"
    },
    {
        username: "dept_warehouse",
        password: "123456",
        employeeCode: "444",
        userName: "Lê Văn Kho (WAREHOUSE)",
        roles: ["DEPT_HANDLER"],
        departmentCode: "1200",
        unitName: "Kho"
    },
    {
        username: "vt_manager",
        password: "123456",
        employeeCode: "1008",
        userName: "Trưởng Phòng Vật Tư (VT_MANAGER)",
        roles: ["VT_MANAGER"],
        unitName: "Phòng Vật tư"
    },
    {
        username: "bgd",
        password: "123456",
        employeeCode: "589",
        userName: "Ban Giám Đốc (BGD)",
        roles: ["BGD"],
        unitName: "Ban giám đốc"
    },
    {
        username: "leader",
        password: "123456",
        employeeCode: "50",
        userName: "Lãnh Đạo Xem Dashboard (LEADER)",
        roles: ["LEADER"],
        unitName: "Hội đồng quản trị"
    }
];

async function login(req, res, next) {
    try {
        const { username, password } = req.body;
        console.log("[Auth] Login attempt:", username);

        const account = ACCOUNTS.find(
            (a) => a.username === username && a.password === password
        );

        if (!account) {
            return res.status(401).json(fail("Tài khoản hoặc mật khẩu không đúng."));
        }

        const payload = {
            employeeCode: account.employeeCode,
            userName: account.userName,
            roles: account.roles,
            unitName: account.unitName || null,
            departmentCode: account.departmentCode || null
        };

        const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "16h" });

        console.log("[Auth] Login success:", account.username, "→", account.roles.join(","));

        return res.json(ok({ token, user: payload }, "Đăng nhập thành công."));
    } catch (err) {
        next(err);
    }
}

module.exports = { login };