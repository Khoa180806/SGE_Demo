# Prompt mẫu theo ngày (dán vào AI coding assistant)

Mẹo: luôn mở đúng repo (BE hoặc FE), đã có CLAUDE.md + docs/ + sql/. Làm xong prompt nào thì chạy thử và commit trước khi sang prompt tiếp.

## Ngày 1 — Nền móng + Auth
**BE:**
> Đọc CLAUDE.md và docs/02, 03, 04. Khởi tạo project Spring Boot (Maven, Java 21) theo cấu trúc package ở docs/02. Thêm Flyway và copy sql/V1, V2 vào db/migration. Cấu hình ddl-auto=validate. Tạo entity User, repository, JWT (HS256, secret từ env, hạn 8h), `POST /auth/login`, `GET /auth/me` (trả permissions theo role từ bảng role_permissions; role dev có tất cả). Khi khởi động, nếu chưa có user nào thì tạo admin (role dev) từ ADMIN_USERNAME/ADMIN_PASSWORD. Viết docker-compose.yml chạy postgres. Chạy thử và hướng dẫn tôi gọi login bằng curl.

**FE:**
> Đọc CLAUDE.md và docs/04, 06. Khởi tạo Vite + React + TS + Ant Design + React Router + TanStack Query + Axios. Làm trang Login, AuthContext (lưu token), axios interceptor, ProtectedRoute, hook usePermission, layout topbar có menu theo quyền (tạm để trống nội dung các trang). Gọi /auth/login và /auth/me.

## Ngày 2 — Phân quyền + Danh mục
**BE:**
> Làm PermissionService và `@PreAuthorize("@perm.has(authentication,'...')")`. Làm admin users (CRUD, active, reset password, agent customerIds) và admin permissions (đọc/ghi ma trận, không sửa role dev) theo docs/04. Làm CRUD 4 danh mục (distributors, models, parts, faults) với quyền catalog/catalog_edit. Viết script/endpoint import model, part, fault từ `reference/demo-src/data.js` (MODELS, PARTS, FAULTS). Test: user role enduser gọi /admin/users phải 403.

**FE:**
> Làm trang /admin/users, /admin/permissions (bảng checkbox nhóm theo PERM_GROUPS trong reference/demo-src/data.js), /catalog (tab 4 danh mục, thêm/sửa/ẩn). Chỉ hiện menu theo quyền.

## Ngày 3 — Khách hàng & Thiết bị
**BE:**
> Làm Customer, Device, WarrantyService (warranty_end = COALESCE(start_date, ship_date) + warranty_years), `GET /public/warranty/{sn}` công khai có rate limit (không trả thông tin khách), `GET /devices/{sn}`, CRUD customers/devices theo docs/04, `POST /devices/import` CSV. NPP chỉ thấy khách của NPP mình.

**FE:**
> Làm trang /lookup công khai (nhập SN -> trạng thái bảo hành), trang /customers và /customers/:id (kèm danh sách thiết bị), nút import CSV thiết bị.

## Ngày 4 — Ticket: tạo/xem
**BE:**
> Làm bảng/entity ticket + products/parts/events/messages/attachments theo sql/V1. Sinh mã ticket theo docs/02 bằng ticket_sequences (an toàn đồng thời). Làm TicketVisibility (docs/05 mục 5) dưới dạng Specification, áp dụng cho list/detail. Làm `GET /tickets` (lọc, phân trang), `POST /tickets`, `GET /tickets/{id}`, `PUT /tickets/{id}`. Chi tiết trả `allowedActions` (tạm trả rỗng, ngày 5 hoàn thiện). Test: NPP A không thấy ticket của NPP B (404).

**FE:**
> Làm /tickets (lọc, tìm, phân trang server), /tickets/new (nhập SN tự điền khách/model, hiện hạn bảo hành, gợi ý loại dịch vụ), /tickets/:id (chế độ chỉ đọc đầy đủ các section theo docs/06).

## Ngày 5 — Workflow + SLA + Thông báo
**BE:**
> Làm TicketWorkflow đủ các action ở docs/04 + docs/05 (sơ đồ trạng thái, quy tắc bắt buộc, kiểm tra GSP định dạng/không trùng). Mỗi action ghi ticket_events, cập nhật updated_at, tạo notification theo bảng docs/05 mục 7. Làm SlaCalculator + sla_pauses (hold/resume). Hoàn thiện allowedActions = trạng thái hợp lệ ∩ quyền ∩ phạm vi. Làm API notifications. Viết test: mỗi chuyển hợp lệ, chuyển sai trạng thái -> 409, thiếu quyền -> 403, SLA không tính thời gian tạm dừng.

**FE:**
> Trong trang chi tiết ticket, render nút hành động từ allowedActions, các Modal (duyệt: GSP/MA/ghi chú; từ chối/trả lại/huỷ: lý do; tạm dừng: lý do SLA; giao hàng: hãng/mã vận đơn/ngày), form chẩn đoán & linh kiện, TicketTimeline, SlaBadge, chuông thông báo (polling 30s).

## Ngày 6 — Đính kèm, Chat, Dashboard
**BE:**
> Làm upload/download attachment theo quy tắc bảo mật CLAUDE.md (whitelist, 20 MB, UUID, kiểm tra quyền xem ticket khi tải). Làm messages (internal chỉ staff/NPP thấy), feedback (chỉ khi closed, 1 lần), `GET /dashboard/summary` theo docs/04.

**FE:**
> Làm upload (kéo thả ảnh/log), tab chat Khách/Nội bộ, đánh giá sao, trang Dashboard với thẻ KPI + biểu đồ cột theo trạng thái + bảng "việc cần tôi xử lý" theo role.

## Ngày 7 — Kiểm thử, đóng gói
**BE:**
> Rà soát bảo mật theo checklist docs/07. Bổ sung test còn thiếu cho phân quyền. Viết Dockerfile multi-stage, `.env.example`, README cài đặt. Tạo seed dữ liệu demo (vài NPP, khách, thiết bị, user mỗi role, vài ticket ở các trạng thái) chỉ chạy khi profile=demo.

**FE:**
> Rà loading/empty/error mọi trang, sửa lỗi TypeScript, viết Dockerfile (build + nginx, proxy /api tới BE) và nginx.conf. Kiểm tra từng role xem đúng menu/nút. Cập nhật docker-compose.yml chạy cả 3 dịch vụ.

## Prompt kiểm tra chéo (dùng bất kỳ lúc nào)
> Hãy đóng vai reviewer bảo mật. Liệt kê mọi endpoint chưa kiểm tra quyền hoặc phạm vi dữ liệu, mọi chỗ tin dữ liệu từ client, và mọi chỗ có thể lộ thông tin khách hàng. Chỉ ra file và dòng.
