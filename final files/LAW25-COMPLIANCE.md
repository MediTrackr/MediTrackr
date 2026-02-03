# 🇨🇦 Quebec Law 25 Compliance Checklist - MediTrackr

## ✅ IMPLEMENTED

### 1. Data Residency (Article 8)
- [x] Supabase Canadian region enforced (`ENFORCE_DATA_RESIDENCY=true` in env.ts)
- [x] Runtime validation on server startup
- [x] Warning if non-Canadian region detected

**Location**: `config/env.ts` lines 100-115

### 2. Consent Management (Article 14)
- [x] Consent banner on first login (`ConsentBanner.tsx`)
- [x] Consent stored in database (`profiles.privacy_consent_given`, `privacy_consent_date`)
- [x] User cannot proceed without accepting

**Location**: `components/ConsentBanner.tsx`

### 3. Memory Management - Health Card OCR (Article 8)
- [x] Health card images force-wiped from memory after OCR
- [x] `NODE_OPTIONS=--expose-gc` enables `global.gc()`
- [x] Validation warning if `--expose-gc` missing

**Location**: 
- `config/env.ts` (validation)
- `.env.example` (documentation)
- OCR route should call `global.gc()` after processing

---

## ⚠️ MISSING / INCOMPLETE

### 4. Right to Access (Article 27)
**Required**: Users must be able to download all their personal data.

**Implementation Needed**:
```typescript
// /app/api/privacy/export/route.ts
export async function GET() {
  const user = await getUser();
  const data = await fetchAllUserData(user.id);
  return new Response(JSON.stringify(data), {
    headers: { 
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-data.json"'
    }
  });
}
```

### 5. Right to Deletion (Article 28)
**Required**: Users must be able to request account deletion.

**Implementation Needed**:
```typescript
// /app/api/privacy/delete-account/route.ts
export async function DELETE() {
  const user = await getUser();
  // Soft delete: anonymize data
  await supabase.from('profiles').update({
    first_name: 'DELETED',
    last_name: 'USER',
    email: `deleted-${user.id}@example.com`,
    deleted_at: new Date().toISOString()
  }).eq('id', user.id);
  
  // Hard delete after 30 days (scheduled job)
  await supabase.from('deletion_queue').insert({ user_id: user.id });
}
```

### 6. Data Retention Policy (Article 12)
**Required**: Define and enforce retention periods.

**Implementation Needed**:
- Invoices: 7 years (CRA requirement)
- Claims: 7 years (medical records)
- Logs: 90 days
- Deleted accounts: 30 day grace period

**Create**: `lib/retention-policy.ts` with automated cleanup

### 7. Privacy Policy Page (Article 8)
**Required**: Public-facing policy explaining data practices.

**Implementation Needed**:
- `/privacy-policy` page
- Last updated date
- Contact info for privacy officer
- Description of data collection, use, retention, deletion

### 8. Breach Notification (Article 63)
**Required**: Notify users within 72 hours of a breach.

**Implementation Needed**:
- Breach detection monitoring
- Email notification system via Resend
- Admin breach reporting dashboard

### 9. Encryption (Article 8)
**Status**: Supabase handles at-rest encryption ✅
**Missing**: Verify TLS 1.3 for data in transit

**Validation Needed**:
```bash
# Check Supabase TLS version
openssl s_client -connect YOUR_SUPABASE_URL:443 -tls1_3
```

### 10. Access Logs (Article 8)
**Required**: Track who accesses sensitive data.

**Implementation Needed**:
```sql
-- Supabase RLS policy logging
CREATE TABLE access_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  action text,
  resource text,
  timestamp timestamptz DEFAULT now()
);
```

### 11. Third-Party Processor Agreements (Article 8)
**Required**: Ensure all vendors are Law 25 compliant.

**Vendors to Audit**:
- ✅ Supabase (Canadian region)
- ⚠️ Stripe (verify Canadian region)
- ⚠️ Mindee (OCR) - verify data processing location
- ⚠️ Resend (email) - verify data processing location

**Action**: Get DPA (Data Processing Agreement) from each vendor.

---

## 🚀 PRIORITY ACTIONS

### HIGH PRIORITY (Legal Risk)
1. **Create Privacy Policy page** (publicly accessible)
2. **Implement data export API** (Right to Access)
3. **Implement account deletion** (Right to Deletion)
4. **Verify third-party DPAs** (Stripe, Mindee, Resend)

### MEDIUM PRIORITY (Best Practice)
5. **Add access logging** for sensitive tables
6. **Create retention policy** with automated cleanup
7. **Add breach notification system**

### LOW PRIORITY (Nice to Have)
8. **Privacy dashboard** for users (show what data you have, when accessed)
9. **Data minimization audit** (delete unused fields)
10. **Anonymization scripts** for analytics

---

## 📋 COMPLIANCE DOCUMENTATION

Create `/docs/law25-compliance.md`:
- Data flow diagrams
- Retention schedule
- Incident response plan
- Vendor list with DPAs
- Last audit date
- Responsible person contact

---

## 🔐 SECURITY BEST PRACTICES (Not Law 25, but related)

- [ ] Row-Level Security (RLS) enabled on all Supabase tables
- [ ] API rate limiting
- [ ] CSRF protection
- [ ] Input validation & sanitization
- [ ] Secure password requirements (handled by Supabase Auth)
- [ ] MFA option for users

---

## 📞 CONTACTS

**Privacy Officer**: [Name, Email]
**CAI (Commission d'accès à l'information)**: 1-888-528-7741

---

## NEXT STEPS

I can create any of the missing components. Which should we tackle first?

1. Privacy Policy page
2. Data export API
3. Account deletion flow
4. Access logging system
5. All of the above
