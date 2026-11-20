# 04. API (REST, JSON)

Base path: `/api/v1`. Auth: header `Authorization: Bearer <JWT>` (trừ endpoint công khai).
Lỗi: `{ "code": "...", "message": "...", "fieldErrors": { "field": "msg" } }` với HTTP 400/401/403/404/409.
Phân trang: `?page=0&size=20&sort=createdAt,desc` -> `{ items, total, page, size }`.
Cột "Quyền" là permission cần có (docs/05); dev luôn có.

## Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | /auth/login | `{username,password}` -> `{token, user:{id,fullName,role,distributorId,customerId,permissions[]}}` |
| GET | /auth/me | thông tin user hiện tại + permissions |
| POST | /auth/change-password | `{oldPassword,newPassword}` (>= 8 ký tự) |

## Admin (chỉ role dev)
| Method | Path | Mô tả |
|---|---|---|
| GET/POST | /admin/users | danh sách / tạo user |
| PUT | /admin/users/{id} | sửa (role, distributor, customer, agent customerIds) |
| PATCH | /admin/users/{id}/active | `{active:boolean}` |
| POST | /admin/users/{id}/reset-password | đặt mật khẩu tạm |
| GET | /admin/permissions | ma trận role × permission |
| PUT | /admin/permissions/{role} | `{permissions:[...]}` (không cho sửa role `dev`) |

## Danh mục — GET: quyền `catalog`; ghi: `catalog_edit`
`/catalog/distributors`, `/catalog/models`, `/catalog/parts`, `/catalog/faults`
mỗi loại: `GET` (list, `?q=`), `POST`, `PUT /{id}`, `PATCH /{id}/active`.

## Khách hàng — `crm_view` / `crm_edit`
| Method | Path | Mô tả |
|---|---|---|
| GET | /customers?q=&distributorId= | danh sách (áp dụng phạm vi: NPP chỉ thấy khách của mình) |
| GET | /customers/{id} | chi tiết + thiết bị + số ticket |
| POST / PUT | /customers, /customers/{id} | tạo / sửa |

## Thiết bị & bảo hành
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | /public/warranty/{sn} | công khai, rate limit | `{sn, model, inWarranty, warrantyEnd, daysLeft, extended}` — KHÔNG trả thông tin khách |
| GET | /devices/{sn} | ticket_create | đầy đủ thông tin thiết bị + khách, dùng khi tạo ticket |
| GET | /devices?q=&customerId= | crm_view | danh sách |
| POST/PUT | /devices, /devices/{sn} | crm_edit | |
| POST | /devices/import | catalog_edit | multipart CSV (cột: sn,model,customer_id,distributor_id,ship_date,start_date,warranty_years); trả `{inserted,updated,errors:[{row,msg}]}` |

## Ticket
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | /tickets | ticket_view | lọc: `status`, `type`, `q` (no/SN/khách), `mine`, `slaBreached`, `distributorId`, `from`, `to`; luôn áp phạm vi theo role |
| POST | /tickets | ticket_create | tạo. Trạng thái đầu: `draft` (staff/NPP) hoặc `unassigned` (enduser/agent) |
| GET | /tickets/{id} | ticket_view + trong phạm vi | chi tiết kèm products, parts, events, sla, `allowedActions[]` |
| PUT | /tickets/{id} | ticket_create/diagnose | sửa khi còn `draft`/`diagnosing`/`returned` |
| POST | /tickets/{id}/actions/{action} | theo bảng dưới | chuyển trạng thái, body tuỳ action |
| GET/POST | /tickets/{id}/messages | ticket_view / internal_chat nếu `internal=true` | chat |
| POST | /tickets/{id}/attachments | ticket_view (+ quyền sửa) | multipart `file`, `kind=image|log` |
| GET | /attachments/{id}/download | quyền xem ticket | stream file |
| DELETE | /attachments/{id} | người upload hoặc manager | |
| POST | /tickets/{id}/feedback | feedback | `{score:1-5, comment}`, chỉ khi `closed`, 1 lần |

`allowedActions[]` do **server** tính (trạng thái + quyền + phạm vi) — FE chỉ dùng để hiện/ẩn nút, không tự suy luận.

### Actions (`POST /tickets/{id}/actions/{action}`)
| action | Từ trạng thái | Sang | Quyền | Body |
|---|---|---|---|---|
| send-request | draft | unassigned | ticket_create | — |
| claim | unassigned | diagnosing | ticket_assign | — (assignee = người gọi; NPP chỉ claim ticket chưa gán) |
| assign | unassigned | diagnosing | ticket_assign | `{assigneeId}` |
| save-diagnosis | diagnosing, returned | (giữ) | ticket_diagnose | `{faultCode, serviceType, text, proposal, estParts[]}` |
| submit-diagnosis | diagnosing, returned | pending | ticket_diagnose | như trên, `text` bắt buộc |
| opinion | pending | (giữ) | ticket_opinion | `{recommendation: approve|reject|return, note}` (ghi vào events) |
| approve | pending | approved | ticket_approve | `{gspNo, maNo?, note?}` |
| reject | pending | rejected | ticket_approve | `{note}` bắt buộc |
| return | pending | returned | ticket_approve | `{note}` bắt buộc |
| start | approved | in_service | ticket_repair | — |
| hold | in_service | on_hold | ticket_hold | `{reason, note}` (`other` bắt buộc note) — mở `sla_pauses` |
| resume | on_hold | in_service | ticket_hold | — — đóng `sla_pauses` |
| save-repair | in_service | (giữ) | ticket_repair | `{parts:[{pn,qty}]}` -> `ticket_parts(kind=used)` |
| to-testing | in_service | testing | ticket_repair | như save-repair |
| test-fail | testing | in_service | ticket_repair | `{note}` |
| deliver | testing | delivered | ticket_repair | `{note?, carrier, tracking, date}` (test_result=pass) |
| close | delivered | closed | ticket_repair | — |
| cancel | draft, unassigned, diagnosing, pending, returned | cancelled | ticket_cancel | `{note}` bắt buộc |
| transfer | (không phải closed/cancelled/rejected) | (giữ) | ticket_transfer | `{distributorId, note}` **[XÁC NHẬN]** |

Sai trạng thái -> 409 `TICKET_INVALID_TRANSITION`; thiếu quyền/ngoài phạm vi -> 403; thiếu dữ liệu bắt buộc -> 400 kèm `fieldErrors`.

## Thông báo
| Method | Path | Mô tả |
|---|---|---|
| GET | /notifications?unread=true | của user hiện tại (trực tiếp + theo role + theo NPP + theo khách) |
| POST | /notifications/{id}/read | |
| POST | /notifications/read-all | |

## Dashboard — quyền `reports`
`GET /dashboard/summary?from=&to=` ->
`{ byStatus:{...}, slaBreached:n, openCount:n, createdLast30d:n, closedLast30d:n, avgProcessingHours:n, byDistributor:[{id,open,closed,breached}] }`
