const { ok } = require("../common/api-response");
const SecurityRepository = require("../repositories/security.repository");

class SecurityService {
    constructor() {
        this.repo = new SecurityRepository();
    }

    async getMyPermissions(empCode) {
        const result = await this.repo.getMyRolesAndPermissions(empCode);

        return ok({
            roles: result.recordsets[0] || [],
            permissions: result.recordsets[1] || []
        });
    }
}

module.exports = SecurityService;