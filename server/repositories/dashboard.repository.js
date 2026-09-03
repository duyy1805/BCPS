const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class DashboardRepository extends DbRepository {
    async getManagementDashboard(fromDate, toDate) {
        return this.executeStoredProcedure("ps.usp_Dashboard_Management", [
            { name: "FromDate", type: sql.Date, value: fromDate || null },
            { name: "ToDate", type: sql.Date, value: toDate || null }
        ]);
    }

    async getCostDashboard(fromDate, toDate) {
        return this.executeStoredProcedure("ps.usp_Dashboard_Cost", [
            { name: "FromDate", type: sql.Date, value: fromDate || null },
            { name: "ToDate", type: sql.Date, value: toDate || null }
        ]);
    }

    async getOverdueDashboard(params, isExport = false) {
        return this.executeStoredProcedure("ps.usp_Dashboard_Overdue", [
            { name: "FromDate", type: sql.Date, value: params.fromDate },
            { name: "ToDate", type: sql.Date, value: params.toDate },
            { name: "Keyword", type: sql.NVarChar(255), value: params.keyword || null },
            { name: "StatusCode", type: sql.VarChar(30), value: params.statusCode || null },
            { name: "WaitingDepartment", type: sql.NVarChar(255), value: params.waitingDepartment || null },
            { name: "Page", type: sql.Int, value: params.page },
            { name: "PageSize", type: sql.Int, value: params.pageSize },
            { name: "SortBy", type: sql.VarChar(30), value: params.sortBy },
            { name: "SortDirection", type: sql.VarChar(4), value: params.sortDirection },
            { name: "Export", type: sql.Bit, value: isExport }
        ]);
    }
}

module.exports = DashboardRepository;
