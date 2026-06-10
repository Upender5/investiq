-- ─── RBAC: Roles & Permissions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(250),
    category    VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  UNIQUE NOT NULL,
    description VARCHAR(250)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ─── Seed: System Permissions ─────────────────────────────────────────────────
INSERT INTO permissions (name, description, category) VALUES
  -- Trading
  ('PLACE_ORDER',          'Place buy/sell orders',                          'TRADING'),
  ('MODIFY_ORDER',         'Modify pending orders',                          'TRADING'),
  ('CANCEL_ORDER',         'Cancel orders',                                  'TRADING'),
  ('VIEW_ORDERS',          'View own orders and trade history',               'TRADING'),
  ('VIEW_POSITIONS',       'View own positions and P&L',                     'TRADING'),
  -- Portfolio
  ('VIEW_PORTFOLIO',       'View own portfolio',                             'PORTFOLIO'),
  ('VIEW_ANALYTICS',       'View portfolio analytics and performance',        'PORTFOLIO'),
  ('EXPORT_REPORTS',       'Download tax and P&L reports',                   'PORTFOLIO'),
  -- Funds
  ('INVEST_FUNDS',         'Place lump-sum or SIP investments',              'FUNDS'),
  ('REDEEM_FUNDS',         'Redeem mutual fund holdings',                    'FUNDS'),
  ('MANAGE_SIP',           'Create, modify and cancel SIPs',                 'FUNDS'),
  -- Wallet
  ('DEPOSIT_FUNDS',        'Deposit money into wallet',                      'WALLET'),
  ('WITHDRAW_FUNDS',       'Withdraw money from wallet',                     'WALLET'),
  ('VIEW_WALLET',          'View wallet balance and transactions',            'WALLET'),
  -- KYC & Profile
  ('SUBMIT_KYC',           'Submit KYC documents',                           'KYC'),
  ('UPDATE_PROFILE',       'Update own profile details',                     'PROFILE'),
  ('MANAGE_BANK_ACCOUNTS', 'Add and remove bank accounts',                   'PROFILE'),
  -- AI & Goals
  ('USE_AI_ADVISOR',       'Access AI investment advisor',                   'AI'),
  ('MANAGE_GOALS',         'Create and manage investment goals',             'AI'),
  -- Notifications
  ('VIEW_NOTIFICATIONS',   'View notifications',                             'NOTIFICATION'),
  ('MANAGE_NOTIFICATION_SETTINGS', 'Update notification preferences',        'NOTIFICATION'),
  -- Admin
  ('MANAGE_USERS',         'View and manage user accounts',                  'ADMIN'),
  ('APPROVE_KYC',          'Approve or reject KYC submissions',             'ADMIN'),
  ('VIEW_AUDIT_LOGS',      'Access system audit logs',                       'ADMIN'),
  ('MANAGE_PERMISSIONS',   'Grant and revoke user permissions',              'ADMIN'),
  ('VIEW_ADMIN_ANALYTICS', 'Access platform-wide analytics',                 'ADMIN'),
  ('MANAGE_FUNDS',         'Add and update mutual fund data',                'ADMIN'),
  -- Compliance
  ('VIEW_AML_REPORTS',     'Access AML and compliance reports',              'COMPLIANCE'),
  ('VIEW_FRAUD_ALERTS',    'View fraud detection alerts',                    'COMPLIANCE'),
  ('MANAGE_COMPLIANCE',    'Manage compliance rules and thresholds',         'COMPLIANCE')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed: System Roles ────────────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN',  'Full platform access including infrastructure management'),
  ('ADMIN',        'Full admin access — user management, KYC, analytics'),
  ('OPERATIONS',   'Operational tasks — order management, fund data, monitoring'),
  ('SUPPORT',      'Customer support — view-only user data, limited actions'),
  ('INVESTOR',     'Standard user — trade, invest, manage own portfolio'),
  ('ADVISOR',      'Financial advisor — view client portfolios with consent'),
  ('AUDITOR',      'Compliance/audit — read-only access to logs and reports'),
  ('ANALYST',      'Data analyst — admin analytics and reporting access')
ON CONFLICT (name) DO NOTHING;

-- ─── Role-Permission Assignments ──────────────────────────────────────────────
-- INVESTOR: all trading/investing/portfolio permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'INVESTOR'
  AND p.name IN (
    'PLACE_ORDER','MODIFY_ORDER','CANCEL_ORDER','VIEW_ORDERS','VIEW_POSITIONS',
    'VIEW_PORTFOLIO','VIEW_ANALYTICS','EXPORT_REPORTS',
    'INVEST_FUNDS','REDEEM_FUNDS','MANAGE_SIP',
    'DEPOSIT_FUNDS','WITHDRAW_FUNDS','VIEW_WALLET',
    'SUBMIT_KYC','UPDATE_PROFILE','MANAGE_BANK_ACCOUNTS',
    'USE_AI_ADVISOR','MANAGE_GOALS',
    'VIEW_NOTIFICATIONS','MANAGE_NOTIFICATION_SETTINGS'
  )
ON CONFLICT DO NOTHING;

-- ADVISOR: view portfolio + AI, not trading on behalf
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADVISOR'
  AND p.name IN (
    'VIEW_PORTFOLIO','VIEW_ANALYTICS','EXPORT_REPORTS',
    'USE_AI_ADVISOR','MANAGE_GOALS',
    'VIEW_NOTIFICATIONS'
  )
ON CONFLICT DO NOTHING;

-- SUPPORT: view-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SUPPORT'
  AND p.name IN (
    'VIEW_ORDERS','VIEW_POSITIONS','VIEW_PORTFOLIO',
    'VIEW_WALLET','VIEW_NOTIFICATIONS','VIEW_AUDIT_LOGS'
  )
ON CONFLICT DO NOTHING;

-- AUDITOR: compliance and audit access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'AUDITOR'
  AND p.name IN (
    'VIEW_AUDIT_LOGS','VIEW_AML_REPORTS','VIEW_FRAUD_ALERTS',
    'VIEW_ADMIN_ANALYTICS','EXPORT_REPORTS'
  )
ON CONFLICT DO NOTHING;

-- ANALYST: data analytics access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ANALYST'
  AND p.name IN (
    'VIEW_ADMIN_ANALYTICS','VIEW_AUDIT_LOGS','EXPORT_REPORTS',
    'VIEW_AML_REPORTS','VIEW_FRAUD_ALERTS'
  )
ON CONFLICT DO NOTHING;

-- OPERATIONS: full operational access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'OPERATIONS'
  AND p.name IN (
    'VIEW_ORDERS','MODIFY_ORDER','CANCEL_ORDER',
    'APPROVE_KYC','MANAGE_FUNDS','VIEW_AUDIT_LOGS',
    'VIEW_ADMIN_ANALYTICS','VIEW_AML_REPORTS','VIEW_FRAUD_ALERTS',
    'MANAGE_NOTIFICATION_SETTINGS'
  )
ON CONFLICT DO NOTHING;

-- ADMIN: all except SUPER_ADMIN-only operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN'
  AND p.name NOT IN ('MANAGE_COMPLIANCE')
ON CONFLICT DO NOTHING;

-- SUPER_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
