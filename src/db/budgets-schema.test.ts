import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * เทสต์ schema budget ระดับฐานข้อมูล (PGlite)
 * ตรวจ unique (user, category, month) · amount >= 0 · เดือนใหม่คือแถวใหม่จริง ๆ (ไม่มีตรรกะพกงบข้ามเดือน)
 */

const ROOT = import.meta.dirname + "/../..";

async function loadSql(path: string): Promise<string> {
  return readFile(join(ROOT, path), "utf-8");
}

async function loadMigrations(db: any) {
  const shim = await loadSql("supabase/tests/auth_shim.sql");
  const m1 = await loadSql("supabase/migrations/00001_create_tables.sql");
  const m2 = await loadSql("supabase/migrations/00002_rls.sql");
  await db.exec(shim);
  await db.exec(m1);
  await db.exec(m2);
}

const USER_A = "11111111-1111-1111-1111-111111111111";
const CAT_FOOD = "c0000000-0000-0000-0000-000000000001";

async function setAuth(db: any, userId: string) {
  await db.exec("SET ROLE authenticated");
  await db.exec(
    `SET request.jwt.claims = '${JSON.stringify({ sub: userId })}'`
  );
}

async function resetAuth(db: any) {
  await db.exec("RESET ROLE");
  await db.exec("SET request.jwt.claims = ''");
}

describe("budgets schema (PGlite)", () => {
  let db: any;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();
    await loadMigrations(db);
    await db.exec("RESET ROLE");
    await db.exec(
      `INSERT INTO auth.users (id) VALUES ('${USER_A}') ON CONFLICT DO NOTHING`
    );
    await db.exec(
      `INSERT INTO profiles (id) VALUES ('${USER_A}') ON CONFLICT DO NOTHING`
    );
    await db.exec(
      `INSERT INTO categories (id, user_id, name, kind) VALUES ('${CAT_FOOD}', '${USER_A}', 'food', 'expense')`
    );
  });

  after(async () => {
    await db.close();
  });

  it("insert งบพื้นฐานได้ (amount = สตางค์)", async () => {
    await setAuth(db, USER_A);
    await db.exec(
      `INSERT INTO budgets (user_id, category_id, period_month, amount)
       VALUES ('${USER_A}', '${CAT_FOOD}', '2026-09-01', 150000)`
    );
    const r = await db.query(
      `SELECT amount FROM budgets WHERE period_month = '2026-09-01'`
    );
    assert.equal(r.rows.length, 1);
    assert.equal(Number(r.rows[0].amount), 150000);
    await resetAuth(db);
  });

  it("rejects amount ติดลบ (check >= 0)", async () => {
    await setAuth(db, USER_A);
    try {
      await db.exec(
        `INSERT INTO budgets (user_id, category_id, period_month, amount)
         VALUES ('${USER_A}', '${CAT_FOOD}', '2026-10-01', -1)`
      );
      assert.fail("should throw");
    } catch (e: any) {
      assert.ok(
        e.message.includes("check"),
        `expected check constraint, got: ${e.message}`
      );
    }
    await resetAuth(db);
  });

  it("rejects amount < 0 ตอน UPDATE ด้วย", async () => {
    await setAuth(db, USER_A);
    try {
      await db.exec(
        `UPDATE budgets SET amount = -100 WHERE period_month = '2026-09-01'`
      );
      assert.fail("should throw");
    } catch (e: any) {
      assert.ok(e.message.includes("check"));
    }
    await resetAuth(db);
  });

  it("rejects งบซ้ำ (unique user+category+month)", async () => {
    await setAuth(db, USER_A);
    try {
      await db.exec(
        `INSERT INTO budgets (user_id, category_id, period_month, amount)
         VALUES ('${USER_A}', '${CAT_FOOD}', '2026-09-01', 99999)`
      );
      assert.fail("should throw");
    } catch (e: any) {
      assert.ok(
        e.message.includes("duplicate") || e.message.includes("unique"),
        "expected unique violation"
      );
    }
    await resetAuth(db);
  });

  it("หมวดเดียวกันคนละเดือน = ไม่ซ้ำ (เดือนใหม่เริ่มว่างจริง)", async () => {
    await setAuth(db, USER_A);
    await db.exec(
      `INSERT INTO budgets (user_id, category_id, period_month, amount)
       VALUES ('${USER_A}', '${CAT_FOOD}', '2026-10-01', 200000)`
    );
    // เดือน 2026-11 ยังไม่มีงบ — "เดือนใหม่ = เริ่มจากไม่มีงบ" คือความจริงจาก DB
    const r = await db.query(
      `SELECT amount FROM budgets WHERE period_month = '2026-11-01'`
    );
    assert.equal(r.rows.length, 0, "เดือนใหม่ต้องไม่ตกค้างงบจากเดือนก่อน");
    await resetAuth(db);
  });

  it("งบของ USER_A ไม่ปรากฏต่อ USER_B (RLS)", async () => {
    const USER_B = "22222222-2222-2222-2222-222222222222";
    await setAuth(db, USER_B);
    const r = await db.query(
      `SELECT * FROM budgets WHERE period_month = '2026-09-01'`
    );
    assert.equal(
      r.rows.length,
      0,
      "USER_B ต้องมองไม่เห็นงบของ USER_A (แม้ query ระบุ user_id USER_A)"
    );
    await resetAuth(db);
  });

  it("upsert งบเดิมแล้วข้อมูลเดิมถูกแทน (จำนวนแถวไม่เพิ่ม)", async () => {
    await setAuth(db, USER_A);
    await db.exec(
      `INSERT INTO budgets (user_id, category_id, period_month, amount)
       VALUES ('${USER_A}', '${CAT_FOOD}', '2026-09-01', 999000)
       ON CONFLICT (user_id, category_id, period_month) DO UPDATE SET amount = EXCLUDED.amount`
    );
    const r = await db.query(
      `SELECT amount FROM budgets WHERE period_month = '2026-09-01' AND category_id = '${CAT_FOOD}'`
    );
    assert.equal(r.rows.length, 1, "แถวไม่ซ้ำ");
    assert.equal(Number(r.rows[0].amount), 999000, "ยอดถูกอัปเดต");
    await resetAuth(db);
  });
});
