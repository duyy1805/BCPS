const { fail } = require("../common/api-response");

function errorMiddleware(err, req, res, next) {
    console.error("API ERROR:", err);

    if (err && err.statusCode) {
        return res.status(err.statusCode).json(fail(err.message || "Yêu cầu không hợp lệ."));
    }

    if (err && err.number) {
        let statusCode = 400;

        if (err.number >= 55000 && err.number < 57000) {
            statusCode = 403;
        }

        return res.status(statusCode).json(fail(err.message || "Lỗi nghiệp vụ từ database."));
    }

    return res.status(500).json(fail(err.message || "Có lỗi hệ thống xảy ra."));
}

module.exports = errorMiddleware;
