const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class SecurityRepository extends DbRepository {
    async getMyRolesAndPermissions(empCode) {
        return this.executeStoredProcedure("ps.usp_Security_GetMyRolesAndPermissions", [
            { name: "EmpCode", type: sql.VarChar(50), value: empCode }
        ]);
    }
}

module.exports = SecurityRepository;