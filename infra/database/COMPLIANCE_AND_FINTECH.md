# InvestIQ :: FinTech Compliance Design
## Part 11 of Enterprise DB Architecture

---

## Regulatory Framework

| Regulation | Scope | Key Requirements |
|---|---|---|
| **SEBI LODR** | Listed equity trading | Trade audit 7 years, KYC for all investors |
| **RBI PPI Guidelines** | Wallet (Pre-Paid Instrument) | KYC tiers, ₹1L/₹2L limits, SAR filing |
| **PMLA 2002 / AML** | Anti-money laundering | CDD, EDD, STR/CTR reporting to FIU-IND |
| **DPDP Act 2023** | Indian data privacy | Consent, purpose limitation, erasure rights |
| **PCI-DSS v4.0** | Card payment data | Encryption, tokenization, audit, pen-testing |
| **ISO 27001:2022** | Information security | ISMS, risk management, incident response |
| **SOC 2 Type II** | Cloud security | Availability, confidentiality, processing integrity |
| **GDPR (for NRI users)** | EU citizens | Consent, portability, right to erasure |

---

## 1. SEBI Compliance

### Trade Audit Trail
```sql
-- Every order state change is logged immutably
-- Retention: 7 years minimum (SEBI mandate)

-- Verify audit completeness for a trade
SELECT
    a.event_time,
    a.action,
    a.new_values->>'status' AS new_status,
    a.user_id,
    a.service_name
FROM audit_logs a
WHERE a.entity_type = 'ORDER'
  AND a.entity_id = $1
ORDER BY a.event_time;

-- SEBI compliance report: daily trade summary
SELECT
    DATE(executed_at) AS trade_date,
    COUNT(*) AS total_trades,
    SUM(net_amount) AS total_value_inr,
    COUNT(DISTINCT user_id) AS unique_traders,
    SUM(stt) AS total_stt_collected,
    SUM(sebi_charges) AS total_sebi_charges
FROM trades
WHERE status = 'SETTLED'
  AND executed_at >= $1 AND executed_at < $2
GROUP BY DATE(executed_at)
ORDER BY trade_date;
```

### KYC Requirements
- All users must complete KYC before first trade (enforced at API + DB layer)
- KYC re-verification every 10 years (`kyc_expires_at` in user_profiles)
- Document types: PAN (mandatory) + Aadhaar/Passport/DL (one required)
- PEP (Politically Exposed Person) flag in `user_profiles.is_politically_exposed`
- Enhanced Due Diligence (EDD) trigger: PEP = TRUE → manual review required

---

## 2. RBI PPI Compliance (Wallet)

### Wallet Tier Limits
```sql
-- RBI PPI tiers enforced in wallets table
-- Tier 1 (min KYC): ₹10,000 balance, ₹10,000/month load
-- Tier 2 (full KYC): ₹1,00,000 balance, ₹2,00,000/year load

CREATE TABLE wallet_kyc_tiers (
    wallet_id       UUID PRIMARY KEY REFERENCES wallets(id),
    kyc_tier        SMALLINT NOT NULL DEFAULT 1,  -- 1 = min, 2 = full
    max_balance     NUMERIC(15,2) NOT NULL DEFAULT 10000,
    monthly_load_limit NUMERIC(15,2) NOT NULL DEFAULT 10000,
    annual_load_limit NUMERIC(20,2) NOT NULL DEFAULT 120000,
    current_month_load NUMERIC(15,2) NOT NULL DEFAULT 0,
    current_year_load  NUMERIC(20,2) NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check before deposit
CREATE OR REPLACE FUNCTION check_rbi_ppi_limits(
    p_wallet_id UUID,
    p_amount NUMERIC
) RETURNS BOOL AS $$
DECLARE
    v_tier wallet_kyc_tiers;
    v_current_balance NUMERIC;
BEGIN
    SELECT * INTO v_tier FROM wallet_kyc_tiers WHERE wallet_id = p_wallet_id;
    SELECT balance INTO v_current_balance FROM wallets WHERE id = p_wallet_id;
    
    -- Check balance limit
    IF (v_current_balance + p_amount) > v_tier.max_balance THEN
        RAISE EXCEPTION 'RBI PPI limit: balance would exceed ₹%', v_tier.max_balance;
    END IF;
    
    -- Check monthly load limit
    IF (v_tier.current_month_load + p_amount) > v_tier.monthly_load_limit THEN
        RAISE EXCEPTION 'RBI PPI limit: monthly load limit ₹% exceeded', v_tier.monthly_load_limit;
    END IF;
    
    RETURN TRUE;
END; $$ LANGUAGE plpgsql;
```

---

## 3. AML / PMLA Compliance

### Suspicious Activity Detection
```sql
-- CTR: Cash Transaction Report — transactions > ₹10 lakh
-- Filed automatically with FIU-IND within 7 days

CREATE VIEW vw_ctr_candidates AS
SELECT
    p.user_id,
    up.full_name,
    up.phone,
    DATE(p.completed_at) AS transaction_date,
    SUM(p.amount) AS daily_total,
    COUNT(*) AS transaction_count,
    ARRAY_AGG(p.id) AS payment_ids
FROM payments p
JOIN user_profiles up ON up.id = p.user_id
WHERE p.status = 'SUCCESS'
  AND p.direction = 'DEPOSIT'
  AND p.completed_at >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY p.user_id, up.full_name, up.phone, DATE(p.completed_at)
HAVING SUM(p.amount) >= 1000000;  -- ₹10 lakh threshold

-- Structuring detection: multiple deposits just under ₹10 lakh
CREATE VIEW vw_structuring_alerts AS
SELECT
    user_id,
    DATE(completed_at) AS date,
    COUNT(*) AS deposits,
    SUM(amount) AS total,
    MAX(amount) AS max_single
FROM payments
WHERE status = 'SUCCESS'
  AND direction = 'DEPOSIT'
  AND completed_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id, DATE(completed_at)
HAVING COUNT(*) >= 3
   AND SUM(amount) > 800000   -- cumulative > ₹8 lakh
   AND MAX(amount) < 900000;  -- but each < ₹9 lakh (structuring pattern)
```

---

## 4. DPDP Act 2023 (Indian Data Privacy)

### Consent Management
```sql
-- All data processing requires logged consent
-- consent_records table tracks: what, when, version, IP

-- GDPR/DPDP: Right to Access — export all user data
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'profile',      (SELECT row_to_json(up.*) FROM user_profiles up WHERE id = p_user_id),
        'addresses',    (SELECT json_agg(a.*) FROM addresses a WHERE user_id = p_user_id),
        'bank_accounts',(SELECT json_agg(vw.*) FROM vw_bank_accounts_masked vw WHERE user_id = p_user_id),
        'orders',       (SELECT json_agg(o.*) FROM orders o WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 100),
        'transactions', (SELECT json_agg(t.*) FROM transactions t
                          JOIN wallets w ON w.id = t.wallet_id
                          WHERE w.user_id = p_user_id ORDER BY t.created_at DESC LIMIT 100),
        'goals',        (SELECT json_agg(g.*) FROM goals g WHERE user_id = p_user_id),
        'consents',     (SELECT json_agg(c.*) FROM consent_records c WHERE user_id = p_user_id),
        'exported_at',  NOW()
    ) INTO result;
    
    -- Log the data export for audit
    INSERT INTO audit_logs(action, entity_type, entity_id, user_id, service_name)
    VALUES('DATA_EXPORT_REQUESTED', 'USER', p_user_id, p_user_id, 'compliance-service');
    
    RETURN result;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Right to Erasure (DPDP Article 13)
```sql
-- Soft delete + PII anonymization (we cannot fully delete — 7-yr SEBI audit trail)
CREATE OR REPLACE PROCEDURE anonymize_user_data(p_user_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    -- Mark deleted in auth
    UPDATE users
    SET status = 'DELETED', deleted_at = NOW(),
        phone = 'DELETED_' || gen_random_uuid()::TEXT,
        email = NULL, full_name = 'DELETED USER'
    WHERE id = p_user_id;
    
    -- Anonymize profile
    UPDATE user_profiles
    SET phone = 'DELETED_' || gen_random_uuid()::TEXT,
        email = NULL, full_name = 'Deleted User',
        date_of_birth = NULL, deleted_at = NOW()
    WHERE id = p_user_id;
    
    -- Anonymize KYC (keep encrypted column — needed for SEBI audit)
    UPDATE kyc_documents
    SET document_number_enc = 'ANONYMIZED', document_number_hash = 'ANONYMIZED'
    WHERE user_id = p_user_id;
    
    -- Soft delete bank accounts
    UPDATE bank_accounts
    SET account_number_enc = 'ANONYMIZED', account_number_hash = 'ANONYMIZED',
        account_number_mask = 'XXXX'
    WHERE user_id = p_user_id;
    
    -- Revoke all sessions
    UPDATE sessions SET status = 'REVOKED', revoked_at = NOW(), revoked_reason = 'GDPR_ERASURE'
    WHERE user_id = p_user_id;
    
    -- Withdraw all consents
    UPDATE consent_records SET withdrawn_at = NOW()
    WHERE user_id = p_user_id AND withdrawn_at IS NULL;
    
    -- Audit log the erasure
    INSERT INTO audit_logs(action, entity_type, entity_id, user_id, service_name, risk_level)
    VALUES('DATA_EXPORT_REQUESTED', 'USER', p_user_id, p_user_id, 'compliance-service', 'HIGH');
    
    -- NOTE: Financial audit trail (audit_logs, transactions, orders) is RETAINED
    -- per SEBI 7-year requirement — user_id becomes pseudonymous
END;
$$;
```

---

## 5. PCI-DSS v4.0 Compliance

| Requirement | Implementation |
|---|---|
| **Req 3**: Protect stored cardholder data | AES-256 encryption via pgcrypto for PAN, CVV never stored |
| **Req 4**: Encrypt transmission | TLS 1.3 mandatory; no fallback to TLS 1.2 |
| **Req 6**: Secure development | SAST in CI/CD; parameterized queries only |
| **Req 7**: Restrict access | RBAC + RLS; least-privilege DB roles |
| **Req 8**: Identify users | MFA for admin; unique DB login per service |
| **Req 10**: Track and monitor | Immutable audit_logs; pg_stat_statements; SIEM integration |
| **Req 11**: Security testing | Quarterly penetration testing; annual PCI audit |
| **Req 12**: Information security policy | Written ISMS; incident response plan |

---

## 6. Data Classification

| Classification | Examples | Handling |
|---|---|---|
| **TOP SECRET** | Aadhaar number, PAN, Bank A/C | AES-256 encrypted at rest; Vault for keys; audit on every access |
| **CONFIDENTIAL** | Phone, Email, DOB, Address | Encrypted at rest (RDS encryption); masked in logs |
| **INTERNAL** | Portfolio value, trade history, risk score | Access via authenticated API only; no external sharing |
| **PUBLIC** | Company name, Stock prices, Fund NAV | No restriction; cached in Redis |

---

## 7. Incident Response (Data Breach)

```
TIMELINE:
  Hour 0   : Breach detected (CloudTrail / WAF alert)
  Hour 1   : Incident commander assigned; affected tables identified
  Hour 2   : Revoke all affected user sessions + rotate DB credentials
  Hour 4   : Scope assessment — how many users affected?
  Hour 24  : CERT-In notification (mandatory < 6 hours for critical breaches)
  Hour 72  : RBI notification (if payment data involved)
  Day 7    : SEBI notification (if trading data involved)
  Day 30   : Affected user notification + regulatory report
  Day 90   : Root cause analysis + remediation proof submitted
```
