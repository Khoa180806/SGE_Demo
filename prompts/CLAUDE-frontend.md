# CLAUDE.md — sge-frontend

Bạn đang xây frontend cho hệ thống bảo hành SGE After-Sales. Đọc `docs/` trước: 01, 04 (API), 05 (workflow & quyền), 06 (màn hình).

## Stack
React 18, Vite, TypeScript (strict), React Router, TanStack Query, Axios, Ant Design 5.

## Quy tắc BẮT BUỘC
1. Gọi API qua `src/api/*.ts`; dữ liệu server qua TanStack Query; sau mutation `invalidateQueries`.
2. Hiện/ẩn nút hành động ticket **chỉ dựa vào `allowedActions` từ API**. Không tự suy luận quyền ở FE. Ẩn UI không phải bảo mật.
3. Quyền menu/route dùng `usePermission(perm)` từ `/auth/me`.
4. Chuỗi hiển thị lấy từ `src/i18n/vi.ts` (tham chiếu key trong `reference/demo-src/i18n.js`). Không hardcode tiếng Việt rải rác.
5. Không dùng `dangerouslySetInnerHTML`. Không lưu dữ liệu nhạy cảm ngoài token.
6. Axios interceptor: gắn Bearer token; 401 -> /login; 403 -> thông báo không có quyền.
7. Thời gian từ API là ISO UTC; hiển thị `dd/MM/yyyy HH:mm` giờ Việt Nam.
8. Kiểu TypeScript (`src/types`) khớp DTO ở docs/04.

## Cách làm việc
Làm theo docs/07. Mỗi màn hình: loading/empty/error state đầy đủ. Cuối mỗi phần: `npm run build` phải sạch lỗi TypeScript.
