# 02. Kiến trúc & quy ước

## 1. Stack
| Phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.3+, Spring Web, Spring Security (JWT), Spring Data JPA, Validation, Flyway |
| Database | PostgreSQL 16 |
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios, Ant Design 5 |
| Build/Deploy | Maven, npm, Docker Compose (db + be + fe/nginx) |
| Test | JUnit 5 + Testcontainers (BE, chỉ test workflow & quyền), Vitest (FE, tuỳ chọn) |

## 2. Hai repo
```
sge-backend/
  src/main/java/com/sge/aftersales/
    common/        # ApiError, GlobalExceptionHandler, PageResponse, Clock
    config/        # SecurityConfig, CorsConfig, JwtProperties, StorageProperties
    auth/          # AuthController, JwtService, UserDetails
    user/          # User, UserController, UserService
    permission/    # RolePermission, PermissionService (can(user, perm))
    catalog/       # Distributor, DeviceModel, Part, FaultCode
    customer/      # Customer, AgentCustomer
    device/        # Device, WarrantyService, SnImportService, PublicWarrantyController
    ticket/        # Ticket + entity con, TicketController, TicketService,
                   # TicketWorkflow (state machine), TicketVisibility, SlaCalculator
    attachment/    # Attachment, FileStorageService
    notification/  # Notification, NotificationService
    dashboard/     # DashboardController
  src/main/resources/db/migration/   # V1__..., V2__... (từ thư mục sql/)
  src/main/resources/application.yml
  Dockerfile, pom.xml, CLAUDE.md

sge-frontend/
  src/
    api/           # axios instance, hàm gọi API theo module
    auth/          # AuthContext, ProtectedRoute, usePermission()
    components/    # StatusTag, SlaBadge, TicketTimeline, AttachmentList...
    pages/         # Login, Dashboard, TicketList, TicketDetail, TicketCreate,
                   # WarrantyLookup, Customers, Catalog, AdminUsers, AdminPermissions
    i18n/          # vi.ts (key -> chuỗi), lấy từ reference/demo-src/i18n.js
    types/         # DTO TypeScript khớp API
  Dockerfile, nginx.conf, vite.config.ts, CLAUDE.md
```

## 3. Quy ước backend
- Kiến trúc 3 lớp: Controller (mỏng) -> Service (logic, `@Transactional`) -> Repository.
- DTO riêng cho request/response, KHÔNG trả entity ra ngoài. Dùng record cho DTO.
- **Mọi kiểm tra quyền ở Service/Controller**, không tin dữ liệu từ client:
  - Quyền chức năng: `@PreAuthorize("@perm.has(authentication, 'ticket_approve')")`.
  - Quyền dữ liệu: `TicketVisibility` tạo `Specification<Ticket>` theo role (docs/05 mục 5).
- Chuyển trạng thái ticket CHỈ qua `TicketWorkflow.apply(ticket, action, actor, payload)`:
  kiểm tra trạng thái hợp lệ + quyền + dữ liệu bắt buộc, ghi `ticket_events`, tạo notification.
- Thời gian dùng `Instant` (UTC) trong DB/API, FE hiển thị giờ Việt Nam (Asia/Ho_Chi_Minh).
- Lỗi trả JSON thống nhất: `{ "code": "TICKET_INVALID_TRANSITION", "message": "...", "fieldErrors": {...} }`.
- Phân trang: `page`, `size` (mặc định 20, tối đa 100), trả `{items,total,page,size}`.
- Mã ticket: `{loại}{yy}{MM}{dd}{seq 4 số}` ví dụ `RW2611200001` — **[XÁC NHẬN] định dạng với công ty**; seq theo ngày, sinh bằng bảng `ticket_sequences` (khoá hàng để tránh trùng).

## 4. Bảo mật (bắt buộc, vì đây là điểm demo gốc yếu)
- Mật khẩu: BCrypt. Không có mật khẩu mặc định trong code; admin đầu tiên tạo khi khởi động từ biến môi trường `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
- JWT: HS256, secret từ env `JWT_SECRET` (>= 32 ký tự), hạn 8 giờ. Lưu ở memory/localStorage phía FE (MVP chấp nhận), có đường thoát: chuyển HttpOnly cookie ở Phase 2.
- CORS chỉ cho origin FE cấu hình qua env.
- Upload: giới hạn 20 MB/file, whitelist đuôi `.jpg .jpeg .png .zip .log .csv .txt`, đổi tên file thành UUID khi lưu, không bao giờ dùng tên gốc làm đường dẫn; tải về phải qua API có kiểm tra quyền xem ticket.
- Endpoint công khai duy nhất: `POST /auth/login`, `GET /public/warranty/{sn}` (có rate limit ~30 req/phút/IP, chỉ trả thông tin bảo hành, KHÔNG trả thông tin khách hàng).
- Chống XSS phía FE: React tự escape; cấm `dangerouslySetInnerHTML`.
- Log: không ghi mật khẩu/token.

## 5. Cấu hình môi trường (.env)
```
POSTGRES_DB=sge
POSTGRES_USER=sge
POSTGRES_PASSWORD=<đặt>
JWT_SECRET=<>=32 ký tự ngẫu nhiên>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<đặt>
FILE_STORAGE_DIR=/data/uploads
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## 6. Backup & vận hành (đưa vào báo giá)
- `pg_dump` hằng ngày + volume `uploads` sao lưu cùng lúc.
- Healthcheck: `/actuator/health`.
