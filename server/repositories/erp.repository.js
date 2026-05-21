const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class ERPRepository extends DbRepository {
    async searchProductionPlans(params) {
        return this.executeStoredProcedure("erpint.usp_SearchProductionPlan", [
            { name: "OrderCode", type: sql.NVarChar(100), value: params.orderCode || null },
            { name: "Keyword", type: sql.NVarChar(200), value: params.keyword || null },
            { name: "DepartmentCode", type: sql.VarChar(50), value: params.departmentCode || null },
            { name: "UnitCode", type: sql.VarChar(50), value: params.unitCode || null },
            { name: "FromPlanDate", type: sql.Date, value: params.fromPlanDate || null },
            { name: "ToPlanDate", type: sql.Date, value: params.toPlanDate || null },
            { name: "TopN", type: sql.Int, value: params.topN || 200 }
        ]);
    }

    async getProductionPlanDetail(planSelectKey) {
        return this.executeStoredProcedure("erpint.usp_GetProductionPlanDetail_BySelectKey", [
            { name: "PlanSelectKey", type: sql.VarChar(300), value: planSelectKey }
        ]);
    }

    async searchEmployees(params) {
        return this.executeStoredProcedure("ps.usp_MasterData_SearchEmployees", [
            { name: "Keyword", type: sql.NVarChar(200), value: params.keyword || null },
            { name: "DepartmentCode", type: sql.NVarChar(255), value: params.departmentCode || null },
            { name: "UnitCode", type: sql.VarChar(50), value: params.unitCode || null }
        ]);
    }

    async getDepartments(params) {
        return this.executeStoredProcedure("ps.usp_MasterData_GetUnitNames", [
            { name: "Keyword", type: sql.NVarChar(200), value: params.keyword || null }
        ]);
    }

    async getManagedDepartments(empCode, keyword = null) {
        let sqlQuery = `
            SELECT DISTINCT
                DepartmentCode,
                DepartmentName,
                SourceType,
                SourceCode
            FROM (
                SELECT
                    CAST(DepartmentCode_NT AS NVARCHAR(255)) AS DepartmentCode,
                    CAST(DepartmentName_NT AS NVARCHAR(255)) AS DepartmentName,
                    CAST('CONTRACTOR' AS NVARCHAR(255)) AS SourceType,
                    CAST(DepartmentCode_NT AS NVARCHAR(255)) AS SourceCode
                FROM erpint.vw_Department_ManagerBy_Employee
                WHERE EmployeeCode = @empCode

                UNION ALL

                SELECT
                    CAST(CONCAT('NCC:', ncc.ID_NhaCungCap) AS NVARCHAR(255)) AS DepartmentCode,
                    CAST(ncc.Ten_NhaCungCap AS NVARCHAR(255)) AS DepartmentName,
                    CAST('SUPPLIER' AS NVARCHAR(255)) AS SourceType,
                    CAST(ncc.Maso_NhaCungCap AS NVARCHAR(255)) AS SourceCode
                FROM TAG_QTKD.dbo.PQ_TaiKhoan_NhaCungCap pq
                INNER JOIN TAG_QTKD.dbo.DM_NhaCungCap ncc
                    ON ncc.ID_NhaCungCap = pq.ID_NhaCungCap
                WHERE pq.ID_TaiKhoanDangNhap = TRY_CAST(@empCode AS SMALLINT)
                  AND ISNULL(pq.PhanQuyen, 0) = 1
            ) src
            WHERE 1 = 1`;
        const params = [{ name: "empCode", type: sql.VarChar(50), value: empCode }];

        if (keyword) {
            sqlQuery += " AND (DepartmentCode LIKE @keyword OR DepartmentName LIKE @keyword OR SourceCode LIKE @keyword)";
            params.push({ name: "keyword", type: sql.NVarChar(200), value: `%${keyword}%` });
        }

        sqlQuery += " ORDER BY SourceType, DepartmentName";

        return this.query(sqlQuery, params);
    }
}


module.exports = ERPRepository;
