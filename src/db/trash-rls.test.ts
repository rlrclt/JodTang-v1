/**
 * เทสต์เชิงลบสำหรับถังขยะ + ส่งออก — พิสูจน์ว่า RLS กันข้ามบัญชีจริงบน Postgres จมูกเปล่า
 * ต่อจาก src/db/schema.test.ts — ใช้รูปแบบเดียวกัน (PGlite + auth shim + SET ROLE authenticated)
 *
 * พิสูจน์ว่า:
 * 1. กู้คืน (UPDATE deleted_at = null) แถวของคนอื่นไม่ได้
 * 2. ลบถาวร (DELETE) แถวของคนอื่นไม่ได้
 * 3. อ่านรายการในถังขยะของคนอื่นไม่ได้
 * 4. export query (คือ SELECT deleted_at IS NULL) ไม่รวมแถวที่ soft delete
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = import.meta.dirname + "/../..";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

// ใช้ id ของคนอื่นแม่นยำ — ต้องเป็น id ของแถวที่รู้ว่าของใคร
const TX_A_SOFT_DELETE = "91000000-0000-0000-0000-000000000001";
const TX_A_ALIVE = "91000000-0000-0000-0000-000000000002";
const TX_B_SOFT_DELETE = "91000000-0000-0000-0000-000000000003";
const TX_B_ALIVE = "91000000-0000-0000-0000-000000000004";
const ACC_A = "92000000-0000-0000-0000-000000000001";
const ACC_B = "92000000-0000-0000-0000-000000000002";

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

describe("trash + export isolation (RLS)", () => {
  let db: any;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();

    const shim = await readFile(join(ROOT, "supabase/tests/auth_shim.sql"), "utf-8");
    const m1 = await readFile(join(ROOT, "supabase/migrations/00001_create_tables.sql"), "utf-8");
    const m2 = await readFile(join(ROOT, "supabase/migrations/00002_rls.sql"), "utf-8");
    await db.exec(shim);
    await db.exec(m1);
    await db.exec(m2);

    // สร้าง user A/B + profile + accounts
    await db.exec("RESET ROLE");
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${USER_A}'), ('${USER_B}') ON CONFLICT DO NOTHING`);
    await db.exec("RESET ROLE");
    await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_A}', '${USER_A}', 'A wallet')`);
    await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_B}', '${USER_B}', 'B wallet')`);

    // ใส่รายการของ A: 1 แถว soft delete + 1 แถวยังอยู่ (export ควรเห็นแค่หลัง)
    await db.exec(`RESET ROLE; INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id, deleted_at)
      VALUES ('${TX_A_SOFT_DELETE}', '${USER_A}', '${ACC_A}', 'expense', 100, 'A deleted', now() - interval '2 day', '93000000-0000-0000-0000-000000000001', now() - interval '1 day')`);
    await db.exec(`RESET ROLE; INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id)
      VALUES ('${TX_A_ALIVE}', '${USER_A}', '${ACC_A}', 'expense', 250, 'A alive', now() - interval '1 day', '93000000-0000-0000-0000-000000000002')`);

    // ใส่รายการของ B: 1 แถว soft delete + 1 แถวยังอยู่
    await db.exec(`RESET ROLE; INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id, deleted_at)
      VALUES ('${TX_B_SOFT_DELETE}', '${USER_B}', '${ACC_B}', 'income', 500, 'B deleted', now() - interval '2 day', '93000000-0000-0000-0000-000000000003', now() - interval '1 day')`);
    await db.exec(`RESET ROLE; INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id)
      VALUES ('${TX_B_ALIVE}', '${USER_B}', '${ACC_B}', 'income', 700, 'B alive', now() - interval '1 day', '93000000-0000-0000-0000-000000000004')`);
  });

  after(async () => {
    await db.close();
  });

  describe("ถังขยะ — อ่าน", () => {
    it("user A เห็นแถว soft delete ของตัวเอง (1 แถว)", async () => {
      await setAuth(db, USER_A);
      const r = await db.query(
        "SELECT id FROM transactions WHERE deleted_at IS NOT NULL"
      );
      assert.equal(r.rows.length, 1);
      assert.equal(r.rows[0].id, TX_A_SOFT_DELETE);
      await resetAuth(db);
    });

    it("user B อ่านแถว soft delete ของ A ไม่ได้ (RLS ตัดให้เห็น 0 แถว)", async () => {
      await setAuth(db, USER_B);
      const r = await db.query(
        `SELECT id FROM transactions WHERE deleted_at IS NOT NULL AND id = '${TX_A_SOFT_DELETE}'`
      );
      assert.equal(r.rows.length, 0, "B ต้องถูก RLS ตัดแถว A ออกทั้งหมด");
      await resetAuth(db);
    });
  });

  describe("ถังขยะ — กู้คืน (UPDATE deleted_at = null)", () => {
    it("user B กู้คืนแถวของ A ไม่ได้ — UPDATE แล้วแถวยังอยู่ในถังขยะ", async () => {
      await setAuth(db, USER_B);
      const r = await db.query(
        `UPDATE transactions SET deleted_at = NULL WHERE id = '${TX_A_SOFT_DELETE}' RETURNING id`
      );
      assert.equal(r.rows.length, 0, "B ต้องกู้คืนของ A ไม่ได้ (UPDATE โดน RLS บล็อก)");
      await resetAuth(db);

      const check = await db.query(
        `SELECT deleted_at FROM transactions WHERE id = '${TX_A_SOFT_DELETE}'`
      );
      assert.ok(check.rows[0].deleted_at !== null, "แถวของ A ยัง soft delete อยู่เดิม");
    });

    it("user A กู้คืนแถวของตัวเองได้ แล้วรายการกลับมายังรายการปกติ", async () => {
      // ใส่แถว soft delete เพิ่ม 1 แถวเพื่อเทสต์กู้คืน (ไม่ไปยุ่งกับแถวอื่น)
      await db.exec("RESET ROLE");
      const restoreMe = "91000000-0000-0000-0000-000000000005";
      await db.exec(
        `INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id, deleted_at)
         VALUES ('${restoreMe}', '${USER_A}', '${ACC_A}', 'expense', 150, 'to restore', now(), '93000000-0000-0000-0000-000000000005', now())`
      );

      await setAuth(db, USER_A);
      const r = await db.query(
        `UPDATE transactions SET deleted_at = NULL WHERE id = '${restoreMe}' AND deleted_at IS NOT NULL RETURNING id`
      );
      assert.equal(r.rows.length, 1, "A ต้องกู้คืนของตัวเองได้");

      const alive = await db.query(
        `SELECT id FROM transactions WHERE id = '${restoreMe}' AND deleted_at IS NULL`
      );
      assert.equal(alive.rows.length, 1, "รายการกลับมาในรายการปกติ (deleted_at = null)");
      await resetAuth(db);
    });
  });

  describe("ถังขยะ — ลบถาวร (DELETE จริง)", () => {
    it("user B ลบถาวรแถวของ A ไม่ได้ — DELETE กระทบ 0 แถว", async () => {
      await setAuth(db, USER_B);
      const r = await db.query(
        `DELETE FROM transactions WHERE id = '${TX_A_SOFT_DELETE}' RETURNING id`
      );
      assert.equal(r.rows.length, 0, "B ต้องลบของ A ไม่ได้");
      await resetAuth(db);

      const check = await db.query(
        `SELECT id FROM transactions WHERE id = '${TX_A_SOFT_DELETE}'`
      );
      assert.equal(check.rows.length, 1, "แถวของ A ยังอยู่ครบ");
    });

    it("user A ลบถาวรแถวของตัวเองได้ — แถวหายจริงจาก DB", async () => {
      // ใส่แถว soft delete เพิ่ม 1 แถว เพื่อลบถาวรโดยไม่กระทบเทสต์อื่น
      await db.exec("RESET ROLE");
      const deleteMe = "91000000-0000-0000-0000-000000000006";
      await db.exec(
        `INSERT INTO transactions (id, user_id, account_id, kind, amount, note, occurred_at, client_id, deleted_at)
         VALUES ('${deleteMe}', '${USER_A}', '${ACC_A}', 'expense', 90, 'to purge', now(), '93000000-0000-0000-0000-000000000006', now())`
      );

      await setAuth(db, USER_A);
      const r = await db.query(
        `DELETE FROM transactions WHERE id = '${deleteMe}' RETURNING id`
      );
      assert.equal(r.rows.length, 1);

      const gone = await db.query(
        `SELECT id FROM transactions WHERE id = '${deleteMe}'`
      );
      assert.equal(gone.rows.length, 0, "ลบถาวรแล้วหายจริง (ไม่ใช่แค่ soft delete)");
      await resetAuth(db);
    });
  });

  describe("ส่งออก — query ของ export", () => {
    it("export (deleted_at IS NULL) ไม่รวมแถวที่ soft delete", async () => {
      await setAuth(db, USER_A);
      const r = await db.query(
        `SELECT id, amount FROM transactions WHERE deleted_at IS NULL AND user_id = '${USER_A}'`
      );
      const ids = r.rows.map((row: any) => row.id);
      assert.ok(ids.includes(TX_A_ALIVE), "ต้องเห็นรายการที่ยังใช้งาน");
      assert.ok(!ids.includes(TX_A_SOFT_DELETE), "ต้องไม่รวมรายการในถังขยะ");
      await resetAuth(db);
    });
  });
});
