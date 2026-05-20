const DbRepository = require("./db.repository");
const { sql } = require("../config/db");

class NotificationRepository extends DbRepository {
    async createMany(items) {
        const rows = Array.isArray(items) ? items.filter((item) => item.recipientEmpCode) : [];
        if (rows.length === 0) return { rowsAffected: [0] };

        return this.query(
            `
            SET NOCOUNT ON;

            ;WITH src AS
            (
                SELECT
                    RecipientEmpCode,
                    ReportID,
                    TypeCode,
                    Title,
                    Body,
                    LinkUrl,
                    CreatedByEmpCode,
                    DedupKey
                FROM OPENJSON(@ItemsJson)
                WITH
                (
                    RecipientEmpCode VARCHAR(50) '$.recipientEmpCode',
                    ReportID BIGINT '$.reportId',
                    TypeCode VARCHAR(50) '$.typeCode',
                    Title NVARCHAR(255) '$.title',
                    Body NVARCHAR(1000) '$.body',
                    LinkUrl NVARCHAR(500) '$.linkUrl',
                    CreatedByEmpCode VARCHAR(50) '$.createdByEmpCode',
                    DedupKey VARCHAR(300) '$.dedupKey'
                )
            )
            INSERT INTO ps.Notification
            (
                RecipientEmpCode, ReportID, TypeCode, Title, Body,
                LinkUrl, CreatedByEmpCode, DedupKey
            )
            SELECT
                s.RecipientEmpCode, s.ReportID, s.TypeCode, s.Title, s.Body,
                s.LinkUrl, s.CreatedByEmpCode, s.DedupKey
            FROM src s
            WHERE s.RecipientEmpCode IS NOT NULL
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM ps.Notification n
                  WHERE s.DedupKey IS NOT NULL
                    AND n.DedupKey = s.DedupKey
              );
            `,
            [{ name: "ItemsJson", type: sql.NVarChar(sql.MAX), value: JSON.stringify(rows) }]
        );
    }

    async listForUser(empCode, params = {}) {
        const pageNumber = Math.max(1, Number(params.pageNumber || 1));
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize || 20)));

        return this.query(
            `
            SET NOCOUNT ON;

            SELECT COUNT(1) AS TotalRows
            FROM ps.Notification
            WHERE RecipientEmpCode = @EmpCode
              AND (@UnreadOnly = 0 OR IsRead = 0);

            SELECT
                NotificationID,
                RecipientEmpCode,
                ReportID,
                TypeCode,
                Title,
                Body,
                LinkUrl,
                IsRead,
                ReadAt,
                CreatedAt,
                CreatedByEmpCode
            FROM ps.Notification
            WHERE RecipientEmpCode = @EmpCode
              AND (@UnreadOnly = 0 OR IsRead = 0)
            ORDER BY CreatedAt DESC, NotificationID DESC
            OFFSET (@PageNumber - 1) * @PageSize ROWS
            FETCH NEXT @PageSize ROWS ONLY;
            `,
            [
                { name: "EmpCode", type: sql.VarChar(50), value: empCode },
                { name: "UnreadOnly", type: sql.Bit, value: params.unreadOnly === true || params.unreadOnly === "true" },
                { name: "PageNumber", type: sql.Int, value: pageNumber },
                { name: "PageSize", type: sql.Int, value: pageSize }
            ]
        );
    }

    async getUnreadCount(empCode) {
        return this.query(
            `
            SELECT COUNT(1) AS UnreadCount
            FROM ps.Notification
            WHERE RecipientEmpCode = @EmpCode
              AND IsRead = 0;
            `,
            [{ name: "EmpCode", type: sql.VarChar(50), value: empCode }]
        );
    }

    async markRead(notificationId, empCode) {
        return this.query(
            `
            UPDATE ps.Notification
            SET IsRead = 1,
                ReadAt = COALESCE(ReadAt, SYSDATETIME())
            WHERE NotificationID = @NotificationID
              AND RecipientEmpCode = @EmpCode;
            `,
            [
                { name: "NotificationID", type: sql.BigInt, value: notificationId },
                { name: "EmpCode", type: sql.VarChar(50), value: empCode }
            ]
        );
    }

    async markAllRead(empCode) {
        return this.query(
            `
            UPDATE ps.Notification
            SET IsRead = 1,
                ReadAt = COALESCE(ReadAt, SYSDATETIME())
            WHERE RecipientEmpCode = @EmpCode
              AND IsRead = 0;
            `,
            [{ name: "EmpCode", type: sql.VarChar(50), value: empCode }]
        );
    }

    async getFeedbackRecipients(reportId, onlyResponded = false) {
        return this.query(
            `
            SELECT DISTINCT ur.EmployeeCode
            FROM ps.ReportCoordDept cd
            INNER JOIN ps.UserRole ur
                ON ur.UnitName = cd.DepartmentCode
               AND ur.IsActive = 1
            INNER JOIN ps.RolePermission rp
                ON rp.RoleCode = ur.RoleCode
               AND rp.IsAllowed = 1
            WHERE cd.ReportID = @ReportID
              AND (
                    (@OnlyResponded = 0 AND ISNULL(cd.FeedbackStatusCode, '') <> 'RESPONDED')
                 OR (@OnlyResponded = 1 AND cd.FeedbackStatusCode = 'RESPONDED')
              );
            `,
            [
                { name: "ReportID", type: sql.BigInt, value: reportId },
                { name: "OnlyResponded", type: sql.Bit, value: onlyResponded }
            ]
        );
    }

    async getPendingApprovers(reportId, roleCode = null) {
        return this.query(
            `
            SELECT DISTINCT ApproverEmpCode AS EmployeeCode, ApprovalRoleCode, ApproverEmpName
            FROM ps.ReportApproval
            WHERE ReportID = @ReportID
              AND DecisionCode = 'PENDING'
              AND ApproverEmpCode IS NOT NULL
              AND (@RoleCode IS NULL OR ApprovalRoleCode = @RoleCode)
            ORDER BY ApprovalRoleCode;
            `,
            [
                { name: "ReportID", type: sql.BigInt, value: reportId },
                { name: "RoleCode", type: sql.VarChar(30), value: roleCode }
            ]
        );
    }
}

module.exports = NotificationRepository;
