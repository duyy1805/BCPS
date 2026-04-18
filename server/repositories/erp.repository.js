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
        let sqlQuery = "SELECT DepartmentCode_NT AS DepartmentCode, DepartmentName_NT AS DepartmentName FROM erpint.vw_Department_ManagerBy_Employee WHERE EmployeeCode = @empCode";
        const params = [{ name: "empCode", type: sql.VarChar(50), value: empCode }];

        if (keyword) {
            sqlQuery += " AND (DepartmentCode_NT LIKE @keyword OR DepartmentName_NT LIKE @keyword)";
            params.push({ name: "keyword", type: sql.NVarChar(200), value: `%${keyword}%` });
        }

        return this.query(sqlQuery, params);
    }
}


module.exports = ERPRepository;