const path = require("path");
const { ok } = require("../common/api-response");
const ReportRepository = require("../repositories/report.repository");

class ReportService {
    constructor() {
        this.repo = new ReportRepository();
    }

    async getCreateFormMasterData() {
        const result = await this.repo.getCreateFormMasterData();

        return ok({
            exceptionTypes: result.recordsets[0] || [],
            exceptionCauses: result.recordsets[1] || [],
            severities: result.recordsets[2] || [],
            impactTypes: result.recordsets[3] || [],
            costTypes: result.recordsets[4] || [],
            departments: result.recordsets[5] || [],
            approvalRoutes: result.recordsets[6] || []
        });
    }

    async saveDraft(body, currentUser) {
        const result = await this.repo.saveDraft({
            ...body,
            actionByEmpCode: currentUser.employeeCode
        });

        return ok(
            {
                reportId: result.output.ReportID || result.output.ReportId,
                reportNo: result.output.ReportNo
            },
            "Lưu nháp thành công."
        );
    }

    async submit(reportId, currentUser) {
        await this.repo.submit(reportId, currentUser.employeeCode);
        return ok({ reportId, statusCode: "WAITING_FEEDBACK" }, "Đã trình báo cáo sang bước phản hồi.");
    }

    async getDetail(reportId) {
        const result = await this.repo.getDetail(reportId);

        return ok({
            report: result.recordsets[0]?.[0] || null,
            impacts: result.recordsets[1] || [],
            coordDepartments: result.recordsets[2] || [],
            responses: result.recordsets[3] || [],
            costLines: result.recordsets[4] || [],
            approvals: result.recordsets[5] || [],
            attachments: result.recordsets[6] || [],
            history: result.recordsets[7] || []
        });
    }

    async getAvailableActions(reportId, currentUser) {
        const result = await this.repo.getAvailableActions(reportId, currentUser.employeeCode);
        return ok(result.recordsets[0]?.[0] || null);
    }

    async saveResponse(reportId, body, currentUser) {
        await this.repo.saveResponse(reportId, {
            ...body,
            responderEmpCode: currentUser.employeeCode
        });

        return ok({ reportId, departmentCode: body.departmentCode }, "Đã lưu phản hồi.");
    }

    async addCostLine(reportId, body, currentUser) {
        await this.repo.addCostLine(reportId, {
            ...body,
            createdByEmpCode: currentUser.employeeCode,
            createdByEmpName: currentUser.userName || currentUser.employeeCode
        });

        return ok({ reportId }, "Đã thêm dòng chi phí.");
    }

    async submitApproval(reportId, currentUser) {
        await this.repo.submitApproval(
            reportId,
            currentUser.employeeCode,
            currentUser.userName || currentUser.employeeCode
        );

        return ok({ reportId }, "Đã trình phê duyệt.");
    }

    async approvalDecision(reportId, body, currentUser) {
        await this.repo.approvalDecision(
            reportId,
            currentUser.employeeCode,
            body.decisionCode,
            body.decisionComment
        );

        return ok({ reportId, decisionCode: body.decisionCode }, "Đã cập nhật quyết định phê duyệt.");
    }

    async close(reportId, body, currentUser) {
        await this.repo.close(reportId, {
            ...body,
            actionByEmpCode: currentUser.employeeCode,
            actionByEmpName: currentUser.userName || currentUser.employeeCode
        });

        return ok({ reportId }, "Đã đóng phát sinh.");
    }

    async listPaged(query, currentUser) {
        const result = await this.repo.listPaged({
            ...query,
            empCode: currentUser.employeeCode
        });

        return ok({
            meta: result.recordsets[0]?.[0] || {
                totalRows: 0,
                pageNumber: Number(query.pageNumber || 1),
                pageSize: Number(query.pageSize || 20),
                totalPages: 0
            },
            items: result.recordsets[1] || []
        });
    }

    async addAttachment(reportId, file, body, currentUser) {
        const ext = path.extname(file.originalname || "").replace(".", "") || null;

        await this.repo.addAttachment({
            reportId,
            attachmentScope: body.attachmentScope || "REPORT",
            refId: body.refId ? Number(body.refId) : null,
            fileName: file.originalname,
            filePath: file.path,
            fileExt: ext,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedByEmpCode: currentUser.employeeCode,
            uploadedByEmpName: currentUser.userName || currentUser.employeeCode
        });

        return ok(
            {
                fileName: file.originalname,
                filePath: file.path
            },
            "Tải tệp thành công."
        );
    }
}

module.exports = ReportService; 