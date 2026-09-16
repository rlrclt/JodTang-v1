import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("PGlite", () => {
  it("stores and retrieves bigint values correctly", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite();

    await db.exec("CREATE TABLE t (amount bigint)");
    await db.exec("INSERT INTO t (amount) VALUES (12345)");

    const result = await db.query<{ amount: number }>("SELECT amount FROM t");
    assert.equal(result.rows.length, 1);
    // PGlite returns numeric bigint as JS number
    assert.equal(result.rows[0].amount, 12345);

    await db.close();
  });
});
