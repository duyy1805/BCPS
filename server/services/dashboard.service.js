const { ok } = require("../common/api-response");
const DashboardRepository = require("../repositories/dashboard.repository");

class DashboardService {
    constructor() {
        this.repo = new DashboardRepository();
    }

    async getManagementDashboard(fromDate, toDate) {
        const result = await this.repo.getManagementDashboard(fromDate || null, toDate || null);

        return ok({
            summary: result.recordsets[0]?.[0] || {},
            statusBreakdown: result.recordsets[1] || [],
            trendByDay: result.recordsets[2] || [],
            topExceptionTypes: result.recordsets[3] || [],
            topExceptionCauses: result.recordsets[4] || [],
            topResponsibleDepartments: result.recordsets[5] || [],
            topOccurredDepartments: result.recordsets[6] || [],
            overdueItems: result.recordsets[7] || []
        });
    }

    async getCostDashboard(fromDate, toDate) {
        const result = await this.repo.getCostDashboard(fromDate || null, toDate || null);

        return ok({
            summary: result.recordsets[0]?.[0] || {},
            byExceptionType: result.recordsets[1] || [],
            byExceptionCause: result.recordsets[2] || [],
            byDepartment: result.recordsets[3] || [],
            topCostReports: result.recordsets[4] || []
        });
    }
}

module.exports = DashboardService;