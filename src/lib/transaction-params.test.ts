import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseTransactionParams,
  buildTransactionParams,
  type TransactionFilters,
} from "./transaction-params.ts";

describe("parseTransactionParams", () => {
  it("returns defaults for empty searchParams", () => {
    const result = parseTransactionParams(new URLSearchParams());
    assert.equal(result.month, null);
    assert.equal(result.year, null);
    assert.equal(result.filters.date_from, undefined);
    assert.equal(result.filters.date_to, undefined);
    assert.equal(result.filters.kind, undefined);
    assert.equal(result.filters.category_id, undefined);
    assert.equal(result.filters.account_id, undefined);
    assert.equal(result.filters.search, undefined);
  });

  it("parses month and year from URL", () => {
    const params = new URLSearchParams({ month: "9", year: "2026" });
    const result = parseTransactionParams(params);
    assert.equal(result.month, 9);
    assert.equal(result.year, 2026);
  });

  it("parses all filter params", () => {
    const params = new URLSearchParams({
      kind: "expense",
      category_id: "cat-1",
      account_id: "acc-1",
      search: "coffee",
      date_from: "2026-09-01",
      date_to: "2026-09-30",
    });
    const result = parseTransactionParams(params);
    assert.equal(result.filters.kind, "expense");
    assert.equal(result.filters.category_id, "cat-1");
    assert.equal(result.filters.account_id, "acc-1");
    assert.equal(result.filters.search, "coffee");
    assert.equal(result.filters.date_from, "2026-09-01");
    assert.equal(result.filters.date_to, "2026-09-30");
  });

  it("ignores invalid kind values", () => {
    const params = new URLSearchParams({ kind: "invalid" });
    const result = parseTransactionParams(params);
    assert.equal(result.filters.kind, undefined);
  });

  it("ignores invalid month values", () => {
    const params = new URLSearchParams({ month: "13" });
    const result = parseTransactionParams(params);
    assert.equal(result.month, null);
  });

  it("ignores invalid year values", () => {
    const params = new URLSearchParams({ year: "abc" });
    const result = parseTransactionParams(params);
    assert.equal(result.year, null);
  });

  it("trims whitespace from search", () => {
    const params = new URLSearchParams({ search: "  coffee  " });
    const result = parseTransactionParams(params);
    assert.equal(result.filters.search, "coffee");
  });

  it("returns undefined search for empty string", () => {
    const params = new URLSearchParams({ search: "" });
    const result = parseTransactionParams(params);
    assert.equal(result.filters.search, undefined);
  });
});

describe("buildTransactionParams", () => {
  it("builds empty params from defaults", () => {
    const result = buildTransactionParams({});
    assert.equal(result.toString(), "");
  });

  it("builds params with month/year", () => {
    const result = buildTransactionParams({ month: 9, year: 2026 });
    assert.equal(result.get("month"), "9");
    assert.equal(result.get("year"), "2026");
  });

  it("builds params with filters", () => {
    const filters: TransactionFilters = {
      kind: "expense",
      category_id: "cat-1",
      search: "coffee",
    };
    const result = buildTransactionParams({ filters });
    assert.equal(result.get("kind"), "expense");
    assert.equal(result.get("category_id"), "cat-1");
    assert.equal(result.get("search"), "coffee");
  });

  it("omits undefined filter values", () => {
    const filters: TransactionFilters = { kind: "income" };
    const result = buildTransactionParams({ filters });
    assert.equal(result.get("category_id"), null);
    assert.equal(result.get("account_id"), null);
  });

  it("roundtrips parseTransactionParams ↔ buildTransactionParams", () => {
    const original = new URLSearchParams({
      month: "9",
      year: "2026",
      kind: "expense",
      category_id: "cat-1",
      search: "coffee",
    });
    const parsed = parseTransactionParams(original);
    const rebuilt = buildTransactionParams({
      month: parsed.month ?? undefined,
      year: parsed.year ?? undefined,
      filters: parsed.filters,
    });
    // Roundtrip should produce same params (order may differ)
    for (const [key, value] of original.entries()) {
      assert.equal(rebuilt.get(key), value, `param ${key} should roundtrip`);
    }
  });
});
