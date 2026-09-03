const test = require("node:test");
const assert = require("node:assert/strict");
const DashboardService = require("../services/dashboard.service");

test("normalizeOverdueFilters applies safe pagination and sorting defaults", () => {
    const service = new DashboardService();
    const filters = service.normalizeOverdueFilters({
        fromDate: "2026-08-01",
        toDate: "2026-09-03",
        page: "-2",
        pageSize: "999",
        sortBy: "unsafe-column",
        sortDirection: "anything"
    });

    assert.equal(filters.page, 1);
    assert.equal(filters.pageSize, 100);
    assert.equal(filters.sortBy, "overdueDays");
    assert.equal(filters.sortDirection, "DESC");
});

test("normalizeOverdueFilters rejects invalid and excessive date ranges", () => {
    const service = new DashboardService();

    assert.throws(
        () => service.normalizeOverdueFilters({ fromDate: "2026-02-31", toDate: "2026-09-03" }),
        /không hợp lệ/
    );
    assert.throws(
        () => service.normalizeOverdueFilters({ fromDate: "2020-01-01", toDate: "2026-09-03" }),
        /không vượt quá 5 năm/
    );
});

test("getOverdueDashboard returns paged data and the independent date-range KPI", async () => {
    const service = new DashboardService();
    service.repo = {
        getOverdueDashboard: async () => ({
            recordsets: [[{ ReportID: 7 }], [{ Total: 1 }], [{ TotalInDateRange: 9 }]]
        })
    };

    const result = await service.getOverdueDashboard({
        fromDate: "2026-08-01",
        toDate: "2026-09-03"
    });

    assert.equal(result.success, true);
    assert.equal(result.data.total, 1);
    assert.equal(result.data.dateRangeTotal, 9);
    assert.deepEqual(result.data.items, [{ ReportID: 7 }]);
});

