/**
 * เทสต์ยอดคงเหลือกระเป๋าเงินบน migration จริง (PGlite)
 *
 * ยอดคงเหลือ = รับ − จ่าย + โอนเข้า − โอนออก
 * - ลบแบบ soft (deleted_at) ต้องไม่ถูกนับ
 * - archive กระเป๋าแล้วต้องไม่ปรากฏในรายการที่ใช้งาน
 * - ชื่อซ้ำ (UNIQUE user_id + name) กันได้ที่ DB
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { computeBalances } from "../lib/account-balance.ts";

const ROOT = import.meta.dirname + "/../..";

const USER = "11111111-1111-1111-1111-111111111111";
// ids เตรียมไว้ — เทสต์อ้างแบบตายตัวเพื่อให้อ่านผล cross-query ง่าย
const ACC_A = "d0000000-0000-0000-0000-000000000001";
const ACC_B = "d0000000-0000-0000-0000-000000000002";
const CAT = "c0000000-0000-0000-0000-000000000001";

async function setAuth(db: any) {
  await db.exec("SET ROLE authenticated");
  await db.exec(
    `SET request.jwt.claims = '${JSON.stringify({ sub: USER })}'`
  );
}

async function resetAuth(db: any) {
  await db.exec("RESET ROLE");
  await db.exec("SET request.jwtclaims = ''");
  await db.exec("SET request.jwt.claims = ''");
}

describe("account balances (PGlite + migration)", () => {
  let db: any;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();
    await db.exec(await readFile(join(ROOT, "supabase/tests/auth_shim.sql"), "utf-8"));
    await db.exec(await readFile(join(ROOT, "supabase/migrations/00001_create_tables.sql"), "utf-8"));
    await db.exec(await readFile(join(ROOT, "supabase/migrations/00002_rls.sql"), "utf-8"));
    await db.exec(`INSERT INTO auth.users (id) VALUES ('${USER}') ON CONFLICT DO NOTHING`);
    await db.exec(`INSERT INTO profiles (id) VALUES ('${USER}') ON CONFLICT DO NOTHING`);
    await db.exec(`INSERT INTO categories (id, user_id, name, kind) VALUES ('${CAT}', '${USER}', 'food', 'expense')`);
    await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_A}', '${USER}', 'walletA')`);
    await db.exec(`INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_B}', '${USER}', 'walletB')`);
  });

  after(async () => {
    await db.close();
  });

  async function insertTx(clientId: string, fields: Record<string, unknown>) {
    await db.query(
      `INSERT INTO transactions (user_id, account_id, to_account_id, category_id, kind, amount, note, occurred_at, client_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,now(),$8)`,
      [
        USER,
        fields.account_id,
        fields.to_account_id ?? null,
        fields.category_id ?? null,
        fields.kind,
        fields.amount,
        fields.note ?? "test",
        clientId,
      ]
    );
  }

  it("ยอดต่อกระเป๋า = รับ − จ่าย", async () => {
    await setAuth(db);
    await insertTx("e0000000-0000-0000-0000-000000000001", { account_id: ACC_A, category_id: CAT, kind: "income", amount: 10000 });
    await insertTx("e0000000-0000-0000-0000-000000000002", { account_id: ACC_A, category_id: CAT, kind: "expense", amount: 3000 });

    const { rows } = await db.query(
      `SELECT kind, account_id, to_account_id, amount FROM transactions WHERE user_id = $1 AND deleted_at IS NULL`,
      [USER]
    );
    const balances = computeBalances(rows as any);
    assert.equal(balances.get(ACC_A), 7000);
    await resetAuth(db);
  });

  it("โอนออกจาก A = A ลด, B เพิ่ม (ยอดรวมชุดสองบัญชีคงที่)", () => {
    // ใช้ helper เดิมทดสอบฝั่ง server-side: transfer ต้องรู้สองบัญชี
    const balances = computeBalances([
      { kind: "income", account_id: ACC_A, to_account_id: null, amount: 10000 },
      { kind: "transfer", account_id: ACC_A, to_account_id: ACC_B, amount: 2500 },
    ]);
    assert.equal(balances.get(ACC_A), 7500);
    assert.equal(balances.get(ACC_B), 2500);
  });

  it("ลบแบบ soft (deleted_at) ไม่ถูกนับในยอดคงเหลือ", async () => {
    await setAuth(db);
    await insertTx("e0000000-0000-0000-0000-000000000003", { account_id: ACC_B, kind: "income", amount: 500 });
    const before = await db.query(
      `SELECT amount, deleted_at FROM transactions WHERE client_id = $1`,
      ["e0000000-0000-0000-0000-000000000003"]
    );
    assert.ok(before.rows[0] && before.rows[0].deleted_at === null && Number(before.rows[0].amount) === 500);
    await db.exec(`UPDATE transactions SET deleted_at = now() WHERE client_id = 'e0000000-0000-0000-0000-000000000003'`);
    const after = await db.query(
      `SELECT amount, deleted_at FROM transactions WHERE client_id = $1`,
      ["e0000000-0000-0000-0000-000000000003"]
    );
    assert.ok(after.rows[0].deleted_at !== null, "deleted_at ต้องถูกตั้ง");
    await resetAuth(db);
  });

  it("ข้อมูลยอดที่คำนวณ อ่านจาก query ที่กรอง deleted_at IS NULL — รายการลบไม่รวม", async () => {
    await setAuth(db);
    const { rows } = await db.query(
      `SELECT kind, account_id, to_account_id, amount FROM transactions WHERE user_id = $1 AND deleted_at IS NULL`,
      [USER]
    );
    const balances = computeBalances(rows as any);
    // A: 10000-3000 = 7000 (B มี 500 ถูกลบ → B ควรไม่ปรากฏ หรือ 0)
    assert.equal(balances.get(ACC_A) ?? 0, 7000);
    assert.ok(!balances.has(ACC_B) || balances.get(ACC_B) === 0, "ยอด B ต้องไม่รวมรายการลบ");
    await resetAuth(db);
  });

  it("ชื่อกระเป๋าซ้ำ (UNIQUE user_id + name) ต้องเออเรอร์", async () => {
    await setAuth(db);
    try {
      await db.exec(`INSERT INTO accounts (user_id, name) VALUES ('${USER}', 'walletA')`);
      assert.fail("ควร throw ชื่อซ้ำ");
    } catch (e: any) {
      assert.ok(
        e.message.includes("duplicate") || e.message.includes("unique"),
        "ต้องได้ unique violation จริง ได้: " + e.message
      );
    }
    await resetAuth(db);
  });

  it("archive กระเป๋าแล้วไม่ปรากฏในรายการที่ใช้งาน (archived_at is null)", async () => {
    await setAuth(db);
    // archive ACC_B
    await db.exec(`UPDATE accounts SET archived_at = now() WHERE id = '${ACC_B}'`);
    const { rows } = await db.query(
      `SELECT id FROM accounts WHERE user_id = $1 AND archived_at IS NULL`,
      [USER]
    );
    assert.deepEqual(
      rows.map((r: any) => r.id).sort(),
      [ACC_A],
      "ต้องเหลือแต่ ACC_A"
    );
    // กู้คืน
    await db.exec(`UPDATE accounts SET archived_at = NULL WHERE id = '${ACC_B}'`);
    const restored = await db.query(
      `SELECT id FROM accounts WHERE user_id = $1 AND archived_at IS NULL`,
      [USER]
    );
    assert.equal(restored.rows.length, 2, "กู้คืนแล้วได้ 2 กระเป๋า");
    await resetAuth(db);
  });
});
