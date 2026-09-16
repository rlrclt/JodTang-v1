-- Auth shim สำหรับ PGlite — จำลอง auth.uid() จาก JWT claims
-- ใช้ในเทสต์เท่านั้น (ไม่ใช้ production)

-- สร้าง role authenticated สำหรับ RLS testing
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

-- สร้าง schema auth ถ้ายังไม่มี
CREATE SCHEMA IF NOT EXISTS auth;

-- ตาราง auth.users จำลอง (สำหรับ trigger test)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ฟังก์ชัน uid() อ่านจาก request.jwt.claims
-- ใช้ PL/pgSQL จัดการ NULL/empty setting ได้ปลอดภัย
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims text;
  sub text;
BEGIN
  BEGIN
    claims := current_setting('request.jwt.claims', true);
  EXCEPTION WHEN OTHERS THEN
    claims := NULL;
  END;
  IF claims IS NULL OR claims = '' THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  sub := claims::json->>'sub';
  IF sub IS NULL THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  RETURN sub::uuid;
END;
$$;
