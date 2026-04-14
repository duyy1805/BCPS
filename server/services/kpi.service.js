const { ok } = require("../common/api-response");
const KPIRepository = require("../repositories/kpi.repository");

class KPIService {
    constructor() {
        this.repo = new KPIRepository();
    }

    async getDepartmentKPI(fromDate, toDate) {
        const result = await this.repo.getDepartmentKPI(fromDate || null, toDate || null);

        return ok({
            responsibleDepartments: result.recordsets[0] || [],
            occurredDepartments: result.recordsets[1] || []
        });
    }
}

module.exports = KPIService;