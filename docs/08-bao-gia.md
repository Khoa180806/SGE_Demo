# 08. Khung báo giá (gửi công ty)

> Tài liệu này là KHUNG. Các ô `[...]` bạn tự điền. Không có con số tiền nào được ấn định sẵn.

## 1. Cách định giá — chọn trước khi điền số
| Cách | Công thức | Khi nào dùng |
|---|---|---|
| A. Theo công thực làm | số ngày thực làm × đơn giá/ngày × (1 + dự phòng) | Công ty muốn minh bạch giờ công |
| B. **Trọn gói theo phạm vi (khuyến nghị)** | giá cố định cho MVP đã chốt (docs/01) | Công ty quan tâm kết quả, không quan tâm AI hay tay làm |
Khuyến nghị B: khách trả cho **kết quả và trách nhiệm** (chạy ổn định, bảo hành), không trả theo số giờ gõ code.
Nếu chọn B, giá nên tham chiếu mặt bằng thị trường cho cùng phạm vi, không chỉ chi phí thời gian của bạn.

Tham chiếu để tự định giá (ước lượng thô, cách làm truyền thống, chưa dùng AI): MVP ≈ **68 man-day** (+20% dự phòng ≈ 82).
Thời gian thực tế của bạn khi dùng AI ngắn hơn, nhưng nên giữ **đệm ≥ 30%** cho lỗi và yêu cầu thay đổi.

## 2. Phạm vi trong giá (MVP)
Xem chi tiết `docs/01-scope-prd.md`: đăng nhập & phân quyền 6 role; danh mục; khách hàng & thiết bị; tra cứu bảo hành SN;
ticket bảo hành đủ workflow + SLA; chat & đính kèm; thông báo trong app; dashboard cơ bản; tiếng Việt.
Bàn giao: source BE + FE (2 repo), script migration DB, Docker Compose, tài liệu cài đặt/sử dụng, 1 buổi hướng dẫn.

## 3. Bảng báo giá
| STT | Hạng mục | Mô tả | Thành tiền (VNĐ) |
|---|---|---|---|
| 1 | Phân tích & thiết kế | Chốt phạm vi, ERD, API | [   ] |
| 2 | Backend | Auth, phân quyền, ticket, workflow, file, thông báo | [   ] |
| 3 | Frontend | Các màn hình MVP | [   ] |
| 4 | Kiểm thử & nghiệm thu (UAT) | Test, sửa lỗi theo checklist | [   ] |
| 5 | Triển khai | Cài đặt server, Docker, backup | [   ] |
| 6 | Hướng dẫn & tài liệu | 1 buổi đào tạo, tài liệu | [   ] |
| | **Tổng (chưa VAT)** | | **[   ]** |
Chi phí hạ tầng (VPS/domain/SSL): [công ty trả riêng / đã gồm].

## 4. Lịch thanh toán đề xuất
| Đợt | Mốc | Tỷ lệ |
|---|---|---|
| 1 | Ký hợp đồng / chốt phạm vi | [30%] |
| 2 | Bàn giao bản chạy thử (demo trên server) | [40%] |
| 3 | Nghiệm thu UAT + bàn giao source | [30%] |

## 5. Giả định & điều kiện
- Phạm vi theo docs/01; thay đổi/bổ sung ngoài phạm vi báo giá bổ sung riêng.
- Công ty cung cấp: file danh sách SN bảo hành, danh mục model/linh kiện/mã lỗi, xác nhận các điểm **[XÁC NHẬN]** trong docs/01 mục 7 trong vòng [3] ngày làm việc.
- Công ty cung cấp server/tài khoản cloud (hoặc báo giá thuê riêng).
- Phản hồi UAT trong [3] ngày làm việc; tối đa [2] vòng chỉnh sửa nhỏ không tính phí.
- Thời gian giao: [ngày] kể từ khi chốt phạm vi và nhận đủ dữ liệu đầu vào.
- Bảo hành lỗi phát sinh do phần mềm: [30] ngày sau nghiệm thu, miễn phí; sau đó theo gói bảo trì.

## 6. Ngoài phạm vi — Phase 2 (báo giá riêng, ước lượng thô man-day truyền thống)
| Hạng mục | Man-day tham khảo |
|---|---|
| RMA (đổi trả linh kiện/máy) | ~12 |
| ERP: hợp đồng dịch vụ, đơn bán, mua hàng, kho, chi phí, bàn giao | ~30–40 |
| Tích hợp Google Sheets/Drive | ~5 |
| Tiếng Anh + dark mode | ~4 |
| Email thông báo, xuất Excel/PDF, báo cáo nâng cao | [   ] |

## 7. Gói bảo trì (tuỳ chọn)
[X VNĐ/tháng]: vá lỗi, theo dõi hệ thống, backup, hỗ trợ [Y] giờ/tháng.

## 8. Cảnh báo cho chính bạn trước khi gửi
- Không hứa ngày giao dựa trên tốc độ "lý tưởng" của AI; hứa theo lịch có đệm.
- Ghi rõ các điểm đang là giả định (docs/01 mục 7): phần nào công ty trả lời khác sẽ làm giá/lịch thay đổi.
- Bản demo hiện tại có thể thuộc sở hữu/ý tưởng của công ty: xác nhận quyền sở hữu mã nguồn và dữ liệu (danh sách SN) trong hợp đồng.
