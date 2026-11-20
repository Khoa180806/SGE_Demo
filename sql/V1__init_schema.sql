-- SGE After-Sales: schema khởi tạo (PostgreSQL 16) — dùng với Flyway
-- Thời gian dùng timestamptz (UTC).

CREATE TABLE distributors (
  id          VARCHAR(20) PRIMARY KEY,           -- bke, xb, jgp, dat
  name        VARCHAR(200) NOT NULL,
  short_name  VARCHAR(50)  NOT NULL,
  city        VARCHAR(100),
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customers (
  id              BIGSERIAL PRIMARY KEY,
  company         VARCHAR(200) NOT NULL,
  contact         VARCHAR(150),
  phone           VARCHAR(30),
  email           VARCHAR(200),
  province        VARCHAR(100),
  address         VARCHAR(300),
  distributor_id  VARCHAR(20) REFERENCES distributors(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id              BIGSERIAL PRIMARY KEY,
  username        VARCHAR(80)  NOT NULL UNIQUE,
  password_hash   VARCHAR(100) NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  title           VARCHAR(100),
  email           VARCHAR(200),
  role            VARCHAR(20)  NOT NULL
                  CHECK (role IN ('dev','manager','engineer','distributor','agent','enduser')),
  distributor_id  VARCHAR(20) REFERENCES distributors(id),   -- bắt buộc nếu role = distributor
  customer_id     BIGINT REFERENCES customers(id),           -- bắt buộc nếu role = enduser
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role <> 'distributor' OR distributor_id IS NOT NULL),
  CHECK (role <> 'enduser' OR customer_id IS NOT NULL)
);

CREATE TABLE agent_customers (
  user_id      BIGINT NOT NULL REFERENCES users(id),
  customer_id  BIGINT NOT NULL REFERENCES customers(id),
  PRIMARY KEY (user_id, customer_id)
);

CREATE TABLE role_permissions (
  role        VARCHAR(20) NOT NULL,
  permission  VARCHAR(50) NOT NULL,
  PRIMARY KEY (role, permission)
);

CREATE TABLE device_models (
  id      VARCHAR(50) PRIMARY KEY,               -- ví dụ SG5K-D
  name    VARCHAR(200),
  active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE parts (
  pn      VARCHAR(50) PRIMARY KEY,               -- part number
  name_vi VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE fault_codes (
  code     VARCHAR(20) PRIMARY KEY,
  name_vi  VARCHAR(300) NOT NULL,
  name_en  VARCHAR(300),
  active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE devices (
  sn              VARCHAR(40) PRIMARY KEY,       -- lưu UPPERCASE, trim
  model_id        VARCHAR(50) REFERENCES device_models(id),
  product_code    VARCHAR(40),                   -- mã sản phẩm (PN) nếu có
  customer_id     BIGINT REFERENCES customers(id),
  distributor_id  VARCHAR(20) REFERENCES distributors(id),
  project         VARCHAR(300),
  province        VARCHAR(100),
  ship_date       DATE,
  start_date      DATE,                          -- ngày bắt đầu bảo hành
  install_date    DATE,
  warranty_years  SMALLINT NOT NULL DEFAULT 5,
  extended        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_customer ON devices(customer_id);

CREATE TABLE ticket_sequences (
  seq_key  VARCHAR(20) PRIMARY KEY,              -- ví dụ RW261120
  last_no  INT NOT NULL DEFAULT 0
);

CREATE TABLE tickets (
  id                  BIGSERIAL PRIMARY KEY,
  no                  VARCHAR(30) NOT NULL UNIQUE,
  type                VARCHAR(2)  NOT NULL CHECK (type IN ('RW','OW','PR','OT')),
  status              VARCHAR(20) NOT NULL
                      CHECK (status IN ('draft','unassigned','diagnosing','pending','returned',
                                        'approved','in_service','on_hold','testing','delivered',
                                        'closed','rejected','cancelled')),
  source              VARCHAR(20) NOT NULL DEFAULT 'distributor',  -- distributor | enduser | agent | staff
  priority            VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  vital               BOOLEAN NOT NULL DEFAULT FALSE,
  title               VARCHAR(300),
  distributor_id      VARCHAR(20) REFERENCES distributors(id),
  assignee_id         BIGINT REFERENCES users(id),
  created_by          BIGINT REFERENCES users(id),
  customer_id         BIGINT REFERENCES customers(id),
  customer_company    VARCHAR(200),              -- snapshot
  customer_contact    VARCHAR(150),
  customer_phone      VARCHAR(30),
  customer_email      VARCHAR(200),
  project             VARCHAR(300),
  province            VARCHAR(100),
  address             VARCHAR(300),
  customer_ticket_no  VARCHAR(50),
  fault_code          VARCHAR(20) REFERENCES fault_codes(code),
  fault_time          TIMESTAMPTZ,
  description         TEXT,
  -- chẩn đoán
  diag_text           TEXT,
  diag_proposal       VARCHAR(20)
                      CHECK (diag_proposal IN ('repair','workshop','replace_part','replace_unit','swap_other','other')),
  -- duyệt
  approval_decision   VARCHAR(10),               -- approve | reject | return
  approval_by         BIGINT REFERENCES users(id),
  approval_at         TIMESTAMPTZ,
  approval_note       TEXT,
  gsp_no              VARCHAR(20),               -- bắt buộc khi approve
  ma_no               VARCHAR(20),
  -- test & giao hàng
  test_result         VARCHAR(10),               -- pass | fail
  test_note           TEXT,
  test_by             BIGINT REFERENCES users(id),
  test_at             TIMESTAMPTZ,
  delivery_carrier    VARCHAR(100),
  delivery_tracking   VARCHAR(100),
  delivery_note       TEXT,
  delivery_at         TIMESTAMPTZ,
  -- feedback
  feedback_score      SMALLINT CHECK (feedback_score BETWEEN 1 AND 5),
  feedback_comment    TEXT,
  feedback_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at           TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_tickets_gsp ON tickets(gsp_no) WHERE gsp_no IS NOT NULL;
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_dist_status ON tickets(distributor_id, status);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_created ON tickets(created_at);

CREATE TABLE ticket_products (
  id         BIGSERIAL PRIMARY KEY,
  ticket_id  BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sn         VARCHAR(40) NOT NULL,
  model      VARCHAR(50),
  qty        INT NOT NULL DEFAULT 1 CHECK (qty > 0)
);
CREATE INDEX idx_tp_ticket ON ticket_products(ticket_id);

CREATE TABLE ticket_parts (
  id         BIGSERIAL PRIMARY KEY,
  ticket_id  BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  pn         VARCHAR(50) NOT NULL REFERENCES parts(pn),
  qty        INT NOT NULL CHECK (qty > 0),
  kind       VARCHAR(10) NOT NULL CHECK (kind IN ('estimate','used'))
);
CREATE INDEX idx_tpart_ticket ON ticket_parts(ticket_id);

CREATE TABLE ticket_events (                      -- append-only
  id           BIGSERIAL PRIMARY KEY,
  ticket_id    BIGINT NOT NULL REFERENCES tickets(id),
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  by_user_id   BIGINT REFERENCES users(id),
  action       VARCHAR(30) NOT NULL,
  from_status  VARCHAR(20),
  to_status    VARCHAR(20),
  note         TEXT
);
CREATE INDEX idx_te_ticket ON ticket_events(ticket_id, at);

CREATE TABLE ticket_messages (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  by_user_id  BIGINT REFERENCES users(id),
  text        TEXT NOT NULL,
  internal    BOOLEAN NOT NULL DEFAULT FALSE       -- true: chỉ nhân viên SGE/NPP thấy
);
CREATE INDEX idx_tm_ticket ON ticket_messages(ticket_id, at);

CREATE TABLE sla_pauses (
  id           BIGSERIAL PRIMARY KEY,
  ticket_id    BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_at      TIMESTAMPTZ NOT NULL,
  to_at        TIMESTAMPTZ,                         -- NULL = đang tạm dừng
  reason       VARCHAR(20) NOT NULL
               CHECK (reason IN ('wait_customer','customer_hold','wait_parts','wait_approval','wait_shipping','other')),
  note         TEXT,
  resumed_by   BIGINT REFERENCES users(id)
);
CREATE INDEX idx_sla_ticket ON sla_pauses(ticket_id);

CREATE TABLE attachments (
  id          BIGSERIAL PRIMARY KEY,
  ticket_id   BIGINT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  kind        VARCHAR(10) NOT NULL CHECK (kind IN ('image','log')),
  name        VARCHAR(255) NOT NULL,                -- tên gốc, chỉ để hiển thị
  stored_path VARCHAR(500) NOT NULL,                -- UUID trên đĩa
  size_bytes  BIGINT NOT NULL,
  mime        VARCHAR(100),
  by_user_id  BIGINT REFERENCES users(id),
  at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_att_ticket ON attachments(ticket_id);

CREATE TABLE notifications (
  id                BIGSERIAL PRIMARY KEY,
  at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  to_user_id        BIGINT REFERENCES users(id),
  to_role           VARCHAR(20),
  to_distributor_id VARCHAR(20) REFERENCES distributors(id),
  to_customer_id    BIGINT REFERENCES customers(id),
  msg_key           VARCHAR(50) NOT NULL,           -- n_submitted, n_approved, ...
  ticket_id         BIGINT REFERENCES tickets(id),
  ticket_no         VARCHAR(30),
  read_by           BIGINT[] NOT NULL DEFAULT '{}', -- danh sách user đã đọc (thông báo theo role dùng chung)
  CHECK (num_nonnulls(to_user_id, to_role, to_distributor_id, to_customer_id) = 1)
);
CREATE INDEX idx_notif_at ON notifications(at DESC);
