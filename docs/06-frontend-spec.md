# 06. Đặc tả Frontend

Tham chiếu giao diện/câu chữ: `reference/demo-src/` (`home.js`, `tickets.js`, `detail.js`, `core.js`, `i18n.js`, `styles.css`).
Mục tiêu: giữ bố cục quen thuộc của demo (topbar + tab, bảng danh sách, trang chi tiết có các section), nhưng dùng component Ant Design.

## 1. Route
| Route | Trang | Truy cập |
|---|---|---|
| /login | Đăng nhập | công khai |
| /lookup | Tra cứu bảo hành theo SN | công khai |
| / | Dashboard (Home) | đã đăng nhập |
| /tickets | Danh sách ticket | ticket_view |
| /tickets/new | Tạo ticket | ticket_create |
| /tickets/:id | Chi tiết ticket | ticket_view |
| /customers, /customers/:id | Khách hàng | crm_view |
| /catalog | Danh mục (tab: NPP, model, linh kiện, mã lỗi) | catalog |
| /admin/users | Quản lý user | role dev |
| /admin/permissions | Ma trận phân quyền | role dev |
| /profile | Đổi mật khẩu | đã đăng nhập |

`ProtectedRoute` kiểm tra đăng nhập + permission; hook `usePermission('ticket_approve')`. Ẩn menu/nút theo quyền chỉ là tiện ích UI — bảo mật thật nằm ở BE.

## 2. Layout
Topbar: logo, menu theo quyền, chuông thông báo (badge số chưa đọc, polling 30s), menu user (đổi mật khẩu, đăng xuất).
Nội dung dùng tab-per-ticket như demo là **không bắt buộc** trong MVP (dùng route thường).

## 3. Màn hình chính

### Dashboard (/)
Thẻ KPI (theo quyền): Chờ duyệt, Đang sửa, Quá SLA, Tạo mới 30 ngày, Đóng 30 ngày; bảng "Ticket cần tôi xử lý"
(theo role: manager -> `pending`; NPP -> `approved`/`returned`/`unassigned`; ...); biểu đồ cột theo trạng thái (Ant Design Charts hoặc Recharts).

### Danh sách ticket (/tickets)
Bộ lọc nhanh theo trạng thái (tab/chip), tìm theo mã/SN/khách, lọc loại dịch vụ, NPP, quá SLA.
Cột: Mã, Loại, Trạng thái (`StatusTag`), Khách/Dự án, Model/SN, NPP, Người xử lý, Ngày tạo, SLA (`SlaBadge`).
Phân trang phía server.

### Tạo ticket (/tickets/new)
1. Ô nhập SN -> gọi `GET /devices/{sn}` -> tự điền khách, model, dự án, tỉnh, hiển thị hạn bảo hành (còn/hết hạn) và gợi ý loại dịch vụ (RW nếu còn bảo hành, ngược lại OW).
2. Mã lỗi (select), thời điểm lỗi, mô tả, SĐT liên hệ, mã ticket khách (tuỳ chọn).
3. Upload ảnh/log (kéo thả).
4. Nút: "Lưu nháp" (`draft`) / "Gửi" (với enduser tạo luôn `unassigned`).

### Chi tiết ticket (/tickets/:id)
Header: mã, trạng thái, loại, SLA, nút hành động (**chỉ render theo `allowedActions` từ API**).
Các section: Thông tin khách & thiết bị · Mô tả lỗi · Chẩn đoán & đề xuất (form khi được phép) · Linh kiện (ước tính/đã dùng) ·
Duyệt (kết quả, GSP/MA) · Test & giao hàng · Đính kèm · Trao đổi (tab Khách / Nội bộ) · Timeline lịch sử (`TicketTimeline`) · Đánh giá sao.
Hành động cần nhập liệu mở **Modal**: duyệt (GSP, MA, ghi chú), từ chối/trả lại/huỷ (lý do bắt buộc), tạm dừng (lý do SLA), giao hàng (hãng vận chuyển, mã vận đơn, ngày).

### Tra cứu bảo hành (/lookup)
Ô nhập SN -> hiển thị model, trạng thái còn/hết bảo hành, ngày hết hạn, số ngày còn lại. Không hiện thông tin khách.

### Khách hàng, Danh mục, Admin
Bảng + modal thêm/sửa chuẩn CRUD. Danh mục thiết bị có nút "Import CSV" (SN).
Ma trận phân quyền: bảng role × permission với checkbox, nhóm theo `PERM_GROUPS` (xem `data.js`).

## 4. Trạng thái & màu (StatusTag)
draft xám · unassigned cam · diagnosing xanh dương nhạt · pending vàng · returned đỏ nhạt · approved xanh lá nhạt ·
in_service xanh dương · on_hold tím · testing xanh ngọc · delivered xanh lá · closed xám đậm · rejected đỏ · cancelled xám gạch.

## 5. Quy ước code FE
- Gọi API qua `src/api/*.ts` + hook TanStack Query (`useTickets`, `useTicket(id)`, mutation tự `invalidateQueries`).
- Axios interceptor: gắn token; 401 -> về /login; 403 -> thông báo "Không có quyền".
- Chuỗi hiển thị lấy từ `src/i18n/vi.ts` (key theo demo: `t('toast_saved')`...), không hardcode.
- Định dạng ngày `dd/MM/yyyy HH:mm`, tiền không dùng trong MVP.
- Responsive tối thiểu cho tablet; không bắt buộc mobile.
