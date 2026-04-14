const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class KPIRepository extends DbRepository {
    async getDepartmentKPI(fromDate, toDate) {
        return this.executeStoredProcedure("ps.usp_KPI_Department", [
            { name: "FromDate", type: sql.Date, value: fromDate || null },
            { name: "ToDate", type: sql.Date, value: toDate || null }
        ]);
    }
}

module.exports = KPIRepository;