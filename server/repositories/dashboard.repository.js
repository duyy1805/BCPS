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
}

module.exports = DashboardRepository;