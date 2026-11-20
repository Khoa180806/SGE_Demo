# reference/

Source demo gốc (vanilla JS), chỉ để THAM CHIẾU — không copy logic phân quyền/lưu trữ client sang hệ thống mới.

## Cấu trúc
- `demo-src/` — **source chuẩn** của demo After-Sales (21 file .js/.css). Đây là nơi DUY NHẤT chứa source; mọi tài liệu/prompt tham chiếu tới đây.
  - `data.js` — model dữ liệu, danh mục, nhóm quyền, quyền mặc định, sinh dữ liệu mẫu
  - `detail.js` — workflow ticket (hàm `A.wf`), form chẩn đoán/duyệt/test/giao hàng
  - `core.js` — quyền (`can`), phạm vi dữ liệu (`visibleTickets`), SLA (`procHours`, `slaBreached`)
  - `i18n.js`, `erp-i18n.js` — chuỗi giao diện vi/en
  - `tickets.js`, `home.js` — danh sách, dashboard
  - `styles.css` — màu/bố cục để bám theo
  - `erp*.js`, `integrations.js`, `storage.js` — thuộc Phase 2 (ERP, Google), chưa làm trong MVP
- `demo-build/` — công cụ build demo thành 1 file HTML: `assets/` (logo, bg, favicon), `build.py` (doc `../demo-src`, xuất `dist/`), `test.py` (playwright, cần `pip install playwright` + `playwright install chromium`).
- `SGE-desk-source/` — source demo KHÁC (bản "desk": `base.*`, `roles.*`), không liên quan After-Sales, giữ để tham khảo nếu cần.
- `index.html`, `SGE-AfterSales-Demo.html`, `index-backup-*.html` — bản demo đã build sẵn, mở trực tiếp bằng trình duyệt.
- `serve.ps1` + `Chay-localhost.bat` — chạy local server tĩnh cho thư mục này.
- `favicon.png`, `kho-bot.png` — asset lẻ.
