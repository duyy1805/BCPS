# QUY TRÌNH NGHIỆP VỤ CHI TIẾT HỆ THỐNG BCPS

Tài liệu này mô tả chi tiết các bước vận hành, đơn vị thực hiện và sự thay đổi trạng thái của một phiếu báo cáo phát sinh (BCPS).

---

## 1. LUỒNG A: PHÁT SINH THÔNG THƯỜNG (KHÔNG CHI PHÍ)
*Áp dụng cho các sự cố nhỏ, chỉ cần lấy ý kiến và Trưởng phòng phê duyệt để đóng phiếu.*

| Bước | Đơn vị thực hiện | Thao tác trên giao diện | Trạng thái hiển thị (Badge) | Ý nghĩa nghiệp vụ |
|:---:|:---|:---|:---|:---|
| **1** | **Người lập (Reporter)** | Nhấn "Tạo báo cáo", chọn kế hoạch ERP, nhập mô tả. Chọn BP chịu TN. **Không** tick "Có chi phí". Nhấn **Lưu Nháp**. | `Mới tạo (Nháp)` | Ghi nhận sự cố sơ bộ vào hệ thống. |
| **2** | **Người lập (Reporter)** | Kiểm tra lại thông tin và nhấn **Trình phản hồi**. | `Chờ [Tên BP] phản hồi` | Chuyển bóng sang các bộ phận liên quan để lấy ý kiến. |
| **3** | **BP Phối hợp (Dept)** | Vào mục phản hồi, nhập đánh giá nguyên nhân và giải pháp khắc phục. Nhấn **Lưu Phản Hồi**. | `Chờ trình duyệt` | Xác nhận trách nhiệm và phương án xử lý từ các bên. |
| **4** | **Người lập (Reporter)** | Sau khi thấy badge hiện "Chờ trình duyệt", nhấn nút **Trình phê duyệt**. | `Chờ TP. Vật tư duyệt` | Đưa phiếu lên cấp quản lý để chốt giải pháp. |
| **5** | **TP. Vật tư (Manager)** | Kiểm tra nội dung. Nhấn **Duyệt (Approve)**. | `Đã phê duyệt` | Lãnh đạo đồng ý với phương án xử lý. |
| **6** | **Người lập (Reporter)** | Thực hiện giải pháp ngoài thực tế, sau đó vào phiếu nhấn **Đóng báo cáo**. | `Đã đóng / Hoàn thành` | Kết thúc hoàn toàn vụ việc. |

---

## 2. LUỒNG B: PHÁT SINH NGHIỆM TRỌNG (CÓ CHI PHÍ & DUYỆT BGD)
*Áp dụng cho sự cố gây thiệt hại kinh tế, cần xác minh chi phí từ Kho/QLDH và BGD duyệt.*

| Bước | Đơn vị thực hiện | Thao tác trên giao diện | Trạng thái hiển thị (Badge) | Ý nghĩa nghiệp vụ |
|:---:|:---|:---|:---|:---|
| **1** | **Người lập (Reporter)** | Tạo phiếu, **Tick chọn "Có phát sinh chi phí"**. Chọn phối hợp với Kho & Quản lý đơn hàng. Nhấn **Trình phản hồi**. | `Chờ Kho & QLDH phản hồi` | Bắt đầu quy trình xác minh thiệt hại. |
| **2** | **Kho / QLDH / Phối hợp** | Nhấn **Ghi Phản Hồi**. Sau đó nhấn **Thêm chi phí** để nhập số lượng hàng hỏng, vật tư hao phí, đơn giá. | `Chờ trình duyệt` | Số hóa thiệt hại thành tiền (VNĐ). |
| **3** | **Người lập (Reporter)** | Nhấn **Trình phê duyệt**. | `Chờ TP. Vật tư duyệt` | Chuyển lên cấp quản lý kiểm tra con số chi phí. |
| **4** | **TP. Vật tư (Manager)** | Thấy chi phí/tính chất nghiêm trọng. Nhấn nút **Duyệt & Gửi BGD (Forward)**. | `Chờ Ban Giám đốc duyệt` | Vượt thẩm quyền phòng, cần sếp tổng quyết định. |
| **5** | **Ban Giám Đốc (BGD)** | Xem xét tổng thể thiệt hại và giải pháp. Nhấn **Duyệt cuối cùng**. | `Đã phê duyệt` | Phê duyệt ngân sách xử lý sai sót. |
| **6** | **Các bên liên quan** | Triển khai khắc phục. | `Đã phê duyệt` | (Đang thực hiện ngoài thực tế) |
| **7** | **Người lập / Quản lý** | Nhập kết quả xử lý cuối cùng và nhấn **Đóng báo cáo**. | `Đã đóng / Hoàn thành` | Lưu trữ hồ sơ làm bài học kinh nghiệm (Lesson Learned). |

---

## 3. CÁC TÌNH HUỐNG NGOẠI LỆ (EXCEPTION HANDLING)

### Tình huống 1: Thông tin sơ sài (Cấp trên trả về)
*   **Người thực hiện**: TP. Vật tư hoặc BGD.
*   **Thao tác**: Nhấn nút **Yêu cầu bổ sung (Supplement)**.
*   **Trạng thái**: Badge đổi thành `Chờ bổ sung thông tin`.
*   **Hành động**: Người lập (Reporter) phải vào "Chỉnh sửa" lại nội dung và "Trình phản hồi" lại từ đầu.

### Tình huống 2: Giải pháp không khả thi (Bị bác bỏ)
*   **Người thực hiện**: Cấp quản lý.
*   **Thao tác**: Nhấn nút **Từ chối (Reject)**.
*   **Trạng thái**: Badge đổi thành `Đã từ chối`.
*   **Hành động**: Phiếu kết thúc tại đây, người lập phải tạo phiếu mới với giải pháp khác.

---

## 4. BẢNG TỔNG HỢP TRÁCH NHIỆM

| Phòng ban / Vai trò | Lập phiếu | Phản hồi chuyên môn | Nhập chi phí | Phê duyệt | Đóng phiếu |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Nhân viên xưởng (Reporter)** | **Chính (R)** | **Hỗ trợ** | - | - | **Chính (R)** |
| **Bộ phận Kho / QLDH** | - | **Chính (R)** | **Chính (R)** | - | - |
| **Trưởng phòng Vật tư** | - | - | - | **Chính (A)** | **Giám sát** |
| **Ban Giám Đốc** | - | - | - | **Quyết định (A)** | - |

*(Ghi chú: R = Responsible - Người thực hiện; A = Accountable - Người chịu trách nhiệm phê duyệt)*
