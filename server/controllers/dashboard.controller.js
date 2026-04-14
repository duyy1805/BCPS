const DashboardService = require("../services/dashboard.service");

const service = new DashboardService();

async function getManagementDashboard(req, res, next) {
    try {
        const result = await service.getManagementDashboard(
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getCostDashboard(req, res, next) {
    try {
        const result = await service.getCostDashboard(
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getManagementDashboard,
    getCostDashboard
};