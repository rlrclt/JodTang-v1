import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

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

const USER_A = "aaaa1111-1111-1111-1111-111111111111";
const ACC_WALLET = "a0000001-0000-0000-0000-000000000001";
const ACC_BANK = "a0000002-0000-0000-0000-000000000002";
const CAT_FOOD = "c0000001-0000-0000-0000-000000000001";
const CAT_SALARY = "c0000002-0000-0000-0000-000000000002";

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

async function ensureUser(db: any, userId: string) {
  await db.exec("RESET ROLE");
  await db.exec(
    `INSERT INTO auth.users (id) VALUES ('${userId}') ON CONFLICT DO NOTHING`
  );
  await db.exec(
    `INSERT INTO profiles (id) VALUES ('${userId}') ON CONFLICT DO NOTHING`
  );
}

/** สร้าง test data: 15 transactions ในเดือนกันยายน 2026 */
async function seedTransactions(db: any) {
  await db.exec("RESET ROLE");

  await db.exec(
    `INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_WALLET}', '${USER_A}', 'wallet') ON CONFLICT DO NOTHING`
  );
  await db.exec(
    `INSERT INTO accounts (id, user_id, name) VALUES ('${ACC_BANK}', '${USER_A}', 'bank') ON CONFLICT DO NOTHING`
  );
  await db.exec(
    `INSERT INTO categories (id, user_id, name, kind) VALUES ('${CAT_FOOD}', '${USER_A}', 'food', 'expense') ON CONFLICT DO NOTHING`
  );
  await db.exec(
    `INSERT INTO categories (id, user_id, name, kind) VALUES ('${CAT_SALARY}', '${USER_A}', 'salary', 'income') ON CONFLICT DO NOTHING`
  );

  // 15 transactions: Sep 1-15 2026, 1 per day
  for (let day = 1; day <= 15; day++) {
    const dd = String(day).padStart(2, "0");
    const occurredAt = `2026-09-${dd}T12:00:00Z`;
    const kind = day <= 10 ? "expense" : "income";
    const category = kind === "expense" ? CAT_FOOD : CAT_SALARY;
    const amount = day * 1000;
    const note = `item-${dd}`;
    const clientId = `00000000-0000-0000-0000-${dd.padStart(12, "0")}`;
    const account = day % 2 === 1 ? ACC_WALLET : ACC_BANK;

    await db.exec(
      `INSERT INTO transactions (user_id, account_id, category_id, kind, amount, note, occurred_at, client_id)
       VALUES ('${USER_A}', '${account}', '${category}', '${kind}', ${amount}, '${note}', '${occurredAt}', '${clientId}')`
    );
  }
}

describe("Keyset pagination on transactions", () => {
  let db: any;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();
    await loadMigrations(db);
    await ensureUser(db, USER_A);
    await seedTransactions(db);
  });

  after(async () => {
    await db.close();
  });

  it("first page returns correct number of items (limit 5)", async () => {
    await setAuth(db, USER_A);
    const result = await db.query(
      `SELECT id, occurred_at, note, kind, amount
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY occurred_at DESC, id DESC
       LIMIT 6`,
      [USER_A]
    );
    assert.equal(result.rows.length, 6, "should return 6 rows (5 + 1 for hasMore)");
    await resetAuth(db);
  });

  it("returns items in descending occurred_at order", async () => {
    await setAuth(db, USER_A);
    const result = await db.query(
      `SELECT occurred_at::text as occurred_at, note
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY occurred_at DESC, id DESC`,
      [USER_A]
    );
    for (let i = 1; i < result.rows.length; i++) {
      assert.ok(
        result.rows[i - 1].occurred_at >= result.rows[i].occurred_at,
        `row ${i - 1} should be >= row ${i}`
      );
    }
    assert.equal(result.rows.length, 15, "total 15 items");
    await resetAuth(db);
  });

  it("keyset cursor returns next page without overlap", async () => {
    await setAuth(db, USER_A);

    const page1 = await db.query(
      `SELECT id, occurred_at::text as occurred_at, note
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY occurred_at DESC, id DESC
       LIMIT 6`,
      [USER_A]
    );
    const page1Items = page1.rows.slice(0, 5);
    const lastItem = page1.rows[4];

    const page2 = await db.query(
      `SELECT id, occurred_at::text as occurred_at, note
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND (
           occurred_at < $2
           OR (occurred_at = $2 AND id < $3)
         )
       ORDER BY occurred_at DESC, id DESC
       LIMIT 6`,
      [USER_A, lastItem.occurred_at, lastItem.id]
    );

    const page1Ids = new Set(page1Items.map((r: any) => r.id));
    for (const row of page2.rows) {
      assert.ok(!page1Ids.has(row.id), `item ${row.id} should not overlap`);
    }
    // Page 2: Sep 10-5 (6 items, since Sep 10 is same occurred_at as cursor day but different id)
    assert.equal(page2.rows.length, 6, "page 2 should have 6 items (Sep 10-5)");
    await resetAuth(db);
  });

  it("no duplicate items across all pages", async () => {
    await setAuth(db, USER_A);
    const allIds = new Set<string>();
    let cursor: { occurred_at: string; id: string } | null = null;

    for (let page = 0; page < 5; page++) {
      let sql: string;
      let params: any[];

      if (!cursor) {
        sql = `SELECT id, occurred_at::text as occurred_at
               FROM transactions
               WHERE user_id = $1 AND deleted_at IS NULL
               ORDER BY occurred_at DESC, id DESC
               LIMIT 6`;
        params = [USER_A];
      } else {
        sql = `SELECT id, occurred_at::text as occurred_at
               FROM transactions
               WHERE user_id = $1 AND deleted_at IS NULL
                 AND (
                   occurred_at < $2
                   OR (occurred_at = $2 AND id < $3)
                 )
               ORDER BY occurred_at DESC, id DESC
               LIMIT 6`;
        params = [USER_A, cursor.occurred_at, cursor.id];
      }

      const result = await db.query(sql, params);
      const items = result.rows.slice(0, 5);

      for (const item of items) {
        assert.ok(!allIds.has(item.id), `duplicate ${item.id} on page ${page}`);
        allIds.add(item.id);
      }

      if (result.rows.length <= 5) break;
      const lastItem = result.rows[items.length - 1];
      cursor = { occurred_at: lastItem.occurred_at, id: lastItem.id };
    }

    assert.equal(allIds.size, 15, "exactly 15 unique items");
    await resetAuth(db);
  });

  it("keyset with occurred_at range filter", async () => {
    await setAuth(db, USER_A);

    const result = await db.query(
      `SELECT occurred_at::text as occurred_at, note
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND occurred_at >= '2026-09-05T00:00:00Z'
         AND occurred_at < '2026-09-11T00:00:00Z'
       ORDER BY occurred_at DESC, id DESC`,
      [USER_A]
    );

    assert.equal(result.rows.length, 6, "6 items in range Sep 5-10");
    for (const row of result.rows) {
      assert.ok(row.note >= "item-05" && row.note <= "item-10",
        `${row.note} should be in range`);
    }
    await resetAuth(db);
  });

  it("filters by kind", async () => {
    await setAuth(db, USER_A);

    const expenses = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND kind = 'expense'`,
      [USER_A]
    );
    assert.equal(Number(expenses.rows[0].cnt), 10, "10 expenses");

    const incomes = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND kind = 'income'`,
      [USER_A]
    );
    assert.equal(Number(incomes.rows[0].cnt), 5, "5 incomes");
    await resetAuth(db);
  });

  it("filters by account_id", async () => {
    await setAuth(db, USER_A);

    const acc1 = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND account_id = $2`,
      [USER_A, ACC_WALLET]
    );
    assert.equal(Number(acc1.rows[0].cnt), 8, "8 items in wallet (odd days)");

    const acc2 = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND account_id = $2`,
      [USER_A, ACC_BANK]
    );
    assert.equal(Number(acc2.rows[0].cnt), 7, "7 items in bank (even days)");
    await resetAuth(db);
  });

  it("filters by category_id", async () => {
    await setAuth(db, USER_A);

    const food = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND category_id = $2`,
      [USER_A, CAT_FOOD]
    );
    assert.equal(Number(food.rows[0].cnt), 10, "10 food items");
    await resetAuth(db);
  });

  it("searches by note text", async () => {
    await setAuth(db, USER_A);

    const result = await db.query(
      `SELECT note FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL AND note ILIKE '%item-01%'`,
      [USER_A]
    );
    assert.equal(result.rows.length, 1, "find item-01");
    assert.equal(result.rows[0].note, "item-01");
    await resetAuth(db);
  });

  it("balance = income - expense", async () => {
    await setAuth(db, USER_A);

    const result = await db.query(
      `SELECT
         SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END) as total_expense
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
         AND occurred_at >= '2026-09-01T00:00:00Z'
         AND occurred_at < '2026-10-01T00:00:00Z'`,
      [USER_A]
    );
    // income: 11000+12000+13000+14000+15000 = 65000
    // expense: 1000+2000+...+10000 = 55000
    assert.equal(Number(result.rows[0].total_income), 65000);
    assert.equal(Number(result.rows[0].total_expense), 55000);
    await resetAuth(db);
  });

  it("soft-deleted items excluded", async () => {
    await setAuth(db, USER_A);

    await db.exec(
      `UPDATE transactions SET deleted_at = now() WHERE client_id = '00000000-0000-0000-0000-000000000001'`
    );

    const result = await db.query(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [USER_A]
    );
    assert.equal(Number(result.rows[0].cnt), 14, "14 after soft delete");

    await db.exec(
      `UPDATE transactions SET deleted_at = NULL WHERE client_id = '00000000-0000-0000-0000-000000000001'`
    );
    await resetAuth(db);
  });
});
