# 01. Phạm vi sản phẩm (PRD rút gọn)

## 1. Mục tiêu
Số hoá quy trình tiếp nhận – duyệt – sửa chữa – giao trả bảo hành thiết bị inverter điện mặt trời,
thay cho bản demo chạy trên trình duyệt: dữ liệu lưu DB, xác thực và phân quyền thực sự ở server.

## 2. Vai trò (role)
| Role | Mô tả | Phạm vi dữ liệu |
|---|---|---|
| dev | Quản trị hệ thống | Toàn bộ, mọi quyền |
| manager | Quản lý SGE, duyệt ticket | Toàn bộ ticket |
| engineer | Kỹ sư SGE, góp ý kỹ thuật | Toàn bộ ticket |
| distributor | Nhân viên nhà phân phối (NPP) | Ticket của NPP mình + ticket `unassigned` |
| agent | Đại diện khách hàng | Ticket của các khách hàng được gán (`agent_customers`) |
| enduser | Khách hàng cuối | Ticket của khách hàng mình |

(`warehouse`, `accountant` thuộc ERP -> Phase 2, chưa tạo trong MVP.)

## 3. PHẠM VI MVP (làm trong 1 tuần)
1. **Xác thực**: đăng nhập JWT, đổi mật khẩu, quản lý user (dev).
2. **Phân quyền**: role + permission lưu DB, kiểm tra ở server; lọc dữ liệu theo role (row-level).
3. **Danh mục**: nhà phân phối, model, linh kiện, mã lỗi (CRUD cho quyền `catalog_edit`).
4. **Khách hàng & thiết bị**: CRUD khách hàng; thiết bị theo serial; **tra cứu bảo hành theo SN** (công khai, không cần đăng nhập); import danh sách SN từ CSV.
5. **Ticket bảo hành**: tạo, danh sách có lọc, chi tiết, toàn bộ workflow (docs/05), lịch sử sự kiện, SLA có tạm dừng.
6. **Trao đổi & đính kèm**: chat nội bộ / chat với khách, upload ảnh + file log (lưu ổ đĩa server), feedback sao sau khi đóng.
7. **Thông báo trong app** (polling 30s, không email).
8. **Dashboard**: số ticket theo trạng thái, ticket quá SLA, ticket mới/đã đóng 30 ngày, theo NPP.
9. Chỉ **tiếng Việt** (giữ cấu trúc key i18n để thêm English sau).

## 4. NGOÀI PHẠM VI (Phase 2, báo giá riêng)
- RMA (đổi trả linh kiện/máy)
- ERP: hợp đồng dịch vụ, đơn bán, mua hàng, kho, chi phí, bàn giao (role warehouse/accountant)
- Tích hợp Google Sheets / Drive (Apps Script)
- Tiếng Anh, dark mode
- Báo cáo nâng cao, xuất Excel/PDF
- Email/SMS thông báo, tạo ticket vô danh (guest) từ trang công khai
- Ứng dụng mobile, SSO

## 5. User story chính
- Là **NPP**, tôi tạo ticket cho thiết bị khách bằng cách nhập SN, hệ thống tự điền khách/model/hạn bảo hành.
- Là **NPP**, tôi nhập chẩn đoán + đề xuất (sửa/đổi linh kiện/đổi máy) rồi gửi duyệt.
- Là **manager**, tôi duyệt / từ chối / trả lại ticket; khi duyệt phải nhập mã GSP.
- Là **engineer**, tôi cho ý kiến kỹ thuật trên ticket chờ duyệt.
- Là **NPP**, sau duyệt tôi bắt đầu sửa, ghi linh kiện đã dùng, chuyển sang test, giao hàng, đóng ticket.
- Là **khách hàng**, tôi xem tiến độ ticket của mình, chat, đánh giá sao sau khi đóng.
- Là **bất kỳ ai**, tôi tra cứu SN để biết còn bảo hành đến ngày nào.
- Là **manager**, tôi xem dashboard ticket quá SLA.

## 6. Tiêu chí nghiệm thu MVP
- Đăng nhập 6 role, mỗi role chỉ thấy đúng dữ liệu và đúng nút (kiểm tra ở API: gọi sai quyền trả 403).
- Chạy hết 1 ticket từ `draft` đến `closed` qua đúng các bước, mọi bước ghi vào lịch sử.
- SLA: ticket `on_hold` không bị tính giờ; quá 7 ngày xử lý (không tính thời gian tạm dừng) hiện cảnh báo.
- Tra cứu SN công khai trả đúng hạn bảo hành.
- `docker compose up` chạy được toàn bộ hệ thống từ máy sạch.

## 7. [XÁC NHẬN] Các điểm cần hỏi công ty
1. Quyền của role `distributor` — demo không định nghĩa rõ (xem docs/05 mục 4, đang đề xuất).
2. Mã **GSP** và **MA** là mã của hệ thống nào? Định dạng chuẩn? (demo: GSP bắt buộc 6–20 ký tự `A-Z0-9-`, không trùng; MA tuỳ chọn 2–20 ký tự).
3. Luồng `returned` (trả lại): quay về NPP sửa chẩn đoán rồi gửi lại?
4. `transfer`: chuyển ticket sang NPP/trung tâm khác — ai được chuyển, có cần duyệt?
5. Danh sách SN bảo hành chính thức: nguồn (file Excel) và tần suất cập nhật.
6. Số lượng người dùng, nơi deploy (cloud/on-premise), yêu cầu backup.
7. SLA 7 ngày: áp dụng cho mọi loại dịch vụ (RW/OW/PR/OT)?
