# 07. Kế hoạch 1 tuần (vibe coding)

Nguyên tắc: mỗi ngày kết thúc bằng thứ **chạy được và commit**. Đừng sang ngày sau khi ngày trước còn lỗi chặn.
Mỗi ngày: (1) đưa prompt cho AI, (2) chạy thử bằng tay, (3) tự đọc diff phần quyền/bảo mật, (4) commit.

| Ngày | BE | FE | Xong khi |
|---|---|---|---|
| **1** Nền móng + Auth | Khởi tạo Spring Boot, Docker Compose + Postgres, Flyway V1/V2, entity User, JWT login, `/auth/me`, tạo admin từ env | Khởi tạo Vite + AntD, layout, trang Login, AuthContext, ProtectedRoute | Đăng nhập được, F5 vẫn giữ phiên |
| **2** Phân quyền + Danh mục | PermissionService, `@PreAuthorize`, admin users/permissions, CRUD 4 danh mục, import model/part/fault từ demo | Trang Admin users, ma trận quyền, trang Danh mục | 6 role đăng nhập, API sai quyền trả 403 |
| **3** Khách hàng & Thiết bị | Customer, Device, `WarrantyService`, public warranty, import SN CSV, `GET /devices/{sn}` | Trang Khách hàng, Tra cứu SN (công khai), nút import | Tra cứu SN đúng hạn bảo hành |
| **4** Ticket: tạo/xem | Ticket + entity con, `ticket_sequences`, `TicketVisibility`, list/detail/create/update, `allowedActions` | Danh sách, Tạo ticket (auto-fill theo SN), Chi tiết (read) | NPP A không thấy ticket NPP B (404) |
| **5** Workflow + SLA + Thông báo | `TicketWorkflow` đủ các action, events, `SlaCalculator`, sla_pauses, notifications | Nút hành động + các Modal, Timeline, SlaBadge, chuông thông báo | Chạy 1 ticket `draft -> closed` qua đủ vai |
| **6** Đính kèm, Chat, Dashboard | Upload/download có kiểm tra quyền, messages (internal), feedback, `/dashboard/summary` | Upload, tab chat, đánh giá sao, Dashboard | Khách không thấy chat nội bộ |
| **7** Kiểm thử, đóng gói, bàn giao | Test workflow + quyền (Testcontainers), rà bảo mật, Dockerfile, README, seed dữ liệu demo | Sửa lỗi UI, Dockerfile + nginx, rà quyền hiển thị | `docker compose up` từ máy sạch chạy được toàn bộ; checklist nghiệm thu pass |

## Checklist bảo mật cuối ngày 7 (tự rà, không giao hoàn toàn cho AI)
- [ ] Mọi endpoint (trừ login, public warranty) yêu cầu JWT.
- [ ] Gọi API ticket bằng token role thấp để thử vượt quyền -> 403/404.
- [ ] Không còn mật khẩu/secret hardcode; `.env` không commit; có `.env.example`.
- [ ] Upload: sai đuôi/quá 20 MB bị từ chối; tải file qua API có kiểm tra quyền.
- [ ] Public warranty không lộ thông tin khách; có rate limit.
- [ ] Log không chứa token/mật khẩu.

## Rủi ro lịch & cách xử lý
- **Ngày 5 là điểm nghẽn** (workflow). Nếu trễ, cắt `transfer` và `opinion` trước, KHÔNG cắt kiểm tra quyền.
- Nếu hết thời gian: bỏ Dashboard biểu đồ (giữ thẻ số), bỏ import CSV (nhập tay vài SN).
- Giữ một danh sách "nợ kỹ thuật" thay vì sửa tràn lan; đưa vào Phase 2 / bảo trì.
- Một tuần là **sát** cho cả BE+FE+test+deploy: nếu AI sinh code lỗi nhiều, thêm 2–3 ngày đệm trước khi hứa ngày giao cho công ty.
