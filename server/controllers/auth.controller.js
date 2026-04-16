const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../config/env");
const { ok, fail } = require("../common/api-response");
const authRepository = require("../repositories/auth.repository");

/**
 * Đăng nhập bằng Database (xác thực MD5)
 */
async function login(req, res, next) {
    try {
        const { username, password } = req.body;
        console.log("[Auth] Login attempt from DB:", username);

        if (!username || !password) {
            return res.status(400).json(fail("Vui lòng nhập tên đăng nhập và mật khẩu."));
        }

        // Tạo mã hóa MD5 viết thường từ mật khẩu người dùng nhập
        const passwordMd5 = crypto.createHash("md5").update(password).digest("hex");

        // Truy vấn database
        const account = await authRepository.login(username, passwordMd5);

        if (!account) {
            return res.status(401).json(fail("Tài khoản hoặc mật khẩu không đúng."));
        }

        const payload = {
            employeeCode: account.EmployeeCode,
            userName: account.UserName,
            roles: account.roles,
            unitName: account.UnitName || null,
            departmentCode: account.EmployeeCode // Có thể map lại nếu cần thực tế hơn
        };

        const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "16h" });

        console.log("[Auth] Login success:", username, "→", account.roles.join(","));

        return res.json(ok({ token, user: payload }, "Đăng nhập thành công."));
    } catch (err) {
        next(err);
    }
}

module.exports = { login };