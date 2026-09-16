-- Schema v1: สร้างตารางทั้งหมดของ JodTang
-- กติกา: เงิน = bigint หน่วยสตางค์ · soft delete = deleted_at · archive = archived_at

-- ============================================================
-- 1. profiles — ผู้ใช้ (เชื่อมกับ auth.users ของ Supabase)
-- ============================================================
CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. accounts — กระเป๋าเงิน
-- ============================================================
CREATE TABLE accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  currency    char(3) NOT NULL DEFAULT 'THB',
  archived_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  -- ชื่อกระเป๋าซ้ำกันไม่ได้ต่อบัญชี
  UNIQUE (user_id, name)
);

-- ============================================================
-- 3. categories — หมวดหมู่รายรับ/รายจ่าย
-- ============================================================
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text,
  kind        text NOT NULL CHECK (kind IN ('income', 'expense')),
  archived_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),

  -- ชื่อหมวดซ้ำกันไม่ได้ต่อบัญชี ต่อ kind
  UNIQUE (user_id, name, kind)
);

-- ============================================================
-- 4. transactions — รายการรายรับ/รายจ่าย/โอน
-- ============================================================
CREATE TABLE transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id    uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id   uuid REFERENCES categories(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
  kind          text NOT NULL CHECK (kind IN ('income', 'expense', 'transfer')),
  amount        bigint NOT NULL CHECK (amount > 0),
  note          text,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  client_id     uuid UNIQUE NOT NULL,
  deleted_at    timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  -- Transfer ต้องมี to_account_id
  CONSTRAINT transfer_must_have_to_account
    CHECK (kind != 'transfer' OR to_account_id IS NOT NULL),

  -- Income/expense ห้ามมี to_account_id
  CONSTRAINT non_transfer_no_to_account
    CHECK (kind = 'transfer' OR to_account_id IS NULL)
);

-- ============================================================
-- 5. budgets — งบรายเดือนต่อหมวด
-- ============================================================
CREATE TABLE budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount       bigint NOT NULL CHECK (amount >= 0),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),

  -- งบซ้ำกันไม่ได้: หนึ่งหมวดต่อเดือนต่อบัญชี
  UNIQUE (user_id, category_id, period_month)
);

-- ============================================================
-- 6. ai_analyses — ผลวิเคราะห์จาก AI (เก็บไว้เปิดดูย้อนหลัง)
-- ============================================================
CREATE TABLE ai_analyses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_from    date NOT NULL,
  period_to      date NOT NULL,
  summary        text NOT NULL,
  raw_response   jsonb,
  model          text,
  created_at     timestamptz DEFAULT now()
);
