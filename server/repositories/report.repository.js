const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class ReportRepository extends DbRepository {
    async getCreateFormMasterData() {
        return this.executeStoredProcedure("ps.usp_Report_GetCreateFormMasterData", []);
    }

    async saveDraft(params) {
        console.log("Saving draft with params:", params);
        const nv = (v) => (v === undefined ? null : v);

        const result = await this.executeStoredProcedure("ps.usp_Report_SaveDraftFull", [
            { name: "ReportID", type: sql.BigInt, value: nv(params.reportId), output: true },
            { name: "ReportNo", type: sql.VarChar, output: true, length: 30 },

            { name: "PlanSelectKey", type: sql.VarChar(300), value: nv(params.planSelectKey) },
            { name: "OccurrenceTime", type: sql.DateTime2(0), value: nv(params.occurrenceTime) },
            { name: "ExceptionTypeID", type: sql.Int, value: nv(params.exceptionTypeId) },
            { name: "ExceptionCauseID", type: sql.Int, value: nv(params.exceptionCauseId) },
            { name: "SeverityCode", type: sql.VarChar(30), value: nv(params.severityCode) },
            { name: "ShortDescription", type: sql.NVarChar(500), value: nv(params.shortDescription) },
            { name: "DetailedDescription", type: sql.NVarChar(sql.MAX), value: nv(params.detailedDescription) },
            { name: "AffectedQty", type: sql.Decimal(18, 3), value: nv(params.affectedQty) },
            { name: "AffectedUom", type: sql.NVarChar(50), value: nv(params.affectedUom) },
            { name: "ResponsibleDeptCode", type: sql.NVarChar(255), value: nv(params.responsibleDeptCode) },
            { name: "MainResponsibleEmpCode", type: sql.VarChar(50), value: nv(params.mainResponsibleEmpCode) },
            { name: "ProposedSolution", type: sql.NVarChar(sql.MAX), value: nv(params.proposedSolution) },
            { name: "InterimAction", type: sql.NVarChar(sql.MAX), value: nv(params.interimAction) },
            { name: "ExpectedResult", type: sql.NVarChar(sql.MAX), value: nv(params.expectedResult) },
            { name: "DueDate", type: sql.DateTime2(0), value: nv(params.dueDate) },
            { name: "HasCost", type: sql.Bit, value: nv(params.hasCost) },
            { name: "AffectsERP", type: sql.Bit, value: nv(params.affectsERP) },
            { name: "ImpactCodesCsv", type: sql.NVarChar(500), value: nv(params.impactCodesCsv) },
            { name: "CoordDepartmentCodesCsv", type: sql.NVarChar(sql.MAX), value: params.coordDepartmentCodesCsv || null },
            { name: "OccurredDeptCode_NT", type: sql.NVarChar(250), value: params.occurredDeptCode_NT || null },
            // { name: "OccurredDeptName_NT", type: sql.NVarChar(250), value: params.occurredDeptCode_NT || null },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: params.actionByEmpCode }
        ]);

        const reportId = result.output.ReportID || result.output.ReportId || params.reportId;
        if (reportId && params.occurredDeptCode_NT) {
            await this.query(
                `
                UPDATE ps.Report
                SET
                    OccurredDeptCode_NT = @OccurredDeptName,
                    OccurredDeptName_NT = @OccurredDeptName
                WHERE ReportID = @ReportID;
                `,
                [
                    { name: "ReportID", type: sql.BigInt, value: reportId },
                    { name: "OccurredDeptName", type: sql.NVarChar(255), value: params.occurredDeptCode_NT }
                ]
            );
        }

        return result;
    }

    async saveDraftWithoutPlan(params) {
        const result = await this.query(
            `
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRAN;

                DECLARE
                    @ResponsibleDeptName NVARCHAR(255),
                    @MainResponsibleEmpName NVARCHAR(255),
                    @CreatedByEmpName NVARCHAR(255),
                    @Seq BIGINT,
                    @ReportNo VARCHAR(30),
                    @ReportID BIGINT;

                SELECT TOP (1)
                    @ResponsibleDeptName = DepartmentName
                FROM ps.vw_Department
                WHERE DepartmentCode = @ResponsibleDeptCode
                  AND IsActive = 1;

                IF @ResponsibleDeptName IS NULL
                    THROW 54001, N'Bộ phận chịu trách nhiệm không hợp lệ.', 1;

                SELECT TOP (1)
                    @MainResponsibleEmpName = EmployeeName
                FROM erpint.vw_Employee
                WHERE EmployeeCode = @MainResponsibleEmpCode
                  AND IsActive = 1;

                IF @MainResponsibleEmpName IS NULL
                    THROW 54002, N'Cá nhân chịu trách nhiệm chính không hợp lệ.', 1;

                SELECT TOP (1)
                    @CreatedByEmpName = EmployeeName
                FROM erpint.vw_Employee
                WHERE EmployeeCode = @ActionByEmpCode
                  AND IsActive = 1;

                IF @CreatedByEmpName IS NULL
                    THROW 54003, N'Người tạo báo cáo không hợp lệ.', 1;

                SET @Seq = NEXT VALUE FOR ps.Seq_ReportNo;
                SET @ReportNo = CONCAT(
                    'BCPS-',
                    CONVERT(VARCHAR(8), GETDATE(), 112),
                    '-',
                    RIGHT(REPLICATE('0', 6) + CAST(@Seq AS VARCHAR(20)), 6)
                );

                INSERT INTO ps.Report
                (
                    ReportNo,
                    OccurrenceTime,
                    ExceptionTypeID,
                    ExceptionCauseID,
                    SeverityCode,
                    ShortDescription,
                    DetailedDescription,
                    AffectedQty,
                    AffectedUom,
                    ResponsibleDeptCode,
                    ResponsibleDeptName,
                    MainResponsibleEmpCode,
                    MainResponsibleEmpName,
                    ProposedSolution,
                    InterimAction,
                    ExpectedResult,
                    DueDate,
                    HasCost,
                    AffectsERP,
                    OccurredDeptCode_NT,
                    OccurredDeptName_NT,
                    StatusCode,
                    CurrentStep,
                    CreatedByEmpCode,
                    CreatedByEmpName,
                    CreatedAt
                )
                VALUES
                (
                    @ReportNo,
                    @OccurrenceTime,
                    @ExceptionTypeID,
                    @ExceptionCauseID,
                    @SeverityCode,
                    @ShortDescription,
                    @DetailedDescription,
                    @AffectedQty,
                    @AffectedUom,
                    @ResponsibleDeptCode,
                    @ResponsibleDeptName,
                    @MainResponsibleEmpCode,
                    @MainResponsibleEmpName,
                    @ProposedSolution,
                    @InterimAction,
                    @ExpectedResult,
                    @DueDate,
                    @HasCost,
                    0,
                    @OccurredDeptCode_NT,
                    @OccurredDeptCode_NT,
                    'DRAFT',
                    N'Nháp',
                    @ActionByEmpCode,
                    @CreatedByEmpName,
                    SYSDATETIME()
                );

                SET @ReportID = SCOPE_IDENTITY();

                INSERT INTO ps.ReportHistory
                (
                    ReportID, ActionCode, ActionName, FromStatusCode, ToStatusCode,
                    ActionByEmpCode, ActionByEmpName, ActionAt, Note
                )
                VALUES
                (
                    @ReportID,
                    'CREATE',
                    N'Tạo báo cáo phát sinh không gắn kế hoạch ERP',
                    NULL,
                    'DRAFT',
                    @ActionByEmpCode,
                    @CreatedByEmpName,
                    SYSDATETIME(),
                    N'Báo cáo được tạo không gắn kế hoạch ERP.'
                );

                EXEC ps.usp_Report_SetImpacts
                    @ReportID = @ReportID,
                    @ImpactCodesCsv = @ImpactCodesCsv;

                EXEC ps.usp_Report_SetCoordDepartments
                    @ReportID = @ReportID,
                    @DepartmentCodesCsv = @CoordDepartmentCodesCsv;

                COMMIT;

                SELECT @ReportID AS ReportID, @ReportNo AS ReportNo;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0
                    ROLLBACK;
                THROW;
            END CATCH
            `,
            [
                { name: "OccurrenceTime", type: sql.DateTime2(0), value: params.occurrenceTime },
                { name: "ExceptionTypeID", type: sql.Int, value: params.exceptionTypeId },
                { name: "ExceptionCauseID", type: sql.Int, value: params.exceptionCauseId },
                { name: "SeverityCode", type: sql.VarChar(30), value: params.severityCode },
                { name: "ShortDescription", type: sql.NVarChar(sql.MAX), value: params.shortDescription },
                { name: "DetailedDescription", type: sql.NVarChar(sql.MAX), value: params.detailedDescription },
                { name: "AffectedQty", type: sql.Decimal(18, 3), value: params.affectedQty },
                { name: "AffectedUom", type: sql.NVarChar(50), value: params.affectedUom },
                { name: "ResponsibleDeptCode", type: sql.NVarChar(255), value: params.responsibleDeptCode },
                { name: "MainResponsibleEmpCode", type: sql.VarChar(50), value: params.mainResponsibleEmpCode },
                { name: "ProposedSolution", type: sql.NVarChar(sql.MAX), value: params.proposedSolution },
                { name: "InterimAction", type: sql.NVarChar(sql.MAX), value: params.interimAction },
                { name: "ExpectedResult", type: sql.NVarChar(sql.MAX), value: params.expectedResult },
                { name: "DueDate", type: sql.DateTime2(0), value: params.dueDate },
                { name: "HasCost", type: sql.Bit, value: params.hasCost },
                { name: "ImpactCodesCsv", type: sql.NVarChar(500), value: params.impactCodesCsv || "" },
                { name: "CoordDepartmentCodesCsv", type: sql.NVarChar(sql.MAX), value: params.coordDepartmentCodesCsv || "" },
                { name: "OccurredDeptCode_NT", type: sql.NVarChar(255), value: params.occurredDeptCode_NT || null },
                { name: "ActionByEmpCode", type: sql.VarChar(50), value: params.actionByEmpCode }
            ]
        );

        const row = result.recordset?.[0] || {};
        return {
            recordsets: result.recordsets || [],
            output: {
                ReportID: row.ReportID,
                ReportNo: row.ReportNo
            }
        };
    }

    async syncPlans(reportId, planItems, actionByEmpCode) {
        const items = Array.isArray(planItems) ? planItems : [];
        return this.query(
            `
            SET NOCOUNT ON;
            SET XACT_ABORT ON;

            BEGIN TRY
                BEGIN TRAN;

                DECLARE @OldKeys NVARCHAR(MAX);
                SELECT @OldKeys =
                    STUFF
                    (
                        (
                            SELECT N', ' + rp.PlanSelectKey
                            FROM ps.ReportPlan rp
                            WHERE rp.ReportID = @ReportID
                            ORDER BY rp.PlanSelectKey
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),
                        1,
                        2,
                        N''
                    );

                DELETE FROM ps.ReportPlan
                WHERE ReportID = @ReportID;

                ;WITH requested AS
                (
                    SELECT DISTINCT LTRIM(RTRIM(PlanSelectKey)) AS PlanSelectKey
                    FROM OPENJSON(@PlanItemsJson)
                    WITH
                    (
                        PlanSelectKey VARCHAR(300) '$.planSelectKey'
                    )
                    WHERE NULLIF(LTRIM(RTRIM(PlanSelectKey)), '') IS NOT NULL
                ),
                parsed AS
                (
                    SELECT
                        PlanSelectKey,
                        CHARINDEX('|', PlanSelectKey) AS p1,
                        CHARINDEX('|', PlanSelectKey, CHARINDEX('|', PlanSelectKey) + 1) AS p2,
                        CHARINDEX('|', PlanSelectKey, CHARINDEX('|', PlanSelectKey, CHARINDEX('|', PlanSelectKey) + 1) + 1) AS p3
                    FROM requested
                ),
                normalized AS
                (
                    SELECT
                        PlanSelectKey,
                        SUBSTRING(PlanSelectKey, 1, p1 - 1) AS PlanID,
                        SUBSTRING(PlanSelectKey, p1 + 1, p2 - p1 - 1) AS ProductCode,
                        SUBSTRING(PlanSelectKey, p2 + 1, p3 - p2 - 1) AS OperationCode,
                        SUBSTRING(PlanSelectKey, p3 + 1, LEN(PlanSelectKey) - p3) AS DepartmentCode
                    FROM parsed
                    WHERE p1 > 0 AND p2 > p1 AND p3 > p2
                )
                INSERT INTO ps.ReportPlan
                (
                    ReportID, PlanSelectKey, PlanID, PlanNo, OrderCode, ProductCode, ProductName,
                    OperationCode, OperationName, DepartmentCode, DepartmentName,
                    WorkshopCode, WorkshopName, PlanDate, PlanQty, Uom, ERPPlanStatus
                )
                SELECT
                    @ReportID,
                    n.PlanSelectKey,
                    p.PlanID,
                    p.PlanNo,
                    p.OrderCode,
                    p.ProductCode,
                    p.ProductName,
                    p.OperationCode,
                    p.OperationName,
                    p.DepartmentCode,
                    p.DepartmentName,
                    p.UnitCode,
                    p.UnitName,
                    p.PlanDate,
                    p.PlanQty,
                    p.Uom,
                    p.PlanStatus
                FROM normalized n
                INNER JOIN erpint.vw_ProductionPlan p
                    ON p.PlanID = n.PlanID
                   AND p.ProductCode = n.ProductCode
                   AND p.OperationCode = n.OperationCode
                   AND p.DepartmentCode = n.DepartmentCode;

                IF (SELECT COUNT(DISTINCT LTRIM(RTRIM(PlanSelectKey))) FROM OPENJSON(@PlanItemsJson) WITH (PlanSelectKey VARCHAR(300) '$.planSelectKey') WHERE NULLIF(LTRIM(RTRIM(PlanSelectKey)), '') IS NOT NULL) <> (SELECT COUNT(1) FROM ps.ReportPlan WHERE ReportID = @ReportID)
                    THROW 56001, N'Có kế hoạch ERP không hợp lệ hoặc bị trùng.', 1;

                ;WITH requestedAdjustments AS
                (
                    SELECT
                        LTRIM(RTRIM(PlanSelectKey)) AS PlanSelectKey,
                        AdjustQty,
                        AdjustDate
                    FROM OPENJSON(@PlanItemsJson)
                    WITH
                    (
                        PlanSelectKey VARCHAR(300) '$.planSelectKey',
                        AdjustQty DECIMAL(18, 3) '$.adjustQty',
                        AdjustDate DATE '$.adjustDate'
                    )
                    WHERE NULLIF(LTRIM(RTRIM(PlanSelectKey)), '') IS NOT NULL
                )
                MERGE ps.ReportPlanAdjustment AS target
                USING
                (
                    SELECT
                        @ReportID AS ReportID,
                        PlanSelectKey,
                        MAX(AdjustQty) AS AdjustQty,
                        MAX(AdjustDate) AS AdjustDate
                    FROM requestedAdjustments
                    GROUP BY PlanSelectKey
                ) AS source
                    ON target.ReportID = source.ReportID
                   AND target.PlanSelectKey = source.PlanSelectKey
                WHEN MATCHED THEN
                    UPDATE SET
                        AdjustQty = source.AdjustQty,
                        AdjustDate = source.AdjustDate,
                        UpdatedAt = SYSDATETIME()
                WHEN NOT MATCHED BY TARGET THEN
                    INSERT (ReportID, PlanSelectKey, AdjustQty, AdjustDate)
                    VALUES (source.ReportID, source.PlanSelectKey, source.AdjustQty, source.AdjustDate);

                DELETE adj
                FROM ps.ReportPlanAdjustment adj
                WHERE adj.ReportID = @ReportID
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM ps.ReportPlan rp
                      WHERE rp.ReportID = adj.ReportID
                        AND rp.PlanSelectKey = adj.PlanSelectKey
                  );

                DECLARE @NewKeys NVARCHAR(MAX);
                SELECT @NewKeys =
                    STUFF
                    (
                        (
                            SELECT N', ' + rp.PlanSelectKey
                            FROM ps.ReportPlan rp
                            WHERE rp.ReportID = @ReportID
                            ORDER BY rp.PlanSelectKey
                            FOR XML PATH(''), TYPE
                        ).value('.', 'NVARCHAR(MAX)'),
                        1,
                        2,
                        N''
                    );

                IF ISNULL(@OldKeys, N'') <> ISNULL(@NewKeys, N'')
                BEGIN
                    INSERT INTO ps.ReportHistory
                    (
                        ReportID, ActionCode, ActionName, FromStatusCode, ToStatusCode,
                        ActionByEmpCode, ActionByEmpName, ActionAt, Note
                    )
                    SELECT
                        r.ReportID,
                        CASE WHEN @OldKeys IS NULL THEN 'SET_PLANS' ELSE 'UPDATE_PLANS' END,
                        CASE WHEN @OldKeys IS NULL THEN N'Gắn kế hoạch ERP' ELSE N'Cập nhật danh sách kế hoạch ERP' END,
                        r.StatusCode,
                        r.StatusCode,
                        @ActionByEmpCode,
                        e.EmployeeName,
                        SYSDATETIME(),
                        CONCAT(N'Từ: ', ISNULL(@OldKeys, N'(trống)'), N' | Thành: ', ISNULL(@NewKeys, N'(trống)'))
                    FROM ps.Report r
                    LEFT JOIN erpint.vw_Employee e
                        ON e.EmployeeCode = @ActionByEmpCode
                    WHERE r.ReportID = @ReportID;
                END

                COMMIT;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK;
                THROW;
            END CATCH
            `,
            [
                { name: "ReportID", type: sql.BigInt, value: reportId },
                { name: "PlanItemsJson", type: sql.NVarChar(sql.MAX), value: JSON.stringify(items) },
                { name: "ActionByEmpCode", type: sql.VarChar(50), value: actionByEmpCode }
            ]
        );
    }

    async submit(reportId, empCode) {
        return this.executeStoredProcedure("ps.usp_Report_SubmitFull", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: empCode }
        ]);
    }

    async getDetail(id) {
        const result = await this.executeStoredProcedure("ps.usp_Report_GetDetail", [
            { name: "ReportID", type: sql.BigInt, value: id }
        ]);

        if (!result.recordsets[0].length || result.recordsets[0][0].IsDeleted) return null;

        const report = result.recordsets[0][0];
        const impacts = result.recordsets[1];
        const coordDepts = result.recordsets[2];
        const responses = result.recordsets[3];
        const costLines = result.recordsets[4];
        const approvals = result.recordsets[5];
        const attachments = result.recordsets[6];
        const history = result.recordsets[7];
        const planResult = await this.query(
            `
            SELECT
                rp.*,
                adj.AdjustQty,
                adj.AdjustDate
            FROM ps.ReportPlan rp
            LEFT JOIN ps.ReportPlanAdjustment adj
                ON adj.ReportID = rp.ReportID
               AND adj.PlanSelectKey = rp.PlanSelectKey
            WHERE rp.ReportID = @ReportID
            ORDER BY rp.PlanDate DESC, rp.PlanNo;
            `,
            [{ name: "ReportID", type: sql.BigInt, value: id }]
        );
        const plans = planResult.recordset || [];

        return {
            report: {
                ...report,
                occurredDeptCode_NT: report.OccurredDeptCode_NT,
                occurredDeptName_NT: report.OccurredDeptName_NT,
            },
            impacts,
            coordDepartments: coordDepts,
            responses,
            costLines,
            approvals,
            attachments,
            history,
            plans
        };
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
            { name: "DepartmentCode", type: sql.NVarChar(255), value: params.departmentCode },
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
            { name: "DepartmentCode", type: sql.NVarChar(255), value: params.departmentCode },
            { name: "CostTypeID", type: sql.Int, value: params.costTypeId },
            { name: "CostItemDesc", type: sql.NVarChar(500), value: params.costItemDesc },
            { name: "Qty", type: sql.Decimal(18, 3), value: params.qty ?? null },
            { name: "UnitCost", type: sql.Decimal(18, 2), value: params.unitCost ?? null },
            { name: "ManualAmount", type: sql.Decimal(18, 2), value: params.manualAmount ?? null },
            { name: "Note", type: sql.NVarChar(1000), value: params.note || null },
            { name: "CreatedByEmpCode", type: sql.VarChar(50), value: params.createdByEmpCode },
            { name: "CreatedByEmpName", type: sql.NVarChar(255), value: params.createdByEmpName }
        ]);
    }

    async submitApproval(reportId, empCode, empName, options = {}) {
        return this.executeStoredProcedure("ps.usp_Report_SubmitForApproval", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: empCode },
            { name: "ActionByEmpName", type: sql.NVarChar(255), value: empName },
            { name: "BypassCreatorCheck", type: sql.Bit, value: Boolean(options.bypassCreatorCheck) },
            { name: "IsAutoSubmit", type: sql.Bit, value: Boolean(options.isAutoSubmit) }
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
        console.log("listPaged params:", params);
        return this.executeStoredProcedure("ps.usp_Report_ListPaged", [
            { name: "EmpCode", type: sql.VarChar(50), value: params.empCode },
            { name: "PageNumber", type: sql.Int, value: Number(params.pageNumber || 1) },
            { name: "PageSize", type: sql.Int, value: Number(params.pageSize || 20) },
            { name: "Keyword", type: sql.NVarChar(200), value: params.keyword || null },
            { name: "FromDate", type: sql.Date, value: params.fromDate || null },
            { name: "ToDate", type: sql.Date, value: params.toDate || null },
            { name: "OrderCode", type: sql.VarChar(50), value: params.orderCode || null },
            { name: "SourcePlanID", type: sql.VarChar(50), value: params.sourcePlanId || null },
            { name: "ResponsibleDeptCode", type: sql.NVarChar(255), value: params.responsibleDeptCode || null },
            { name: "OccurredDeptCode", type: sql.VarChar(50), value: params.occurredDeptCode || null },

            // SỬA: Ép kiểu rõ ràng sang Number
            { name: "ExceptionTypeID", type: sql.Int, value: params.exceptionTypeId ? Number(params.exceptionTypeId) : null },
            { name: "ExceptionCauseID", type: sql.Int, value: params.exceptionCauseId ? Number(params.exceptionCauseId) : null },

            { name: "StatusCode", type: sql.VarChar(30), value: params.statusCode || null },

            // SỬA: Xử lý chuỗi "true"/"false" từ query string sang boolean
            { name: "HasCost", type: sql.Bit, value: params.hasCost === "true" || params.hasCost === true ? true : (params.hasCost === "false" || params.hasCost === false ? false : null) },

            { name: "SeverityCode", type: sql.VarChar(30), value: params.severityCode || null },
            { name: "MainResponsibleEmpCode", type: sql.VarChar(50), value: params.mainResponsibleEmpCode || null },

            // Những cái dưới bạn đã làm đúng (ép sang boolean)
            { name: "OnlyMine", type: sql.Bit, value: params.onlyMine === "true" || params.onlyMine === true },
            { name: "OnlyNeedMyResponse", type: sql.Bit, value: params.onlyNeedMyResponse === "true" || params.onlyNeedMyResponse === true },
            { name: "OnlyNeedMyApproval", type: sql.Bit, value: params.onlyNeedMyApproval === "true" || params.onlyNeedMyApproval === true },
            { name: "PendingResponseDeptCode", type: sql.NVarChar(255), value: params.pendingResponseDeptCode || null },

            { name: "SortColumn", type: sql.VarChar(50), value: params.sortColumn || "CreatedAt" },
            { name: "SortDirection", type: sql.VarChar(4), value: params.sortDirection || "DESC" }
        ]);
    }

    async deleteDraft(reportId, empCode) {
        return this.executeStoredProcedure("ps.usp_Report_DeleteDraft", [
            { name: "ReportID", type: sql.BigInt, value: reportId },
            { name: "ActionByEmpCode", type: sql.VarChar(50), value: empCode }
        ]);
    }

    async getPlansForReports(reportIds) {
        if (!Array.isArray(reportIds) || reportIds.length === 0) return { recordset: [] };
        return this.query(
            `
            SELECT
                rp.*,
                adj.AdjustQty,
                adj.AdjustDate
            FROM ps.ReportPlan rp
            LEFT JOIN ps.ReportPlanAdjustment adj
                ON adj.ReportID = rp.ReportID
               AND adj.PlanSelectKey = rp.PlanSelectKey
            WHERE rp.ReportID IN (SELECT TRY_CAST([value] AS BIGINT) FROM OPENJSON(@ReportIdsJson))
            ORDER BY rp.ReportID, rp.PlanDate DESC, rp.PlanNo;
            `,
            [
                { name: "ReportIdsJson", type: sql.NVarChar(sql.MAX), value: JSON.stringify(reportIds) }
            ]
        );
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
