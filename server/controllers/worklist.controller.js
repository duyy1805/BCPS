const WorklistService = require("../services/worklist.service");

const service = new WorklistService();

async function getMyInbox(req, res, next) {
    try {
        const result = await service.getMyInbox(
            req.currentUser,
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getDepartmentQueue(req, res, next) {
    try {
        const result = await service.getDepartmentQueue(
            req.params.departmentCode,
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getMyInbox,
    getDepartmentQueue
};