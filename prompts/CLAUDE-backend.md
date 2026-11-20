# CLAUDE.md — sge-backend

Bạn đang xây backend cho hệ thống bảo hành SGE After-Sales. Đọc `docs/` trước khi code: 01 (phạm vi), 03 + `sql/` (DB), 04 (API), 05 (workflow & quyền).

## Stack
Java 21, Spring Boot 3.3+, Maven, Spring Web, Spring Security + JWT, Spring Data JPA, Validation, Flyway, PostgreSQL 16, Lombok (tuỳ chọn).
Package gốc: `com.sge.aftersales` (cấu trúc theo docs/02).

## Quy tắc BẮT BUỘC
1. Schema do Flyway quản lý (`src/main/resources/db/migration`). `spring.jpa.hibernate.ddl-auto=validate`. Không dùng `update/create`.
2. Không trả entity ra API; dùng DTO (record). Validate bằng Bean Validation.
3. **Phân quyền ở server**: quyền chức năng qua `PermissionService.has(user, perm)` (role `dev` luôn true); quyền dữ liệu qua `TicketVisibility`. Ticket ngoài phạm vi -> 404.
4. Trạng thái ticket chỉ đổi trong `TicketWorkflow` theo docs/05; mỗi lần đổi ghi `ticket_events`, cập nhật `updated_at`, tạo notification.
5. `allowedActions` do server tính và trả trong chi tiết ticket.
6. Lỗi trả `{code,message,fieldErrors}` qua `@RestControllerAdvice`.
7. Không hardcode secret/mật khẩu. Đọc từ env: `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FILE_STORAGE_DIR`, `CORS_ALLOWED_ORIGINS`, DB.
8. Upload: whitelist đuôi, giới hạn 20 MB, lưu tên UUID, tải qua API có kiểm tra quyền.
9. Không log mật khẩu/token. Thời gian dùng `Instant`.
10. Mỗi tính năng quan trọng có test: workflow (chuyển hợp lệ/không hợp lệ), phân quyền (403/404), SLA.

## Khi không chắc nghiệp vụ
Xem `reference/demo-src/` (`detail.js` hàm `A.wf`, `core.js`, `data.js`). Nếu vẫn mơ hồ hoặc gặp mục **[XÁC NHẬN]**, hỏi lại — đừng tự bịa quy tắc.

## Cách làm việc
Làm theo từng ngày trong docs/07. Cuối mỗi phần: chạy `./mvnw test`, liệt kê file đã sửa, nêu điểm chưa chắc.
