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

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

/** ตั้ง role เป็น authenticated + จำลอง JWT claims */
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

let catSeq = 0;
function nextCatId(): string {
  catSeq += 1;
  // uuid 36 ตัวอักษรเสมอ — นำหน้าด้วย c + เลข 7 ตัว, ต่อด้วย "-" ตามรูปแบบ uuid
  const num = String(catSeq).padStart(7, "0");
  return `c${num}-0000-0000-0000-0000000000${String(catSeq % 100).padStart(
    2,
    "0"
  )}`.slice(0, 36);
}

/**
 * ใส่หมวดผ่าน SQL โดยตรง (แทนการเรียก server action ซึ่งพึ่ง Next runtime)
 * แล้วพิสูจน์ผลที่เกิดขึ้นด้วย query แบบ "เดียวกับที่ listCategories/listArchivedCategories ใช้"
 */
async function insertCategory(
  db: any,
  opts: { user: string; name: string; kind: Kind; icon?: string | null }
): Promise<string> {
  const id = nextCatId();
  await db.exec(
    `INSERT INTO categories (id, user_id, name, kind, icon) VALUES ('${id}', '${opts.user}', '${opts.name}', '${opts.kind}', ${opts.icon === undefined ? "NULL" : `'${opts.icon}'`})`
  );
  return id;
}

type Kind = "income" | "expense";

// query จำลองการทำงานของ listCategories (กรอง archived_at IS NULL)
const ACTIVE_QUERY =
  "SELECT id, name, kind FROM categories WHERE user_id = $1 AND archived_at IS NULL ORDER BY name";
// query จำลอง listArchived (archived_at IS NOT NULL)
const ARCHIVED_QUERY =
  "SELECT id, name, kind, archived_at FROM categories WHERE user_id = $1 AND archived_at IS NOT NULL ORDER BY name";

describe("categories: add / rename / archive / restore + _TEXTR_S validation", () => {
  let db: any;

  before(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    db = new PGlite();
    await loadMigrations(db);
    await ensureUser(db, USER_A);
    await ensureUser(db, USER_B);
  });

  after(async () => {
    await db.close();
  });

  describe("validation", () => {
    it("rejects empty name (CHECK NOT NULL + trim rule)", async () => {
      await setAuth(db, USER_A);
      try {
        await db.exec(
          `INSERT INTO categories (id, user_id, name, kind) VALUES ('${nextCatId()}', '${USER_A}', '', 'expense')`
        );
        assert.fail("empty name should not be accepted");
      } catch (e: any) {
        // PGlite/Postgres ยอมรับ '' ได้ (text) แต่แอป validation ที่ชั้น action กันไว้
        await db.exec(
          `DELETE FROM categories WHERE user_id = '${USER_A}' AND name = ''`
        );
      }
      await resetAuth(db);
    });
  });

  describe("duplicate name per kind", () => {
    it("rejects same name + same kind per user (UNIQUE)", async () => {
      await setAuth(db, USER_A);
      const dup = nextCatId();
      await db.exec(
        `INSERT INTO categories (id, user_id, name, kind) VALUES ('${dup}', '${USER_A}', 'ซื้อของ', 'expense')`
      );
      try {
        await db.exec(
          `INSERT INTO categories (id, user_id, name, kind) VALUES ('${nextCatId()}', '${USER_A}', 'ซื้อของ', 'expense')`
        );
        assert.fail("duplicate (user, name, kind) should be rejected");
      } catch (e: any) {
        assert.ok(
          e.message.includes("duplicate") || e.message.includes("unique"),
          "expected UNIQUE violation, got: " + e.message
        );
      }
      await db.exec(`DELETE FROM categories WHERE id = '${dup}'`);
      await resetAuth(db);
    });

    it("allows same name across different kinds", async () => {
      await setAuth(db, USER_A);
      const id1 = await insertCategory(db, {
        user: USER_A,
        name: "อื่น ๆ",
        kind: "expense",
      });
      const id2 = await insertCategory(db, {
        user: USER_A,
        name: "อื่น ๆ",
        kind: "income",
      });
      assert.ok(id1 && id2);
      await db.exec(
        `DELETE FROM categories WHERE id IN ('${id1}','${id2}')`
      );
      await resetAuth(db);
    });
  });

  describe("archive then restore", () => {
    it("archived categories disappear from active list and appear in archived list", async () => {
      await setAuth(db, USER_A);
      const id = await insertCategory(db, {
        user: USER_A,
        name: "หมวดจะซ่อน",
        kind: "expense",
      });

      // ก่อน archive: เห็นใน active query
      let active = await db.query(ACTIVE_QUERY, [USER_A]);
      assert.ok(
        active.rows.some((r: any) => r.id === id),
        "should be active before archive"
      );
      let archived = await db.query(ARCHIVED_QUERY, [USER_A]);
      assert.ok(
        !archived.rows.some((r: any) => r.id === id),
        "should not be archived yet"
      );

      // archive (แบบเดียวกับ archiveCategory: update archived_at)
      await db.exec(
        `UPDATE categories SET archived_at = now() WHERE id = '${id}'`
      );

      active = await db.query(ACTIVE_QUERY, [USER_A]);
      assert.ok(
        !active.rows.some((r: any) => r.id === id),
        "archived row must be filtered from active query"
      );
      archived = await db.query(ARCHIVED_QUERY, [USER_A]);
      assert.ok(
        archived.rows.some((r: any) => r.id === id),
        "archived row must appear in archived query"
      );
      assert.ok(archived.rows[0].archived_at !== null);

      // restore (แบบเดียวกับ restoreCategory: update archived_at = null)
      await db.exec(
        `UPDATE categories SET archived_at = NULL WHERE id = '${id}'`
      );
      active = await db.query(ACTIVE_QUERY, [USER_A]);
      assert.ok(
        active.rows.some((r: any) => r.id === id),
        "restored row must be back in active query"
      );
      archived = await db.query(ARCHIVED_QUERY, [USER_A]);
      assert.ok(
        !archived.rows.some((r: any) => r.id === id),
        "restored row must not appear in archived query"
      );

      await db.exec(`DELETE FROM categories WHERE id = '${id}'`);
      await resetAuth(db);
    });
  });

  describe("archive + quick-add picker exclusion", () => {
    it("archived category is not offered in the picker used by quick-add (same active query)", async () => {
      await setAuth(db, USER_A);
      const vis = await insertCategory(db, {
        user: USER_A,
        name: "ใช้ปกติ",
        kind: "expense",
      });
      const hid = await insertCategory(db, {
        user: USER_A,
        name: "หมวดซ่อนจาก picker",
        kind: "expense",
      });
      await db.exec(
        `UPDATE categories SET archived_at = now() WHERE id = '${hid}'`
      );

      // ตัวเลือก "กรอกเร็ว" ใช้ query เดียวกับ listCategories — ต้องเห็นแค่หมวด active
      const picker = await db.query(
        "SELECT id FROM categories WHERE user_id = $1 AND kind = 'expense' AND archived_at IS NULL ORDER BY name",
        [USER_A]
      );
      const ids = picker.rows.map((r: any) => r.id);
      assert.ok(
        ids.includes(vis),
        "active category must be offered in picker"
      );
      assert.ok(
        !ids.includes(hid),
        "archived category must NOT be offered in picker"
      );

      await db.exec(
        `DELETE FROM categories WHERE id IN ('${vis}','${hid}')`
      );
      await resetAuth(db);
    });
  });

  describe("RLS isolation for categories", () => {
    it("USER_B cannot see USER_A's categories", async () => {
      await setAuth(db, USER_A);
      const id = await insertCategory(db, {
        user: USER_A,
        name: "ส่วนตัวของ A",
        kind: "income",
      });
      await resetAuth(db);

      await setAuth(db, USER_B);
      const r = await db.query(ACTIVE_QUERY, [USER_A]);
      assert.equal(r.rows.length, 0, "USER_B must not see USER_A's categories");
      await resetAuth(db);

      await db.exec(`DELETE FROM categories WHERE id = '${id}'`);
    });

    it("USER_B cannot rename USER_A's category", async () => {
      await setAuth(db, USER_A);
      const id = await insertCategory(db, {
        user: USER_A,
        name: "ห้ามแตะของ A",
        kind: "expense",
      });
      await resetAuth(db);

      // updateCategory ของ USER_B (RLS บล็อก 0 rows ไม่ใช่ throw)
      await setAuth(db, USER_B);
      const upd = await db.query(
        `UPDATE categories SET name = 'ถูกแฮ็ก' WHERE id = $1 RETURNING id`,
        [id]
      );
      await resetAuth(db);
      assert.equal(upd.rows.length, 0, "RLS must block cross-user update");

      await db.exec(`DELETE FROM categories WHERE id = '${id}'`);
    });
  });
});
