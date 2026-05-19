const path = require("path");
const { ok } = require("../common/api-response");
const ReportRepository = require("../repositories/report.repository");

class ReportService {
    constructor() {
        this.repo = new ReportRepository();
    }

    toNullableCsv(value) {
        if (Array.isArray(value)) {
            const cleaned = value
                .map((x) => String(x || "").trim())
                .filter(Boolean);
            return cleaned.length ? cleaned.join(",") : null;
        }

        if (value === undefined || value === null) return null;
        const text = String(value).trim();
        return text ? text : null;
    }

    toBoolean(value, defaultValue = false) {
        if (typeof value === "boolean") return value;
        if (value === "true" || value === 1 || value === "1") return true;
        if (value === "false" || value === 0 || value === "0") return false;
        return defaultValue;
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
        const planSelectKeys = Array.isArray(body.planSelectKeys)
            ? [...new Set(body.planSelectKeys.map((key) => String(key || "").trim()).filter((key) => key && key !== "0"))]
            : (
                body.planSelectKey !== undefined &&
                body.planSelectKey !== null &&
                String(body.planSelectKey).trim() !== "" &&
                String(body.planSelectKey).trim() !== "0"
                    ? [String(body.planSelectKey).trim()]
                    : []
            );
        const hasPlanSelection = planSelectKeys.length > 0;

        const payload = {
            reportId: body.reportId || null,
            // Keep one legacy value so existing stored procedures can continue populating
            // compatibility columns on ps.Report. The canonical relationship is synced below.
            planSelectKey: hasPlanSelection ? planSelectKeys[0] : null,
            planSelectKeys,
            occurrenceTime: body.occurrenceTime || null,
            exceptionTypeId: body.exceptionTypeId ? Number(body.exceptionTypeId) : null,
            exceptionCauseId: body.exceptionCauseId ? Number(body.exceptionCauseId) : null,
            severityCode: body.severityCode || null,
            shortDescription: body.shortDescription || null,
            detailedDescription: body.detailedDescription || body.shortDescription || null,
            affectedQty: body.affectedQty !== undefined && body.affectedQty !== null && body.affectedQty !== ""
                ? Number(body.affectedQty)
                : null,
            affectedUom: body.affectedUom || null,
            responsibleDeptCode: body.responsibleDeptCode || null,
            mainResponsibleEmpCode: body.mainResponsibleEmpCode || null,
            proposedSolution: body.proposedSolution || null,
            interimAction: body.interimAction || null,
            expectedResult: body.expectedResult || null,
            dueDate: body.dueDate || null,
            hasCost: this.toBoolean(body.hasCost, false),
            affectsERP: body.affectsERP === undefined
                ? hasPlanSelection
                : this.toBoolean(body.affectsERP, hasPlanSelection),
            impactCodesCsv: this.toNullableCsv(body.impactCodesCsv),
            occurredDeptCode_NT: body.occurredDeptCode_NT || null,
            actionByEmpCode: currentUser.employeeCode
        };

        // Merge mandatory primary departments (always required)
        const MANDATORY_DEPTS = ["Quản lý đơn hàng", "Kho"];
        const userSelected = Array.isArray(body.coordDepartmentCodesCsv)
            ? body.coordDepartmentCodesCsv.map(String).filter(Boolean)
            : (body.coordDepartmentCodesCsv ? String(body.coordDepartmentCodesCsv).split(",").map(s => s.trim()).filter(Boolean) : []);
        const merged = [...new Set([...MANDATORY_DEPTS, ...userSelected])];
        payload.coordDepartmentCodesCsv = merged.length ? merged.join(",") : null;

        const result = payload.planSelectKey || payload.reportId
            ? await this.repo.saveDraft(payload)
            : await this.repo.saveDraftWithoutPlan(payload);

        const reportId = result.output.ReportID || result.output.ReportId;
        await this.repo.syncPlans(reportId, planSelectKeys, currentUser.employeeCode);

        return ok(
            {
                reportId,
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
        if (!result) return ok({ report: null });

        return ok(result);
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

    async deleteDraft(reportId, currentUser) {
        await this.repo.deleteDraft(reportId, currentUser.employeeCode);
        return ok({ reportId }, "Đã xóa phiếu nháp.");
    }

    async listPaged(query, currentUser) {
        const result = await this.repo.listPaged({
            ...query,
            empCode: currentUser.employeeCode
        });
        const items = result.recordsets[1] || [];
        const planResult = await this.repo.getPlansForReports(items.map((item) => item.ReportID));
        const plansByReportId = (planResult.recordset || []).reduce((acc, plan) => {
            if (!acc[plan.ReportID]) acc[plan.ReportID] = [];
            acc[plan.ReportID].push(plan);
            return acc;
        }, {});

        return ok({
            meta: result.recordsets[0]?.[0] || {
                totalRows: 0,
                pageNumber: Number(query.pageNumber || 1),
                pageSize: Number(query.pageSize || 20),
                totalPages: 0
            },
            items: items.map((item) => ({
                ...item,
                Plans: plansByReportId[item.ReportID] || []
            }))
        });
    }

    async addAttachment(reportId, file, body, currentUser) {
        const ext = path.extname(file.originalname || "").replace(".", "") || null;

        const relativePath = `uploads/${file.filename}`;

        await this.repo.addAttachment({
            reportId,
            attachmentScope: body.attachmentScope || "REPORT",
            refId: body.refId ? Number(body.refId) : null,
            fileName: file.originalname,
            filePath: relativePath,
            fileExt: ext,
            mimeType: file.mimetype,
            fileSize: file.size,
            uploadedByEmpCode: currentUser.employeeCode,
            uploadedByEmpName: currentUser.userName || currentUser.employeeCode
        });

        return ok(
            {
                fileName: file.originalname,
                filePath: relativePath
            },
            "Tải tệp thành công."
        );
    }
}

module.exports = ReportService; 
