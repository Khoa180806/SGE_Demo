-- Dữ liệu tham chiếu. Admin đầu tiên được tạo bằng code từ biến môi trường ADMIN_USERNAME/ADMIN_PASSWORD.

INSERT INTO distributors(id, name, short_name) VALUES
  ('bke','BKE Việt Nam','BKE'),
  ('xb','XB Solar','XB'),
  ('jgp','JGP','JGP'),
  ('dat','DAT','DAT');

-- Quyền theo role (khớp demo; distributor là ĐỀ XUẤT — xem docs/05)
INSERT INTO role_permissions(role, permission) VALUES
 -- manager
 ('manager','ticket_view'),('manager','ticket_create'),('manager','ticket_transfer'),('manager','ticket_assign'),
 ('manager','ticket_diagnose'),('manager','ticket_approve'),('manager','ticket_repair'),('manager','ticket_hold'),
 ('manager','ticket_cancel'),('manager','internal_chat'),('manager','crm_view'),('manager','crm_edit'),
 ('manager','reports'),('manager','catalog'),('manager','catalog_edit'),
 -- engineer
 ('engineer','ticket_view'),('engineer','ticket_create'),('engineer','ticket_transfer'),('engineer','ticket_diagnose'),
 ('engineer','ticket_repair'),('engineer','ticket_opinion'),('engineer','ticket_hold'),('engineer','internal_chat'),
 ('engineer','crm_view'),('engineer','reports'),('engineer','catalog'),
 -- distributor (đề xuất)
 ('distributor','ticket_view'),('distributor','ticket_create'),('distributor','ticket_assign'),('distributor','ticket_diagnose'),
 ('distributor','ticket_repair'),('distributor','ticket_hold'),('distributor','ticket_cancel'),('distributor','internal_chat'),
 ('distributor','feedback'),('distributor','crm_view'),('distributor','catalog'),
 -- agent
 ('agent','ticket_view'),('agent','ticket_create'),('agent','ticket_cancel'),('agent','feedback'),
 -- enduser
 ('enduser','ticket_view'),('enduser','ticket_create'),('enduser','ticket_cancel'),('enduser','feedback');
-- role 'dev' không cần dòng: luôn có mọi quyền (xử lý trong PermissionService).

-- Model / linh kiện / mã lỗi: import từ reference/demo-src/data.js (MODELS, PARTS, FAULTS) bằng script hoặc CSV.
