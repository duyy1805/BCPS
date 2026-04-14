const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class ReportRepository extends DbRepository {
    async getCreateFormMasterData() {
        return this.executeStoredProcedure("ps.usp_Report_GetCreateFormMasterData", []);
    }

    async saveDraft(params) {
        return this.executeStoredProcedure("ps.usp_Report_SaveDraftFull", [
            { name: "ReportID", type: sql.BigInt, value: params.reportId || null, output: true },
            { name: "ReportNo", type: sql.VarChar, output: true, length: 30 },

            { name: "PlanSelectKey", type: sql.VarChar(300), value: params.planSelectKey },
            { name: "OccurrenceTime", type: sql.DateTime2, value: params.occurrenceTime },
            { name: "ExceptionTypeID", type: sql.Int, value: params.exceptionTypeId },
            { name: "ExceptionCauseID", type: sql.Int, value: params.exceptionCauseId },
            { name: "SeverityCode", type: sql.VarChar(30), value: params.severityCode },
            { name: "ShortDescription", type: sql.NVarChar(sql.MAX), value: params.shortDescription },
            { name: "DetailedDescription", type: sql.NVarChar(sql.MAX), value: params.detailedDescription },
            { name: "AffectedQty", type: sql.Decimal(18, 3), value: params.affectedQty || null },
            { name: "AffectedUom", type: sql.NVarChar(50), value: params.affectedUom || null },
            { name: "ResponsibleDeptCode", type: sql.VarChar(50), value: params.responsibleDeptCode },
            { name: "MainResponsibleEmpCode", type: sql.VarChar(50), value: params.mainResponsibleEmpCode },
            { name: "ProposedSolution", type: sql.NVarChar(sql.MAX), value: params.proposedSolution },
            { name: "InterimAction", type: sql.NVarChar(sql.MAX), value: params.interimAction || null },
            { name: "ExpectedResult", type: sql.NVarChar(sql.MAX), value: params.expectedResult || null },
            { name: "DueDate", type: sql.DateTime2, value: params.dueDate || null },
            { name: "HasCost", type: sql.Bit, value: params.hasCost },
            { name: "AffectsERP", type: sql.Bit, value: params.affectsERP },
            { name: "ImpactCodesCsv", type: sql.NVarChar(500), value: params.impactCodesCsv || null },
            { name: "CoordDepartmentCodesCsv", type: sql.NVarChar(sql.MAX), value: params.coordDepartmentCodesCsv || null },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: params.actionByEmpCode }
        ]);
    }

    async submit(reportId, empCode) {
        return this.executeStoredProcedure("ps.usp_Report_SubmitFull", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: empCode }
        ]);
    }

    async getDetail(reportId) {
        return this.executeStoredProcedure("ps.usp_Report_GetDetail", [
            { name: "ReportID", type: sql.BigInt, value: reportId }
        ]);
    }

    async getAvailableActions(reportId, empCode) {
        return this.executeStoredProcedure("ps.usp_Report_GetAvailableActions", [
            { name: "EmpCode", type: sql.VarChar(50), value: empCode },
            { name: "ReportID", type: sql.BigInt, value: reportId }
        ]);
    }

    async saveResponse(reportId, params) {
        return this.executeStoredProcedure("ps.usp_Report_SaveResponse", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "DepartmentCode", type: sql.VarChar(50), value: params.departmentCode },
            { name: "ResponderEmpCode", type: sql.VarChar(50), value: params.responderEmpCode },
            { name: "ResponseContent", type: sql.NVarChar(sql.MAX), value: params.responseContent || null },
            { name: "CauseAssessment", type: sql.NVarChar(sql.MAX), value: params.causeAssessment || null },
            { name: "ProposedAction", type: sql.NVarChar(sql.MAX), value: params.proposedAction || null },
            { name: "HasDeptCost", type: sql.Bit, value: params.hasDeptCost },
            { name: "ProcessingResult", type: sql.NVarChar(sql.MAX), value: params.processingResult || null },
            { name: "ResponseStatusCode", type: sql.VarChar(30), value: params.responseStatusCode }
        ]);
    }

    async addCostLine(reportId, params) {
        return this.executeStoredProcedure("ps.usp_Report_AddCostLine", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "DepartmentCode", type: sql.VarChar(50), value: params.departmentCode },
            { name: "CostTypeID", type: sql.Int, value: params.costTypeId },
            { name: "CostItemDesc", type: sql.NVarChar(500), value: params.costItemDesc },
            { name: "Qty", type: sql.Decimal(18, 3), value: params.qty || null },
            { name: "UnitCost", type: sql.Decimal(18, 2), value: params.unitCost || null },
            { name: "ManualAmount", type: sql.Decimal(18, 2), value: params.manualAmount || null },
            { name: "Note", type: sql.NVarChar(1000), value: params.note || null },
            { name: "CreatedByEmpCode", type: sql.VarChar(50), value: params.createdByEmpCode },
            { name: "CreatedByEmpName", type: sql.NVarChar(255), value: params.createdByEmpName }
        ]);
    }

    async submitApproval(reportId, empCode, empName) {
        return this.executeStoredProcedure("ps.usp_Report_SubmitForApproval", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: empCode },
            { name: "ActionByEmpName", type: sql.NVarChar(255), value: empName }
        ]);
    }

    async approvalDecision(reportId, empCode, decisionCode, decisionComment) {
        return this.executeStoredProcedure("ps.usp_Report_ApprovalDecision", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ApproverEmpCode", type: sql.VarChar(50), value: empCode },
            { name: "DecisionCode", type: sql.VarChar(30), value: decisionCode },
            { name: "DecisionComment", type: sql.NVarChar(sql.MAX), value: decisionComment || null }
        ]);
    }

    async close(reportId, params) {
        return this.executeStoredProcedure("ps.usp_Report_Close", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "FinalResultSummary", type: sql.NVarChar(sql.MAX), value: params.finalResultSummary },
            { name: "CorrectiveAction", type: sql.NVarChar(sql.MAX), value: params.correctiveAction || null },
            { name: "PreventiveAction", type: sql.NVarChar(sql.MAX), value: params.preventiveAction || null },
            { name: "ClosureNote", type: sql.NVarChar(sql.MAX), value: params.closureNote || null },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: params.actionByEmpCode },
            { name: "ActionByEmpName", type: sql.NVarChar(255), value: params.actionByEmpName }
        ]);
    }

    async listPaged(params) {
        return this.executeStoredProcedure("ps.usp_Report_ListPaged", [
            { name: "EmpCode", type: sql.VarChar(50), value: params.empCode },
            { name: "PageNumber", type: sql.Int, value: Number(params.pageNumber || 1) },
            { name: "PageSize", type: sql.Int, value: Number(params.pageSize || 20) },
            { name: "Keyword", type: sql.NVarChar(200), value: params.keyword || null },
            { name: "FromDate", type: sql.Date, value: params.fromDate || null },
            { name: "ToDate", type: sql.Date, value: params.toDate || null },
            { name: "OrderCode", type: sql.VarChar(50), value: params.orderCode || null },
            { name: "SourcePlanID", type: sql.VarChar(50), value: params.sourcePlanId || null },
            { name: "ResponsibleDeptCode", type: sql.VarChar(50), value: params.responsibleDeptCode || null },
            { name: "OccurredDeptCode", type: sql.VarChar(50), value: params.occurredDeptCode || null },
            { name: "ExceptionTypeID", type: sql.Int, value: params.exceptionTypeId || null },
            { name: "ExceptionCauseID", type: sql.Int, value: params.exceptionCauseId || null },
            { name: "StatusCode", type: sql.VarChar(30), value: params.statusCode || null },
            { name: "HasCost", type: sql.Bit, value: params.hasCost || null },
            { name: "SeverityCode", type: sql.VarChar(30), value: params.severityCode || null },
            { name: "MainResponsibleEmpCode", type: sql.VarChar(50), value: params.mainResponsibleEmpCode || null },
            { name: "OnlyMine", type: sql.Bit, value: params.onlyMine === "true" || params.onlyMine === true },
            { name: "OnlyNeedMyResponse", type: sql.Bit, value: params.onlyNeedMyResponse === "true" || params.onlyNeedMyResponse === true },
            { name: "OnlyNeedMyApproval", type: sql.Bit, value: params.onlyNeedMyApproval === "true" || params.onlyNeedMyApproval === true },
            { name: "SortColumn", type: sql.VarChar(50), value: params.sortColumn || "CreatedAt" },
            { name: "SortDirection", type: sql.VarChar(4), value: params.sortDirection || "DESC" }
        ]);
    }

    async addAttachment(params) {
        return this.executeStoredProcedure("ps.usp_Report_AddAttachment", [
            { name: "ReportID", type: sql.BigInt, value: params.reportId },
            { name: "AttachmentScope", type: sql.VarChar(30), value: params.attachmentScope || "REPORT" },
            { name: "RefID", type: sql.BigInt, value: params.refId || null },
            { name: "FileName", type: sql.NVarChar(255), value: params.fileName },
            { name: "FilePath", type: sql.NVarChar(1000), value: params.filePath },
            { name: "FileExt", type: sql.VarChar(20), value: params.fileExt || null },
            { name: "MimeType", type: sql.VarChar(100), value: params.mimeType || null },
            { name: "FileSize", type: sql.BigInt, value: params.fileSize || null },
            { name: "UploadedByEmpCode", type: sql.VarChar(50), value: params.uploadedByEmpCode },
            { name: "UploadedByEmpName", type: sql.NVarChar(255), value: params.uploadedByEmpName }
        ]);
    }
}

module.exports = ReportRepository;