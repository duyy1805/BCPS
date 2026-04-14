const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class WorklistRepository extends DbRepository {
    async getMyInbox(empCode, fromDate, toDate) {
        return this.executeStoredProcedure("ps.usp_Worklist_MyInbox", [
            { name: "EmpCode", type: sql.VarChar(50), value: empCode },
            { name: "FromDate", type: sql.Date, value: fromDate || null },
            { name: "ToDate", type: sql.Date, value: toDate || null }
        ]);
    }

    async getDepartmentQueue(departmentCode, fromDate, toDate) {
        return this.executeStoredProcedure("ps.usp_Worklist_DepartmentQueue", [
            { name: "DepartmentCode", type: sql.VarChar(50), value: departmentCode },
            { name: "FromDate", type: sql.Date, value: fromDate || null },
            { name: "ToDate", type: sql.Date, value: toDate || null }
        ]);
    }
}

module.exports = WorklistRepository;