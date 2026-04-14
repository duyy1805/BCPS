const SecurityService = require("../services/security.service");

const service = new SecurityService();

async function getMyPermissions(req, res, next) {
    try {
        const result = await service.getMyPermissions(req.currentUser.employeeCode);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getMyPermissions
};