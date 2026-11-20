# SGE After-Sales — Bộ tài liệu chuyển đổi sang Java Web App

Chuyển demo web (vanilla JS + localStorage) thành hệ thống **Backend (Spring Boot) + Frontend (React) + PostgreSQL**.
Phạm vi: **MVP trong 1 tuần** (vibe coding). Các hạng mục ngoài MVP nằm ở Phase 2.

## Cấu trúc thư mục
- `docs/`, `sql/` — nguồn duy nhất của đặc tả và migration (copy vào repo BE/FE khi vibe coding).
- `prompts/` — CLAUDE.md mẫu cho từng repo + prompt theo ngày.
- `reference/demo-src/` — source demo gốc để tham chiếu; `reference/demo-build/` — build demo ra file HTML.
- `docker-compose.yml`, `.env.example` — cho hệ thống đích (kỳ vọng `./sge-backend`, `./sge-frontend`).

## Cách dùng bộ tài liệu này khi vibe coding
1. Tạo 2 repo rỗng: `sge-backend`, `sge-frontend`.
2. Copy `prompts/CLAUDE-backend.md` -> `sge-backend/CLAUDE.md` (hoặc `AGENTS.md`), `prompts/CLAUDE-frontend.md` -> `sge-frontend/CLAUDE.md`.
3. Copy thư mục `docs/` và `sql/` vào CẢ HAI repo (AI cần đọc để hiểu nghiệp vụ).
4. Đi theo `docs/07-plan-7-ngay.md`, mỗi ngày dùng prompt tương ứng trong `prompts/day-by-day-prompts.md`.
5. `reference/demo-src/` là source demo gốc: dùng để AI tham chiếu **nghiệp vụ, câu chữ i18n, layout màn hình**.
   KHÔNG copy logic phân quyền/lưu trữ từ demo (chỉ chạy ở client).

## Mục lục
| File | Nội dung |
|---|---|
| docs/01-scope-prd.md | Mục tiêu, phạm vi MVP, role, user story, ngoài phạm vi |
| docs/02-architecture.md | Stack, cấu trúc 2 repo, quy ước code, bảo mật |
| docs/03-database.md | ERD (mermaid), mô tả bảng, quy tắc dữ liệu |
| docs/04-api-spec.md | Danh sách REST API |
| docs/05-workflow-permissions.md | State machine ticket, SLA, ma trận quyền |
| docs/06-frontend-spec.md | Route, màn hình, component |
| docs/07-plan-7-ngay.md | Kế hoạch 7 ngày + tiêu chí hoàn thành mỗi ngày |
| docs/08-bao-gia.md | Khung báo giá gửi công ty |
| sql/V1__init_schema.sql | Flyway migration tạo schema |
| sql/V2__seed_reference.sql | Seed nhà phân phối + quyền theo role |
| docker-compose.yml | PostgreSQL + BE + FE |

## Điểm CHƯA chắc (cần xác nhận với công ty)
Các chỗ đánh dấu **[XÁC NHẬN]** trong tài liệu là suy ra từ code demo, chưa phải yêu cầu đã chốt.
Tổng hợp ở cuối `docs/01-scope-prd.md`.
