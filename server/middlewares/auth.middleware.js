const jwt = require("jsonwebtoken");
const env = require("../config/env");
const { fail } = require("../common/api-response");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json(fail("Thiếu token xác thực."));
    }

    const token = authHeader.replace("Bearer ", "").trim();

    try {
        const decoded = jwt.verify(token, env.jwtSecret);

        if (!decoded.employeeCode) {
            return res.status(401).json(fail("Token không chứa employeeCode."));
        }

        req.currentUser = {
            employeeCode: decoded.employeeCode,
            userName: decoded.userName,
            roles: decoded.roles || []
        };

        next();
    } catch (err) {
        return res.status(401).json(fail("Token không hợp lệ hoặc đã hết hạn."));
    }
}

module.exports = authMiddleware;