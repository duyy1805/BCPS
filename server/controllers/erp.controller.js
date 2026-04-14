const ERPService = require("../services/erp.service");

const service = new ERPService();

async function searchProductionPlans(req, res, next) {
    try {
        const result = await service.searchProductionPlans({
            orderCode: req.query.orderCode,
            keyword: req.query.keyword,
            departmentCode: req.query.departmentCode,
            unitCode: req.query.unitCode,
            fromPlanDate: req.query.fromPlanDate || null,
            toPlanDate: req.query.toPlanDate || null,
            topN: req.query.topN ? Number(req.query.topN) : 200
        });

        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getProductionPlanDetail(req, res, next) {
    try {
        const result = await service.getProductionPlanDetail(String(req.query.planSelectKey || ""));
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    searchProductionPlans,
    getProductionPlanDetail
};