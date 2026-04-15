const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { ok, fail } = require("../common/api-response");

async function login(req, res, next) {
    try {
        const { username, password } = req.body;
        console.log(username, password);
        // Demo logic: Chấp nhận admin/123456
        if (username === "admin" && password === "123456") {
            const payload = {
                employeeCode: "1",
                userName: "Administrator",
                roles: ["ADMIN", "MANAGER"]
            };

            const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "16h" });

            return res.json(ok({ token, user: payload }, "Đăng nhập thành công."));
        }

        return res.status(401).json(fail("Tài khoản hoặc mật khẩu không đúng."));
    } catch (err) {
        next(err);
    }
}

module.exports = { login };