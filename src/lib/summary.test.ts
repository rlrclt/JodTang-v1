import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeSummary, type SummaryInput } from "./summary.ts";

describe("computeSummary", () => {
  it("returns 0 for empty array", () => {
    const s = computeSummary([]);
    assert.equal(s.income, 0);
    assert.equal(s.expense, 0);
    assert.equal(s.balance, 0);
  });

  it("computes income and expense correctly", () => {
    const s = computeSummary([
      { kind: "income", amount: 50000 },
      { kind: "income", amount: 30000 },
      { kind: "expense", amount: 20000 },
      { kind: "expense", amount: 10000 },
    ]);
    assert.equal(s.income, 80000);
    assert.equal(s.expense, 30000);
    assert.equal(s.balance, 50000);
  });

  it("ignores transfers in summary", () => {
    const s = computeSummary([
      { kind: "income", amount: 10000 },
      { kind: "transfer", amount: 5000 },
      { kind: "expense", amount: 3000 },
    ]);
    assert.equal(s.income, 10000);
    assert.equal(s.expense, 3000);
    assert.equal(s.balance, 7000);
  });

  it("handles bigint-style amounts (satang)", () => {
    // 100000 satang = 1000 baht
    const s = computeSummary([
      { kind: "income", amount: 100000 },
      { kind: "expense", amount: 50000 },
    ]);
    assert.equal(s.income, 100000);
    assert.equal(s.expense, 50000);
    assert.equal(s.balance, 50000);
  });

  it("handles negative balance", () => {
    const s = computeSummary([
      { kind: "income", amount: 1000 },
      { kind: "expense", amount: 5000 },
    ]);
    assert.equal(s.balance, -4000);
  });
});

describe("crypto.randomUUID", () => {
  it("generates valid UUID format", () => {
    const id = crypto.randomUUID();
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id),
      `Invalid UUID: ${id}`
    );
  });
});
