import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCategoryExpenses,
  computeSixMonthTrend,
  computeBudgetProgress,
} from "./summary-helpers.ts";

// ─── Mock data ───

const tx = (
  kind: "income" | "expense" | "transfer",
  amount: number,
  catId?: string,
  catName?: string,
  icon: string | null = null
) => ({
  id: catId ?? "00000000-0000-0000-0000-000000000000",
  kind,
  amount,
  category_id: catId ?? null,
  occurred_at: "2026-09-15T05:00:00.000Z",
  categories: catId
    ? { id: catId, name: catName ?? "cat", icon }
    : null,
});

const budget = (catId: string, catName: string, amount: number) => ({
  category_id: catId,
  amount,
  categories: { id: catId, name: catName, icon: null },
});

// ─── computeCategoryExpenses ───

describe("computeCategoryExpenses", () => {
  it("sums expense amounts per category", () => {
    const result = computeCategoryExpenses([
      tx("expense", 1000, "c1", "อาหาร"),
      tx("expense", 500, "c1", "อาหาร"),
      tx("expense", 2000, "c2", "ขนส่ง"),
    ]);
    assert.equal(result.length, 2);
    assert.equal(result[0].category_id, "c2"); // เรียงมาก → น้อย
    assert.equal(result[0].total, 2000);
    assert.equal(result[1].total, 1500);
  });
  it("preserves the icon stored on the category", () => {
    const result = computeCategoryExpenses([
      tx("expense", 1000, "c1", "มื้อกลางวัน", "utensils#tomato"),
    ]);
    assert.equal(result[0].icon, "utensils#tomato");
  });

  it("ignores income and transfer", () => {
    const result = computeCategoryExpenses([
      tx("income", 5000, "c1", "เงินเดือน"),
      tx("transfer", 1000, "c1", "โอน"),
      tx("expense", 300, "c2", "อาหาร"),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].total, 300);
  });

  it("skips transactions without category", () => {
    const result = computeCategoryExpenses([
      tx("expense", 500), // ไม่มี category
      tx("expense", 200, "c1", "อาหาร"),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].total, 200);
  });

  it("returns empty for no expenses", () => {
    const result = computeCategoryExpenses([
      tx("income", 1000, "c1", "เงินเดือน"),
    ]);
    assert.equal(result.length, 0);
  });

  it("handles single category", () => {
    const result = computeCategoryExpenses([
      tx("expense", 100, "c1", "อาหาร"),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, "อาหาร");
    assert.equal(result[0].total, 100);
  });
});

// ─── computeSixMonthTrend ───

describe("computeSixMonthTrend", () => {
  it("returns 6 items", () => {
    const result = computeSixMonthTrend([], 2026, 9);
    assert.equal(result.length, 6);
  });

  it("labels are Thai month abbreviations", () => {
    const result = computeSixMonthTrend([], 2026, 9);
    assert.equal(result[0].label, "เม.ย.");
    assert.equal(result[5].label, "ก.ย.");
  });

  it("sums income and expense per month", () => {
    // ก.ย. = month 9 = idx 5
    // Sept 15 2026 12:00 Bangkok = Sept 15 05:00 UTC
    const result = computeSixMonthTrend(
      [
        { ...tx("income", 30000, "c1", "เงินเดือน"), occurred_at: "2026-09-15T05:00:00.000Z" },
        { ...tx("expense", 10000, "c2", "อาหาร"), occurred_at: "2026-09-10T05:00:00.000Z" },
        { ...tx("expense", 5000, "c3", "ขนส่ง"), occurred_at: "2026-09-05T05:00:00.000Z" },
      ],
      2026,
      9
    );

    assert.equal(result[5].income, 30000);
    assert.equal(result[5].expense, 15000);
  });

  it("fills zero for months with no transactions", () => {
    const result = computeSixMonthTrend([], 2026, 9);
    for (const m of result) {
      assert.equal(m.income, 0);
      assert.equal(m.expense, 0);
    }
  });

  it("handles year boundary (Jan)", () => {
    const result = computeSixMonthTrend([], 2026, 1);
    // 6 เดือน: ส.ค. - ธ.ค. 2025 → ม.ค. 2026
    assert.equal(result[0].label, "ส.ค.");
    assert.equal(result[0].year, 2025);
    assert.equal(result[5].label, "ม.ค.");
    assert.equal(result[5].year, 2026);
  });
});

// ─── computeBudgetProgress ───

describe("computeBudgetProgress", () => {
  it("computes percentage correctly", () => {
    const result = computeBudgetProgress(
      [tx("expense", 8000, "c1", "อาหาร")],
      [budget("c1", "อาหาร", 10000)]
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].percentage, 80);
  });

  it("warns when percentage >= 80", () => {
    const result = computeBudgetProgress(
      [tx("expense", 9000, "c1", "อาหาร")],
      [budget("c1", "อาหาร", 10000)]
    );
    assert.ok(result[0].percentage >= 80, "should be >= 80%");
  });

  it("over budget (percentage > 100)", () => {
    const result = computeBudgetProgress(
      [tx("expense", 15000, "c1", "อาหาร")],
      [budget("c1", "อาหาร", 10000)]
    );
    assert.equal(result[0].percentage, 150);
  });

  it("skips budgets with amount <= 0", () => {
    const result = computeBudgetProgress(
      [tx("expense", 500, "c1", "อาหาร")],
      [budget("c1", "อาหาร", 0)]
    );
    assert.equal(result.length, 0);
  });

  it("shows 0% when no spending", () => {
    const result = computeBudgetProgress(
      [],
      [budget("c1", "อาหาร", 10000)]
    );
    assert.equal(result[0].percentage, 0);
  });

  it("ignores income transactions", () => {
    const result = computeBudgetProgress(
      [tx("income", 5000, "c1", "เงินเดือน")],
      [budget("c1", "เงินเดือน", 10000)]
    );
    assert.equal(result[0].percentage, 0);
  });

  it("sorts by percentage descending", () => {
    const result = computeBudgetProgress(
      [
        tx("expense", 3000, "c1", "อาหาร"),
        tx("expense", 9000, "c2", "ขนส่ง"),
      ],
      [
        budget("c1", "อาหาร", 10000),
        budget("c2", "ขนส่ง", 10000),
      ]
    );
    assert.equal(result[0].percentage, 90);
    assert.equal(result[1].percentage, 30);
  });
});

// ─── Summary integration ───

describe("summary computation integration", () => {
  it("empty input produces empty results", () => {
    const expenses = computeCategoryExpenses([]);
    const trend = computeSixMonthTrend([], 2026, 9);
    const budget = computeBudgetProgress([], []);
    assert.equal(expenses.length, 0);
    assert.equal(trend.length, 6);
    assert.equal(budget.length, 0);
  });

  it("matches amounts across categories and budgets", () => {
    const transactions = [
      tx("expense", 5000, "c1", "อาหาร"),
      tx("expense", 3000, "c2", "ขนส่ง"),
      tx("income", 20000, "c3", "เงินเดือน"),
    ];
    const budgets = [
      budget("c1", "อาหาร", 8000),
      budget("c2", "ขนส่ง", 4000),
    ];

    const expenses = computeCategoryExpenses(transactions);
    const progress = computeBudgetProgress(transactions, budgets);

    // อาหาร: 5000/8000 = 62.5% → round 63
    assert.equal(progress[0].name, "ขนส่ง");
    assert.equal(progress[0].percentage, 75);
    assert.equal(progress[1].name, "อาหาร");
    assert.equal(progress[1].percentage, 63);
  });
});
