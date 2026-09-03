const DashboardService = require("../services/dashboard.service");
const ExcelJS = require("exceljs");

const service = new DashboardService();

async function getManagementDashboard(req, res, next) {
    try {
        const result = await service.getManagementDashboard(
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getCostDashboard(req, res, next) {
    try {
        const result = await service.getCostDashboard(
            req.query.fromDate || null,
            req.query.toDate || null
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function getOverdueDashboard(req, res, next) {
    try {
        const result = await service.getOverdueDashboard(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

async function exportOverdueDashboard(req, res, next) {
    try {
        const { items } = await service.getOverdueDashboard(req.query, true);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "BCPS System";
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet("Phiếu quá hạn", {
            views: [{ state: "frozen", ySplit: 1 }]
        });

        worksheet.columns = [
            { header: "Mã phiếu", key: "ReportNo", width: 24 },
            { header: "Nội dung", key: "ShortDescription", width: 42 },
            { header: "Ngày tạo", key: "CreatedAt", width: 18 },
            { header: "Hạn xử lý", key: "DueDate", width: 18 },
            { header: "Số ngày quá hạn", key: "OverdueDays", width: 17 },
            { header: "Người tạo", key: "CreatedByEmpName", width: 24 },
            { header: "Bộ phận người tạo", key: "CreatorDepartment", width: 26 },
            { header: "Trạng thái", key: "StatusName", width: 22 },
            { header: "Bước hiện tại", key: "CurrentStep", width: 30 },
            { header: "Đang chờ bộ phận", key: "WaitingDepartment", width: 32 },
            { header: "Lý do quá hạn", key: "OverdueReason", width: 42 },
            { header: "Bộ phận chậm đầu tiên", key: "FirstLateDepartment", width: 30 },
            { header: "Bộ phận chịu trách nhiệm", key: "ResponsibleDeptName", width: 30 },
            { header: "Người phụ trách chính", key: "MainResponsibleEmpName", width: 27 }
        ];

        for (const item of items) {
            worksheet.addRow({
                ...item,
                CreatedAt: item.CreatedAt ? new Date(item.CreatedAt) : null,
                DueDate: item.DueDate ? new Date(item.DueDate) : null
            });
        }

        worksheet.autoFilter = { from: "A1", to: "N1" };
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
        worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(1).height = 24;
        worksheet.getColumn("CreatedAt").numFmt = "dd/mm/yyyy hh:mm";
        worksheet.getColumn("DueDate").numFmt = "dd/mm/yyyy";
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
        });

        const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const filename = `BCPS-phieu-qua-han-${stamp}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getManagementDashboard,
    getCostDashboard,
    getOverdueDashboard,
    exportOverdueDashboard
};
