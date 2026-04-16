const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class AuthRepository extends DbRepository {
    async login(username, passwordMd5) {
        const result = await this.executeStoredProcedure("ps.usp_Auth_Login", [
            { name: "UserName", type: sql.NVarChar(100), value: username },
            { name: "PasswordMD5", type: sql.VarChar(100), value: passwordMd5 }
        ]);

        const recordsets = result.recordsets;
        
        // recordsets[0] -> User info
        // recordsets[1] -> Role list

        if (!recordsets || recordsets.length === 0 || recordsets[0].length === 0) {
            return null;
        }

        const user = recordsets[0][0];
        const roles = recordsets[1] ? recordsets[1].map(r => r.RoleCode) : [];

        return {
            ...user,
            roles: roles
        };
    }
}

module.exports = new AuthRepository();
