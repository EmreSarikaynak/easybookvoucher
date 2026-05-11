-- Voucher işlemlerini sadece admin kullanıcılarına kısıtla
-- Bu migration ile agency_admin ve sales rolleri artık voucher ekleyemez/güncelleyemez

-- INSERT: Sadece admin ve super_admin
DROP POLICY IF EXISTS "vouchers_insert" ON vouchers;
CREATE POLICY "vouchers_insert" ON vouchers FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

-- UPDATE: Sadece admin ve super_admin
DROP POLICY IF EXISTS "vouchers_update" ON vouchers;
CREATE POLICY "vouchers_update" ON vouchers FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- SELECT policy değişmeden kalıyor (herkes kendi voucherlarını görebilir)
-- DELETE policy zaten admin-only, değişiklik gerekmiyor
