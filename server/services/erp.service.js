const { ok } = require("../common/api-response");
const ERPRepository = require("../repositories/erp.repository");

class ERPService {
    constructor() {
        this.repo = new ERPRepository();
    }

    async searchProductionPlans(params) {
        const result = await this.repo.searchProductionPlans(params);
        return ok({ items: result.recordsets[0] || [] });
    }

    async getProductionPlanDetail(planSelectKey) {
        const result = await this.repo.getProductionPlanDetail(planSelectKey);
        return ok(result.recordsets[0]?.[0] || null);
    }

    async searchEmployees(params) {
        const result = await this.repo.searchEmployees(params);
        return ok({ items: result.recordsets[0] || [] });
    }

    async getDepartments(params) {
        const result = await this.repo.getDepartments(params);
        return ok({ items: result.recordsets[0] || [] });
    }

    async getManagedDepartments(empCode) {
        const result = await this.repo.getManagedDepartments(empCode);
        return ok({ items: result.recordset || [] });
    }
}


module.exports = ERPService;