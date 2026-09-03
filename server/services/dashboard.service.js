const { ok } = require("../common/api-response");
const DashboardRepository = require("../repositories/dashboard.repository");

class DashboardService {
    constructor() {
        this.repo = new DashboardRepository();
    }

    async getManagementDashboard(fromDate, toDate) {
        const result = await this.repo.getManagementDashboard(fromDate || null, toDate || null);

        return ok({
            summary: result.recordsets[0]?.[0] || {},
            statusBreakdown: result.recordsets[1] || [],
            trendByDay: result.recordsets[2] || [],
            topExceptionTypes: result.recordsets[3] || [],
            topExceptionCauses: result.recordsets[4] || [],
            topResponsibleDepartments: result.recordsets[5] || [],
            topOccurredDepartments: result.recordsets[6] || [],
            overdueItems: result.recordsets[7] || [],
            topResponsibleEmployees: result.recordsets[8] || [],
            topCausedByDepartments: result.recordsets[9] || []
        });
    }

    async getCostDashboard(fromDate, toDate) {
        const result = await this.repo.getCostDashboard(fromDate || null, toDate || null);

        return ok({
            summary: result.recordsets[0]?.[0] || {},
            byExceptionType: result.recordsets[1] || [],
            byExceptionCause: result.recordsets[2] || [],
            byDepartment: result.recordsets[3] || [],
            topCostReports: result.recordsets[4] || []
        });
    }

    normalizeOverdueFilters(query = {}) {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const toIsoDate = (value) => [
            value.getFullYear(),
            String(value.getMonth() + 1).padStart(2, "0"),
            String(value.getDate()).padStart(2, "0")
        ].join("-");
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const fromDate = query.fromDate || toIsoDate(firstDay);
        const toDate = query.toDate || toIsoDate(today);

        if (!datePattern.test(fromDate) || !datePattern.test(toDate)) {
            const error = new Error("Khoảng ngày không đúng định dạng YYYY-MM-DD.");
            error.statusCode = 400;
            throw error;
        }

        const parseIsoDate = (value) => {
            const parsed = new Date(`${value}T00:00:00Z`);
            return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
                ? parsed
                : null;
        };
        const from = parseIsoDate(fromDate);
        const to = parseIsoDate(toDate);
        if (!from || !to) {
            const error = new Error("Khoảng ngày không hợp lệ.");
            error.statusCode = 400;
            throw error;
        }
        const rangeDays = (to - from) / 86400000;
        if (!Number.isFinite(rangeDays) || rangeDays < 0 || rangeDays > 1827) {
            const error = new Error("Khoảng ngày phải hợp lệ và không vượt quá 5 năm.");
            error.statusCode = 400;
            throw error;
        }

        const allowedSorts = new Set(["overdueDays", "dueDate", "createdAt"]);
        const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
        const pageSize = Math.min(100, Math.max(10, Number.parseInt(query.pageSize, 10) || 20));

        return {
            fromDate,
            toDate,
            keyword: String(query.keyword || "").trim().slice(0, 255),
            statusCode: String(query.statusCode || "").trim().slice(0, 30),
            waitingDepartment: String(query.waitingDepartment || "").trim().slice(0, 255),
            page,
            pageSize,
            sortBy: allowedSorts.has(query.sortBy) ? query.sortBy : "overdueDays",
            sortDirection: String(query.sortDirection || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC"
        };
    }

    async getOverdueDashboard(query, isExport = false) {
        const filters = this.normalizeOverdueFilters(query);
        const result = await this.repo.getOverdueDashboard(filters, isExport);
        const items = result.recordsets[0] || [];
        const total = Number(result.recordsets[1]?.[0]?.Total || 0);
        const dateRangeTotal = Number(result.recordsets[2]?.[0]?.TotalInDateRange || 0);

        if (isExport) return { items, total, dateRangeTotal, filters };

        return ok({ items, total, dateRangeTotal, page: filters.page, pageSize: filters.pageSize });
    }
}

module.exports = DashboardService;
