const KPIService = require("../services/kpi.service");

const service = new KPIService();

async function getDepartmentKPI(req, res, next) {
    try {
        const result = await service.getDepartmentKPI(
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getDepartmentKPI
};