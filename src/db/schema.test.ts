import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname + "/../..";

async function loadSql(path: string): Promise<string> {
  return readFile(join(ROOT, path), "utf-8");
}
type TestDb = {
  exec(sql: string): Promise<unknown>;
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  close(): Promise<unknown>;
};

async function loadMigrations(db: TestDb) {
  const shim = await loadSql("supabase/tests/auth_shim.sql");
  const m1 = await loadSql("supabase/migrations/00001_create_tables.sql");
  const m2 = await loadSql("supabase/migrations/00002_rls.sql");
  const m3 = await loadSql("supabase/migrations/00003_add_profiles_email.sql");
  const m4 = await loadSql("supabase/migrations/00004_harden_profile_trigger.sql");
  const m5 = await loadSql("supabase/migrations/00005_seed_default_categories.sql");
  await db.exec(shim);
  await db.exec(m1);
  await db.exec(m2);
  await db.exec(m3);
  await db.exec(m4);
  await db.exec(m5);
}

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

/** ตั้ง role เป็น authenticated + จำลอง JWT claims ของผู้ใช้ */
async function setAuth(db: TestDb, userId: string) {
  await db.exec("SET ROLE authenticated");
  await db.exec(
    `SET request.jwt.claims = '${JSON.stringify({ sub: userId })}'`
  );
}

async function resetAuth(db: TestDb) {
  await db.exec("RESET ROLE");
  await db.exec("SET request.jwt.claims = ''");
}

/** สร้าง user ใน auth.users + profiles (ใช้ reset role ก่อน) */
async function ensureUser(db: TestDb, userId: string) {
  await db.exec("RESET ROLE");
  await db.exec(`INSERT INTO auth.users (id) VALUES ('${userId}') ON CONFLICT DO NOTHING`);
  await db.exec(`INSERT INTO profiles (id) VALUES ('${userId}') ON CONFLICT DO NOTHING`);
}

describe("JodTang schema v1", () => {
  let db: TestDb;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();
    await loadMigrations(db);
    await ensureUser(db, USER_A);
    await ensureUser(db, USER_B);
    // สร้าง accounts + categories ที่ใช้ร่วมกันทุกเทสต์
    await db.exec("RESET ROLE");
    await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('a0000000-0000-0000-0000-000000000001', '${USER_A}', 'wallet')`);
    await db.exec(`INSERT INTO categories (id, user_id, name, kind) VALUES ('c0000000-0000-0000-0000-000000000001', '${USER_A}', 'food', 'expense')`);
  });

  after(async () => {
    await db.close();
  });

  describe("bigint money", () => {
    it("stores and sums bigint amounts without float loss", async () => {
      await setAuth(db, USER_A);
      await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', 12345, 'test', now(), '11111111-1111-1111-1111-111111111111')`);

      const r = await db.query("SELECT sum(amount) as sum FROM transactions WHERE user_id = $1", [USER_A]);
      assert.equal(Number(r.rows[0].sum), 12345, "sum must be exact integer");

      await db.exec("DELETE FROM transactions WHERE client_id = '11111111-1111-1111-1111-111111111111'");
      await resetAuth(db);
    });

    it("rejects negative amount", async () => {
      await setAuth(db, USER_A);
      try {
        await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', -100, 'bad', now(), '22222222-2222-2222-2222-222222222222')`);
        assert.fail("should throw");
      } catch (e: any) {
        assert.ok(e.message.includes("check"), "expected check constraint");
      }
      await resetAuth(db);
    });
  });

  describe("soft delete", () => {
    it("sets deleted_at but row still exists", async () => {
      await setAuth(db, USER_A);
      await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', 500, 'to delete', now(), '33333333-3333-3333-3333-333333333333')`);
      await db.exec(`UPDATE transactions SET deleted_at = now() WHERE client_id = '33333333-3333-3333-3333-333333333333'`);

      const r = await db.query("SELECT deleted_at FROM transactions WHERE client_id = $1", ["33333333-3333-3333-3333-333333333333"]);
      assert.equal(r.rows.length, 1, "row still exists");
      assert.ok(r.rows[0].deleted_at !== null, "deleted_at is set");

      const filtered = await db.query("SELECT * FROM transactions WHERE deleted_at IS NULL AND client_id = $1", ["33333333-3333-3333-3333-333333333333"]);
      assert.equal(filtered.rows.length, 0, "filtered query skips deleted row");
      await db.exec("DELETE FROM transactions WHERE client_id = '33333333-3333-3333-3333-333333333333'");
      await resetAuth(db);
    });
  });

  describe("transfer constraints", () => {
    it("requires to_account_id for transfer", async () => {
      await setAuth(db, USER_A);
      try {
        await db.exec(`INSERT INTO transactions (user_id, account_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'transfer', 100, 'no to_account', now(), '44444444-4444-4444-4444-444444444444')`);
        assert.fail("should throw");
      } catch (e: any) {
        assert.ok(e.message.includes("transfer_must_have_to_account") || e.message.includes("check"), "expected transfer constraint");
      }
      await resetAuth(db);
    });

    it("rejects amount=0 for transfer", async () => {
      await setAuth(db, USER_A);
      // สร้าง account ที่สองสำหรับโอน
      await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('a0000000-0000-0000-0000-000000000003', '${USER_A}', 'w3')`);
      try {
        await db.exec(`INSERT INTO transactions (user_id, account_id, to_account_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'transfer', 0, 'zero', now(), '55555555-5555-5555-5555-555555555555')`);
        assert.fail("should throw");
      } catch (e: any) {
        assert.ok(e.message.includes("check"), "expected check constraint");
      }
      await db.exec("DELETE FROM accounts WHERE id = 'a0000000-0000-0000-0000-000000000003'");
      await resetAuth(db);
    });
  });

  describe("idempotency", () => {
    it("rejects duplicate client_id", async () => {
      await setAuth(db, USER_A);
      const cid = "66666666-6666-6666-6666-666666666666";
      await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', 100, 'first', now(), '${cid}')`);
      try {
        await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', 200, 'dup', now(), '${cid}')`);
        assert.fail("should throw");
      } catch (e: any) {
        assert.ok(e.message.includes("duplicate") || e.message.includes("unique"), "expected unique violation");
      }
      await db.exec("DELETE FROM transactions WHERE client_id = '66666666-6666-6666-6666-666666666666'");
      await resetAuth(db);
    });
  });

  describe("RLS isolation", () => {
    before(async () => {
      await db.exec("RESET ROLE");
      await db.exec(`INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'expense', 1000, 'A secret', now(), '77777777-7777-7777-7777-777777777777')`);
    });

    it("USER_B cannot see USER_A's transactions", async () => {
      await setAuth(db, USER_B);
      const r = await db.query("SELECT * FROM transactions WHERE user_id = $1", [USER_A]);
      assert.equal(r.rows.length, 0, "USER_B should not see USER_A's data");
      await resetAuth(db);
    });

    it("USER_B cannot insert with USER_A's user_id", async () => {
      await setAuth(db, USER_B);
      try {
        await db.exec(`INSERT INTO transactions (user_id, account_id, kind, amount, note, occurred_at, client_id) VALUES ('${USER_A}', 'a0000000-0000-0000-0000-000000000001', 'expense', 100, 'hack', now(), '88888888-8888-8888-8888-888888888888')`);
        assert.fail("insert should fail");
      } catch (e: any) {
        assert.ok(e.message.includes("row-level security") || e.message.includes("violates"), "expected RLS violation");
      }
      await resetAuth(db);
    });

    it("USER_B cannot update USER_A's transactions", async () => {
      await setAuth(db, USER_B);
      await db.exec(`UPDATE transactions SET note = 'hacked' WHERE client_id = '77777777-7777-7777-7777-777777777777'`);
      await resetAuth(db);
      await db.exec("RESET ROLE");
      const check = await db.query("SELECT note FROM transactions WHERE client_id = $1", ["77777777-7777-7777-7777-777777777777"]);
      assert.equal(check.rows[0].note, "A secret", "note unchanged");
    });

    it("USER_B cannot delete USER_A's transactions", async () => {
      await setAuth(db, USER_B);
      await db.exec(`DELETE FROM transactions WHERE client_id = '77777777-7777-7777-7777-777777777777'`);
      await resetAuth(db);
      await db.exec("RESET ROLE");
      const check = await db.query("SELECT * FROM transactions WHERE client_id = $1", ["77777777-7777-7777-7777-777777777777"]);
      assert.equal(check.rows.length, 1, "row still exists");
    });
  });

  describe("trigger: handle_new_user", () => {
    it("creates profile and stores Google email", async () => {
      await db.exec("RESET ROLE");
      const newId = "99999999-9999-9999-9999-999999999999";
      await db.exec(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('${newId}', 'trigger@test.com', '{"full_name": "Trigger Test"}'::jsonb)`);
      const r = await db.query("SELECT full_name, email FROM profiles WHERE id = $1", [newId]);
      assert.equal(r.rows.length, 1, "profile auto-created");
      assert.equal(r.rows[0].full_name, "Trigger Test");
      assert.equal(r.rows[0].email, "trigger@test.com");
      await db.exec(`DELETE FROM profiles WHERE id = '${newId}'`);
      await db.exec(`DELETE FROM auth.users WHERE id = '${newId}'`);
    });

    it("keeps email null for users without an email", async () => {
      await db.exec("RESET ROLE");
      const newId = "88888888-8888-8888-8888-888888888888";
      await db.exec(`INSERT INTO auth.users (id, raw_user_meta_data) VALUES ('${newId}', '{"full_name": "No Email"}'::jsonb)`);
      const r = await db.query("SELECT email FROM profiles WHERE id = $1", [newId]);
      assert.equal(r.rows[0].email, null);
      await db.exec(`DELETE FROM profiles WHERE id = '${newId}'`);
      await db.exec(`DELETE FROM auth.users WHERE id = '${newId}'`);
    });
  });
});
