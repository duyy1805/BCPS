import React from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * ProductionIssuePrintTemplate
 * Template for "BÁO CÁO PHÁT SINH TRONG SẢN XUẤT"
 */
export const ProductionIssuePrintTemplate = React.forwardRef(({ data }, ref) => {
    if (!data || !data.report) return null;

    const { report, responses, approvals, costLines, plans = [] } = data;

    // Helpers
    const formatPrintDate = (dateStr) => {
        if (!dateStr) return "Ngày ... tháng ... năm ...";
        const d = new Date(dateStr);
        return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    };

    const formatCurrency = (val) => {
        const num = Number(val);
        if (isNaN(num)) return "0 đ";
        return new Intl.NumberFormat("vi-VN").format(num) + " đ";
    };

    const styles = {
        container: {
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000",
            backgroundColor: "#fff",
            padding: "0",
            margin: "0",
            width: "100%",
        },
        paper: {
            width: "297mm", // A4 Landscape
            minHeight: "210mm",
            padding: "10mm 15mm",
            boxSizing: "border-box",
            margin: "0 auto",
        },
        headerTable: {
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #000",
            marginBottom: "10px",
        },
        headerCell: {
            border: "1px solid #000",
            padding: "5px",
            textAlign: "center",
            verticalAlign: "middle",
        },
        title: {
            fontSize: "18pt",
            fontWeight: "bold",
            textTransform: "uppercase",
            margin: "5px 0",
        },
        reportNo: {
            fontSize: "13pt",
            fontWeight: "bold",
            margin: "2px 0",
        },
        sectionTitle: {
            fontSize: "12pt",
            fontWeight: "bold",
            marginBottom: "8px",
            marginTop: "15px",
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #000",
            fontSize: "10pt",
        },
        th: {
            border: "1px solid #000",
            padding: "6px 2px",
            fontWeight: "bold",
            textAlign: "center",
            backgroundColor: "#f2f2f2",
            fontSize: "9pt",
            lineHeight: "1.2",
        },
        td: {
            border: "1px solid #000",
            padding: "6px 4px",
            verticalAlign: "middle",
            fontSize: "10pt",
            wordBreak: "break-word",
        },
        tdCenter: {
            border: "1px solid #000",
            padding: "6px 3px",
            textAlign: "center",
            verticalAlign: "middle",
        },
        tdRight: {
            border: "1px solid #000",
            padding: "6px 5px",
            textAlign: "right",
            verticalAlign: "middle",
        },
        signatureArea: {
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
        },
        signatureBox: {
            textAlign: "center",
            width: "30%",
            position: "relative",
            minHeight: "120px",
        },
        stamp: {
            position: "absolute",
            top: "30px",
            left: "50%",
            transform: "translateX(-50%) rotate(-10deg)",
            border: "2px solid #ef4444",
            color: "#ef4444",
            padding: "2px 8px",
            borderRadius: "4px",
            fontWeight: "bold",
            fontSize: "12pt",
            opacity: "0.8",
            pointerEvents: "none",
            backgroundColor: "rgba(255,255,255,0.7)",
            zIndex: 1,
            textTransform: "uppercase",
        },
        qrCode: {
            display: "inline-block",
            padding: "5px",
            backgroundColor: "#fff",
        }
    };

    // --- Signatures Logic ---
    // 1. Reporter
    const reporterName = report.CreatedByEmpName;

    // 2. KHO Manager
    const khoApprover = approvals?.find(a => a.ApprovalRoleCode === 'KHO_MANAGER' && a.DecisionCode !== 'PENDING')
        || approvals?.find(a => a.ApprovalRoleCode === 'KHO_MANAGER');

    // 3. VT Manager
    const vtApprover = approvals?.find(a => a.ApprovalRoleCode === 'VT_MANAGER' && a.DecisionCode !== 'PENDING')
        || approvals?.find(a => a.ApprovalRoleCode === 'VT_MANAGER');

    // 4. BGD
    const bgdApprover = approvals?.find(a => a.ApprovalRoleCode === 'BGD' && a.DecisionCode !== 'PENDING')
        || approvals?.find(a => a.ApprovalRoleCode === 'BGD');


    // Total Cost
    const totalCostAmount = costLines?.reduce((sum, line) => sum + (Number(line.Amount) || 0), 0) || 0;

    // Check if report has cost (either from header flag, presence of cost lines, or total amount > 0)
    const hasActualCost =
        report.HasCost == 1 ||
        report.HasCost === true ||
        String(report.HasCost).toLowerCase() === 'true' ||
        (costLines && costLines.length > 0) ||
        Number(totalCostAmount) > 0 ||
        Number(report.EstimatedTotalCost) > 0;

    return (
        <div ref={ref} style={styles.container}>
            <style>
                {`
                @page {
                    size: A4 landscape;
                    margin: 10mm 15mm;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            <div style={styles.paper}>
                {/* --- HEADER --- */}
                <table style={styles.headerTable}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.headerCell, width: "15%" }}>
                                <img src="/logo.png" alt="Z76 Logo" style={{ height: "60px" }} />
                            </td>
                            <td style={{ ...styles.headerCell, width: "12%" }}>
                                <div style={styles.qrCode}>
                                    <QRCodeSVG value={window.location.href} size={60} />
                                </div>
                            </td>
                            <td style={{ ...styles.headerCell, width: "48%" }}>
                                <div style={styles.title}>BÁO CÁO PHÁT SINH TRONG SẢN XUẤT</div>
                                <div style={styles.reportNo}>{report.ReportNo}</div>
                            </td>
                            <td style={{ ...styles.headerCell, width: "25%", textAlign: "left", paddingLeft: "10px" }}>
                                <div style={{ fontSize: "10pt" }}>Mã số: BM.01- HD.01-QT.11-VT</div>
                                <div style={{ fontSize: "10pt" }}>Ngày hiệu lực: 23/12/2024</div>
                                <div style={{ fontSize: "10pt" }}>Phiên bản: 00</div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* --- INFO --- */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ fontSize: "12pt" }}>
                        <b>Số:</b> {report.ReportNo?.split('-').pop() || '...'} /XLKPH-NXNT
                    </div>
                    <div style={{ fontSize: "12pt" }}>
                        Hà Nội, {formatPrintDate(report.CreatedAt)}
                    </div>
                </div>

                {/* --- SECTION I --- */}
                <div style={styles.sectionTitle}>I. Nội dung báo cáo</div>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>TT</th>
                            <th style={styles.th}>Bộ phận</th>
                            <th style={styles.th}>Mã đơn hàng</th>
                            <th style={styles.th}>Item</th>
                            <th style={styles.th}>Tên sản phẩm</th>
                            <th style={styles.th}>Nội dung</th>
                            <th style={styles.th}>Số lượng KH</th>
                            <th style={styles.th}>Nguyên nhân</th>
                            <th style={styles.th}>Giải pháp</th>
                            <th style={styles.th}>Hành động</th>
                            <th style={styles.th}>Thời gian HT</th>
                            <th style={styles.th}>Trách nhiệm</th>
                            <th style={styles.th}>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={styles.tdCenter}>1</td>
                            <td style={styles.td}>{report.Ma_NhaThau ?? report.OccurredDeptName_NT ?? report.OccurredDepartmentName ?? '...'}</td>
                            <td style={styles.td}>{plans.map((plan) => plan.OrderCode).filter(Boolean).join(", ") || '...'}</td>
                            <td style={styles.tdCenter}>{plans.map((plan) => plan.ProductCode).filter(Boolean).join(", ") || '...'}</td>
                            <td style={styles.td}>{plans.map((plan) => plan.ProductName).filter(Boolean).join(", ") || '...'}</td>
                            <td style={styles.td}>{report.DetailedDescription || '...'}</td>
                            <td style={styles.tdCenter}>{plans.map((plan) => plan.PlanQty).filter((value) => value !== null && value !== undefined).join(", ") || '...'}</td>
                            <td style={styles.td}>{report.ExceptionCauseName || '...'}</td>
                            <td style={styles.td}>{report.ProposedSolution || '...'}</td>
                            <td style={styles.td}>{report.InterimAction || '...'}</td>
                            <td style={styles.tdCenter}>{report.DueDate ? new Date(report.DueDate).toLocaleDateString('vi-VN') : '...'}</td>
                            <td style={styles.td}>{report.MainResponsibleEmpName || '...'}</td>
                            <td style={styles.td}>{report.ClosureNote || ''}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={styles.sectionTitle}>Danh sách kế hoạch ERP liên quan</div>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>TT</th>
                            <th style={styles.th}>Mã kế hoạch</th>
                            <th style={styles.th}>Đơn hàng</th>
                            <th style={styles.th}>Sản phẩm</th>
                            <th style={styles.th}>ItemCode</th>
                            <th style={styles.th}>Công đoạn</th>
                            <th style={styles.th}>Bộ phận</th>
                            <th style={styles.th}>Ngày KH</th>
                            <th style={styles.th}>Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.length > 0 ? plans.map((plan, idx) => (
                            <tr key={plan.PlanSelectKey || idx}>
                                <td style={styles.tdCenter}>{idx + 1}</td>
                                <td style={styles.td}>{plan.PlanNo || plan.PlanID || '...'}</td>
                                <td style={styles.td}>{plan.OrderCode || '...'}</td>
                                <td style={styles.td}>{plan.ProductName || '...'}</td>
                                <td style={styles.td}>{plan.ProductCode || '...'}</td>
                                <td style={styles.td}>{plan.OperationName || plan.OperationCode || '...'}</td>
                                <td style={styles.td}>{plan.DepartmentName || '...'}</td>
                                <td style={styles.tdCenter}>{plan.PlanDate ? new Date(plan.PlanDate).toLocaleDateString('vi-VN') : '...'}</td>
                                <td style={styles.tdCenter}>{plan.PlanQty ?? '...'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={9} style={{ ...styles.tdCenter, fontStyle: "italic", color: "#666" }}>
                                    Không gắn kế hoạch ERP
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* --- SECTION II --- */}
                <div style={styles.sectionTitle}>II. Nội dung xác nhận</div>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ ...styles.th, width: "5%" }}>TT</th>
                            <th style={{ ...styles.th, width: "20%" }}>Bộ phận</th>
                            <th style={{ ...styles.th, width: "25%" }}>Người xác nhận</th>
                            <th style={{ ...styles.th, width: "35%" }}>Nội dung xác nhận</th>
                            <th style={{ ...styles.th, width: "15%" }}>Ngày xác nhận</th>
                        </tr>
                    </thead>
                    <tbody>
                        {responses && responses.length > 0 ? (
                            responses.map((resp, idx) => (
                                <tr key={idx}>
                                    <td style={styles.tdCenter}>{idx + 1}</td>
                                    <td style={styles.td}>{resp.DepartmentName}</td>
                                    <td style={styles.td}>{resp.ResponderEmpName}</td>
                                    <td style={styles.td}>{resp.ResponseContent}</td>
                                    <td style={styles.tdCenter}>{resp.ResponseAt ? new Date(resp.ResponseAt).toLocaleString('vi-VN') : ''}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} style={{ ...styles.tdCenter, fontStyle: "italic", color: "#666" }}>Chưa có nội dung xác nhận</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* --- SECTION III (Optional) --- */}
                {hasActualCost && (
                    <>
                        <div style={styles.sectionTitle}>III. Chi phí phát sinh</div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ ...styles.th, width: "5%" }}>TT</th>
                                    <th style={{ ...styles.th, width: "12%" }}>Loại chi phí</th>
                                    <th style={{ ...styles.th, width: "33%" }}>Nội dung chi tiết</th>
                                    <th style={{ ...styles.th, width: "10%" }}>Người tạo</th>
                                    <th style={{ ...styles.th, width: "8%" }}>Số lượng</th>
                                    <th style={{ ...styles.th, width: "14%" }}>Đơn giá</th>
                                    <th style={{ ...styles.th, width: "18%" }}>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {costLines && costLines.length > 0 ? (
                                    <>
                                        {costLines.map((line, idx) => (
                                            <tr key={idx}>
                                                <td style={styles.tdCenter}>{idx + 1}</td>
                                                <td style={styles.td}>{line.CostTypeName}</td>
                                                <td style={styles.td}>{line.CostItemDesc}</td>
                                                <td style={styles.td}>{line.CreatedByEmpName || line.CreatedByEmpCode || "--"}</td>
                                                <td style={styles.tdCenter}>{line.Qty || "--"}</td>
                                                <td style={styles.tdRight}>{line.UnitCost ? formatCurrency(line.UnitCost) : "--"}</td>
                                                <td style={styles.tdRight}>{formatCurrency(line.Amount)}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={6} style={{ ...styles.tdRight, fontWeight: "bold", backgroundColor: "#f9f9f9" }}>Tổng cộng:</td>
                                            <td style={{ ...styles.tdRight, fontWeight: "bold", backgroundColor: "#f9f9f9" }}>{formatCurrency(totalCostAmount)}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ ...styles.tdCenter, fontStyle: "italic", color: "#666" }}>Chưa có dữ liệu chi phí</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}

                {/* --- FOOTER / SIGNATURES --- */}
                <div style={{ marginTop: "30px", display: "flex" }}>
                    <div style={{ width: "25%", fontSize: "11pt" }}>
                        <b>Nơi nhận:</b><br />
                        - C2 (để chỉ đạo)<br />
                        - B3, B7, B8<br />
                        - Các A, CSSX, XN<br />
                        - Lưu B3.
                    </div>

                    <div style={{ flex: 1, display: "flex", justifyContent: "space-between" }}>
                        {/* Signature 1: Reporter */}
                        <div style={styles.signatureBox}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: "60px" }}>Người lập</div>
                            {report.StatusCode !== 'DRAFT' && <div style={styles.stamp}>Đã Ký</div>}
                            <div style={{ fontWeight: "bold" }}>{reporterName}</div>
                        </div>

                        {/* Signature 2: KHO Manager */}
                        <div style={styles.signatureBox}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: "60px" }}>Phụ trách kho vận</div>
                            {khoApprover?.DecisionCode === 'APPROVED' && <div style={styles.stamp}>Đã Ký</div>}
                            <div style={{ fontWeight: "bold" }}>{khoApprover?.ApproverEmpName || ''}</div>
                        </div>

                        {/* Signature 3: VT Manager (or VP in case of No Cost) */}
                        <div style={styles.signatureBox}>
                            <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: "60px" }}>
                                {hasActualCost ? "Trưởng phòng Vật tư" : "Phòng Vật tư"}
                            </div>
                            {vtApprover?.DecisionCode === 'APPROVED' && <div style={styles.stamp}>Đã Ký</div>}
                            <div style={{ fontWeight: "bold" }}>{vtApprover?.ApproverEmpName || ''}</div>
                        </div>

                        {/* Signature 4: BGD (Only if Has Cost) */}
                        {hasActualCost && (
                            <div style={styles.signatureBox}>
                                <div style={{ fontWeight: "bold", textTransform: "uppercase", marginBottom: "60px" }}>Ban Giám đốc</div>
                                {bgdApprover?.DecisionCode === 'APPROVED' && <div style={styles.stamp}>Đã Ký</div>}
                                <div style={{ fontWeight: "bold" }}>{bgdApprover?.ApproverEmpName || ''}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
