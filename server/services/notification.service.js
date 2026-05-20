const { ok } = require("../common/api-response");
const NotificationRepository = require("../repositories/notification.repository");

const APPROVAL_ROLE_LABELS = {
    KHO_MANAGER: "Kho vận",
    VT_MANAGER: "Trưởng phòng Vật tư",
    BGD: "Ban giám đốc"
};

class NotificationService {
    constructor() {
        this.repo = new NotificationRepository();
    }

    async list(query, currentUser) {
        const result = await this.repo.listForUser(currentUser.employeeCode, query);
        const totalRows = result.recordsets?.[0]?.[0]?.TotalRows || 0;
        const pageNumber = Math.max(1, Number(query.pageNumber || 1));
        const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 20)));

        return ok({
            meta: {
                totalRows,
                pageNumber,
                pageSize,
                totalPages: Math.ceil(totalRows / pageSize)
            },
            items: result.recordsets?.[1] || []
        });
    }

    async unreadCount(currentUser) {
        const result = await this.repo.getUnreadCount(currentUser.employeeCode);
        return ok({ unreadCount: result.recordset?.[0]?.UnreadCount || 0 });
    }

    async markRead(notificationId, currentUser) {
        await this.repo.markRead(notificationId, currentUser.employeeCode);
        return ok({ notificationId }, "Đã đọc thông báo.");
    }

    async markAllRead(currentUser) {
        await this.repo.markAllRead(currentUser.employeeCode);
        return ok({}, "Đã đọc tất cả thông báo.");
    }

    async createForRecipients(recipients, payload, actorEmpCode) {
        const uniqueRecipients = [...new Set((recipients || []).filter(Boolean))]
            .filter((empCode) => empCode !== actorEmpCode);

        if (uniqueRecipients.length === 0) return;

        await this.repo.createMany(
            uniqueRecipients.map((recipientEmpCode) => ({
                recipientEmpCode,
                reportId: payload.reportId,
                typeCode: payload.typeCode,
                title: payload.title,
                body: payload.body,
                linkUrl: payload.linkUrl || `/reports/${payload.reportId}`,
                createdByEmpCode: actorEmpCode || null,
                dedupKey: payload.dedupKey
                    ? `${payload.dedupKey}:${recipientEmpCode}`
                    : null
            }))
        );
    }

    async createReportSubmitted(detail, actorEmpCode) {
        const report = detail?.report;
        if (!report) return;

        const recipientResult = await this.repo.getFeedbackRecipients(report.ReportID);
        const recipients = recipientResult.recordset?.map((row) => row.EmployeeCode) || [];
        const pendingDepartments = (detail.coordDepartments || [])
            .filter((dept) => dept.FeedbackStatusCode !== "RESPONDED")
            .map((dept) => dept.DepartmentName || dept.DepartmentCode)
            .filter(Boolean)
            .join(", ");

        await this.createForRecipients(recipients, {
            reportId: report.ReportID,
            typeCode: "REPORT_WAITING_FEEDBACK",
            title: `BCPS ${report.ReportNo} cần phản hồi`,
            body: pendingDepartments
                ? `Các bộ phận cần phản hồi: ${pendingDepartments}.`
                : `BCPS ${report.ReportNo} đang chờ phản hồi từ bộ phận phối hợp.`,
            dedupKey: `REPORT_WAITING_FEEDBACK:${report.ReportID}`
        }, actorEmpCode);
    }

    async createResponseSaved(detail, body, actorEmpCode) {
        const report = detail?.report;
        if (!report?.CreatedByEmpCode) return;

        const remaining = (detail.coordDepartments || [])
            .filter((dept) => dept.FeedbackStatusCode !== "RESPONDED");
        const departmentName = (detail.coordDepartments || [])
            .find((dept) => dept.DepartmentCode === body.departmentCode)?.DepartmentName || body.departmentCode;

        await this.createForRecipients([report.CreatedByEmpCode], {
            reportId: report.ReportID,
            typeCode: "REPORT_RESPONSE_SAVED",
            title: remaining.length > 0
                ? `BCPS ${report.ReportNo} có phản hồi mới`
                : `BCPS ${report.ReportNo} đã đủ phản hồi`,
            body: remaining.length > 0
                ? `${departmentName || "Một bộ phận"} đã phản hồi BCPS ${report.ReportNo}.`
                : `BCPS ${report.ReportNo} đã đủ phản hồi, có thể trình phê duyệt.`,
            dedupKey: `REPORT_RESPONSE_SAVED:${report.ReportID}:${body.departmentCode || actorEmpCode}`
        }, actorEmpCode);
    }

    async createApprovalSubmitted(detail, actorEmpCode) {
        const report = detail?.report;
        if (!report) return;

        const approverResult = await this.repo.getPendingApprovers(report.ReportID);
        const approvers = approverResult.recordset || [];

        await Promise.all(approvers.map((approver) =>
            this.createForRecipients([approver.EmployeeCode], {
                reportId: report.ReportID,
                typeCode: "REPORT_WAITING_APPROVAL",
                title: `BCPS ${report.ReportNo} cần phê duyệt`,
                body: `${APPROVAL_ROLE_LABELS[approver.ApprovalRoleCode] || "Người phê duyệt"} cần phê duyệt BCPS ${report.ReportNo}.`,
                dedupKey: `REPORT_WAITING_APPROVAL:${report.ReportID}:${approver.ApprovalRoleCode || approver.EmployeeCode}`
            }, actorEmpCode)
        ));
    }

    async createApprovalDecision(detail, decisionCode, decisionComment, actorEmpCode) {
        const report = detail?.report;
        if (!report) return;

        if (decisionCode === "RETURNED") {
            await this.createForRecipients([report.CreatedByEmpCode], {
                reportId: report.ReportID,
                typeCode: "REPORT_RETURNED",
                title: `BCPS ${report.ReportNo} bị trả lại bổ sung`,
                body: decisionComment || "Báo cáo cần bổ sung thông tin.",
                dedupKey: `REPORT_RETURNED:${report.ReportID}:${actorEmpCode}`
            }, actorEmpCode);
            return;
        }

        if (decisionCode === "REJECTED") {
            await this.createForRecipients([report.CreatedByEmpCode], {
                reportId: report.ReportID,
                typeCode: "REPORT_REJECTED",
                title: `BCPS ${report.ReportNo} bị từ chối`,
                body: decisionComment || "Báo cáo đã bị từ chối.",
                dedupKey: `REPORT_REJECTED:${report.ReportID}:${actorEmpCode}`
            }, actorEmpCode);
            return;
        }

        if (decisionCode === "FORWARD_BGD") {
            const bgdResult = await this.repo.getPendingApprovers(report.ReportID, "BGD");
            const bgdRecipients = bgdResult.recordset?.map((row) => row.EmployeeCode) || [];
            await this.createForRecipients(bgdRecipients, {
                reportId: report.ReportID,
                typeCode: "REPORT_FORWARD_BGD",
                title: `BCPS ${report.ReportNo} cần BGD phê duyệt`,
                body: `BCPS ${report.ReportNo} đã được trình Ban giám đốc.`,
                dedupKey: `REPORT_FORWARD_BGD:${report.ReportID}`
            }, actorEmpCode);

            await this.createForRecipients([report.CreatedByEmpCode], {
                reportId: report.ReportID,
                typeCode: "REPORT_FORWARD_BGD_INFO",
                title: `BCPS ${report.ReportNo} đã trình BGD`,
                body: `BCPS ${report.ReportNo} đã được trình Ban giám đốc.`,
                dedupKey: `REPORT_FORWARD_BGD_INFO:${report.ReportID}`
            }, actorEmpCode);
            return;
        }

        if (decisionCode === "APPROVED") {
            const pendingResult = await this.repo.getPendingApprovers(report.ReportID);
            const pendingApprovers = pendingResult.recordset || [];
            if (pendingApprovers.length > 0) {
                await Promise.all(pendingApprovers.map((approver) =>
                    this.createForRecipients([approver.EmployeeCode], {
                        reportId: report.ReportID,
                        typeCode: "REPORT_WAITING_APPROVAL",
                        title: `BCPS ${report.ReportNo} cần phê duyệt`,
                        body: `${APPROVAL_ROLE_LABELS[approver.ApprovalRoleCode] || "Người phê duyệt"} cần phê duyệt BCPS ${report.ReportNo}.`,
                        dedupKey: `REPORT_WAITING_APPROVAL:${report.ReportID}:${approver.ApprovalRoleCode || approver.EmployeeCode}`
                    }, actorEmpCode)
                ));
            } else {
                await this.createForRecipients([report.CreatedByEmpCode, report.MainResponsibleEmpCode], {
                    reportId: report.ReportID,
                    typeCode: "REPORT_APPROVED",
                    title: `BCPS ${report.ReportNo} đã được duyệt`,
                    body: `BCPS ${report.ReportNo} đã hoàn tất phê duyệt.`,
                    dedupKey: `REPORT_APPROVED:${report.ReportID}`
                }, actorEmpCode);
            }
        }
    }

    async createClosed(detail, actorEmpCode) {
        const report = detail?.report;
        if (!report) return;

        const deptResult = await this.repo.getFeedbackRecipients(report.ReportID, true);
        const deptRecipients = deptResult.recordset?.map((row) => row.EmployeeCode) || [];

        await this.createForRecipients([report.CreatedByEmpCode, report.MainResponsibleEmpCode, ...deptRecipients], {
            reportId: report.ReportID,
            typeCode: "REPORT_CLOSED",
            title: `BCPS ${report.ReportNo} đã đóng`,
            body: `BCPS ${report.ReportNo} đã được đóng.`,
            dedupKey: `REPORT_CLOSED:${report.ReportID}`
        }, actorEmpCode);
    }
}

module.exports = NotificationService;
