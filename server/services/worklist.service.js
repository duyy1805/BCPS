const { ok } = require("../common/api-response");
const WorklistRepository = require("../repositories/worklist.repository");

class WorklistService {
    constructor() {
        this.repo = new WorklistRepository();
    }

    async getMyInbox(currentUser, fromDate, toDate) {
        console.log("WorklistService.getMyInbox called with:", {
            employeeCode: currentUser.employeeCode,
            fromDate,
            toDate
        });
        const result = await this.repo.getMyInbox(
            currentUser.employeeCode,
            fromDate || null,
            toDate || null
        );

        return ok({
            summary: result.recordsets[0]?.[0] || {},
            waitingFeedbackItems: result.recordsets[1] || [],
            waitingApprovalItems: result.recordsets[2] || [],
            draftOrSupplementItems: result.recordsets[3] || [],
            processingItems: result.recordsets[4] || []
        });
    }

    async getDepartmentQueue(departmentCode, fromDate, toDate) {
        const result = await this.repo.getDepartmentQueue(
            departmentCode,
            fromDate || null,
            toDate || null
        );

        return ok({
            waitingFeedbackItems: result.recordsets[0] || [],
            responsibleItems: result.recordsets[1] || []
        });
    }
}

module.exports = WorklistService;