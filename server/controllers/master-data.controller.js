const ERPService = require("../services/erp.service");
const ReportService = require("../services/report.service");

const erpService = new ERPService();
const reportService = new ReportService();

async function getCreateFormMasterData(req, res, next) {
    try {
        const result = await reportService.getCreateFormMasterData();
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function searchDepartments(req, res, next) {
    try {
        const result = await erpService.getDepartments({
            keyword: req.query.keyword,
            unitCode: req.query.unitCode
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function searchEmployees(req, res, next) {
    try {
        const result = await erpService.searchEmployees({
            keyword: req.query.keyword,
            departmentCode: req.query.departmentCode,
            unitCode: req.query.unitCode
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getEmployeeManagedDepartments(req, res, next) {
    try {
        const result = await erpService.getManagedDepartments(req.params.empCode);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getCreateFormMasterData,
    searchDepartments,
    searchEmployees,
    getEmployeeManagedDepartments
};
