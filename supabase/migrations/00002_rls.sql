-- RLS: เปิดทุกตาราง + policy ทุกตัวใช้ auth.uid()
-- ไม่มี policy ที่ใช้ true เด็ดขาด

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles: อ่าน/เขียนได้เฉพาะตัวเอง
-- ============================================================
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- profiles: ห้ามลบ (ใช้ Supabase dashboard เท่านั้น)

-- ============================================================
-- accounts: อ่าน/เขียน/ลบได้เฉพาะของตัวเอง
-- ============================================================
CREATE POLICY "accounts_select_own"
  ON accounts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "accounts_insert_own"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_update_own"
  ON accounts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "accounts_delete_own"
  ON accounts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- categories: อ่าน/เขียน/ลบได้เฉพาะของตัวเอง
-- ============================================================
CREATE POLICY "categories_select_own"
  ON categories FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "categories_insert_own"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories_update_own"
  ON categories FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "categories_delete_own"
  ON categories FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- transactions: อ่าน/เขียน/ลบได้เฉพาะของตัวเอง
-- ============================================================
CREATE POLICY "transactions_select_own"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "transactions_insert_own"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_update_own"
  ON transactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "transactions_delete_own"
  ON transactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- budgets: อ่าน/เขียน/ลบได้เฉพาะของตัวเอง
-- ============================================================
CREATE POLICY "budgets_select_own"
  ON budgets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "budgets_insert_own"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "budgets_update_own"
  ON budgets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "budgets_delete_own"
  ON budgets FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- ai_analyses: อ่าน/เขียนได้เฉพาะของตัวเอง
-- ============================================================
CREATE POLICY "ai_analyses_select_own"
  ON ai_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_analyses_insert_own"
  ON ai_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Trigger: สร้าง profiles อัตโนมัติเมื่อมี user ใหม่ใน auth.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Indexes สำหรับ query ที่ใช้บ่อย
-- ============================================================
CREATE INDEX idx_transactions_user_occurred
  ON transactions (user_id, occurred_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_transactions_user_category
  ON transactions (user_id, category_id, occurred_at);

CREATE INDEX idx_accounts_user
  ON accounts (user_id);

CREATE INDEX idx_categories_user
  ON categories (user_id);

CREATE INDEX idx_budgets_user_category
  ON budgets (user_id, category_id, period_month);

CREATE INDEX idx_ai_analyses_user
  ON ai_analyses (user_id, created_at DESC);

-- Grant permissions ให้ authenticated role (ต้องหลังสร้างตาราง)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
