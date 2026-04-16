# CẨM NANG KIỂM THỬ NGHIỆP VỤ BCPS (CHI TIẾT)

Tài liệu này hướng dẫn chi tiết từng bước thực hiện trên giao diện để kiểm tra tính đúng đắn của toàn bộ phần mềm BCPS.

---

## 0. CHUẨN BỊ (BẮT BUỘC)
Trước khi test, hãy đảm bảo:
1.  Đã chạy file SQL **`update_business_logic_v3.sql`** trong SSMS.
2.  Đã cấu hình đúng `API_URL` trong file `src/utils/api.js`.
3.  Sử dụng trình duyệt Chrome/Edge để có trải nghiệm tốt nhất.

---

## 1. VAI TRÒ: NGƯỜI LẬP (REPORTER) - BƯỚC KHỞI TẠO
**Mục tiêu**: Tạo thành công một phiếu báo cáo phát sinh từ dữ liệu ERP.

*   **Bước 1**: Đăng nhập với tài khoản có Role `REPORTER`.
*   **Bước 2**: Tại trang chủ, nhấn nút **[+ Tạo báo cáo]**.
*   **Bước 3 (Chọn kế hoạch)**:
    *   Gõ mã Lệnh sản xuất hoặc mã hàng vào ô tìm kiếm ERP.
    *   Chọn một dòng kế hoạch từ danh sách xổ xuống.
    *   *Kiểm tra*: Các thông tin "Sản phẩm", "Công đoạn", "Phòng ban phát sinh" phải tự động điền (Auto-fill).
*   **Bước 4 (Nhập thông tin)**:
    *   Chọn **Mức độ ảnh hưởng** (VD: Cao/Trung bình).
    *   Nhập **Mô tả ngắn** và **Mô tả chi tiết**.
    *   **Bộ phận chịu TN**: Gõ tìm kiếm và chọn bộ phận trực tiếp gây ra lỗi.
    *   **Cá nhân chịu TN**: Chọn nhân viên cụ thể trong bộ phận đó.
    *   **Phối hợp với**: Chọn thêm các bộ phận cần lấy ý kiến (VD: Kho, QC). *Lưu ý: Quản lý đơn hàng và Kho thường là bắt buộc.*
    *   **Chi phí**: Tick chọn "Có phát sinh chi phí" nếu bạn muốn test luồng duyệt nâng cao.
*   **Bước 5**: Nhấn **[Lưu Nháp]**.
    *   *Kỳ vọng*: Hệ thống chuyển về trang Chi tiết. Badge hiện **"Mới tạo (Nháp)"**.
*   **Bước 6**: Nhấn **[Trình Phản Hồi]**.
    *   *Kỳ vọng*: Badge đổi thành **"Chờ [Bộ phận] phản hồi"**.

---

## 2. VAI TRÒ: BỘ PHẬN PHỐI HỢP (DEPT_HANDLER)
**Mục tiêu**: Ghi nhận ý kiến đánh giá và nhập chi phí dự kiến.

*   **Bước 1**: Đăng nhập với tài khoản thuộc bộ phận đã được chọn phối hợp ở bước trước.
*   **Bước 2**: Tại danh sách, chọn phiếu có trạng thái "Chờ phản hồi".
*   **Bước 3**: Nhấn nút **[Ghi Phản Hồi]**.
    *   Nhập nội dung đánh giá nguyên nhân.
    *   Nhập đề xuất khắc phục.
    *   Nhấn **[Lưu Phản Hồi]**.
*   **Bước 4 (Nếu có chi phí)**: Nếu phiếu yêu cầu tính chi phí, nhấn nút **[+ Thêm chi phí]**.
    *   Chọn Loại chi phí, Bộ phận chịu phí.
    *   Nhập số lượng, đơn giá (Hệ thống tự nhân thành tiền).
    *   Nhấn **[Lưu]**.
*   **Kết quả**: Sau khi tất cả các bộ phận phối hợp đã phản hồi xong, badge sẽ đổi thành **"Chờ trình duyệt"**.

---

## 3. VAI TRÒ: NGƯỜI LẬP (REPORTER) - TRÌNH PHÊ DUYỆT
*   **Bước 1**: Reporter vào lại phiếu khi thấy trạng thái đã là "Chờ trình duyệt".
*   **Bước 2**: Nhấn nút **[Trình Phê Duyệt]**.
    *   *Kỳ vọng*: Badge đổi sang **"Chờ TP. Vật tư phê duyệt"**.

---

## 4. VAI TRÒ: LÃNH ĐẠO (VT_MANAGER / BGD)
**Mục tiêu**: Phê duyệt hoặc yêu cầu bổ sung thông tin.

*   **Bước 1**: Đăng nhập tài khoản TP. Vật tư (`VT_MANAGER`).
*   **Bước 2**: Tại phiếu đang chờ duyệt, bạn có 3 lựa chọn:
    1.  **Duyệt (Approve)**: Nếu chi phí thấp/không có chi phí và mọi thứ ổn. -> Phiếu kết thúc luồng duyệt, sang "Đã phê duyệt".
    2.  **Trả lại (Need Supplement)**: Nếu nội dung sơ sài. -> Phiếu quay về cho Reporter, badge hiện "Chờ bổ sung".
    3.  **Chuyển BGD (Forward)**: Nếu chi phí lớn hoặc cần ý kiến sếp. -> Badge đổi thành **"Chờ Ban Giám đốc phê duyệt"**.
*   **Bước 3 (Nếu chuyển BGD)**: Tài khoản `BGD` vào nhấn **[Duyệt cuối cùng]**.

---

## 5. BƯỚC CUỐI: ĐÓNG PHIẾU (CLOSURE)
*   Sau khi phiếu ở trạng thái **"Đã phê duyệt"**, người lập (Reporter) hoặc Quản lý vào xác nhận kết quả xử lý thực tế và nhấn nút **[Đóng báo cáo]**.
*   *Kết quả cuối cùng*: Trạng thái **"Đã đóng / Hoàn thành"**. Phiếu không thể thay đổi nội dung được nữa.

---

## KHÁC: KIỂM TRA LỊCH SỬ (AUDIT TRAIL)
Tại mỗi phiếu, hãy kéo xuống mục **"Lịch sử xử lý"** để kiểm tra:
- [ ] Có ghi lại đúng tên người thực hiện không?
- [ ] Thời gian thực hiện có chính xác không?
- [ ] Ghi chú (Note) có hiển thị đúng các thao tác không?
