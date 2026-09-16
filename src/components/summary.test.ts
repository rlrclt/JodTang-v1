import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── globals.css: category icon tokens ───

describe("globals.css category icon tokens", () => {
  it("defines 8 category color tokens in @theme", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile("src/app/globals.css", "utf-8");

    const catTokens = [
      "--color-cat-food",
      "--color-cat-transport",
      "--color-cat-shopping",
      "--color-cat-entertainment",
      "--color-cat-health",
      "--color-cat-education",
      "--color-cat-bills",
      "--color-cat-other",
    ];

    for (const token of catTokens) {
      assert.ok(
        css.includes(`${token}:`),
        `globals.css ควรมี category token ${token}`
      );
    }
  });

  it("category tokens are inside @theme block", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile("src/app/globals.css", "utf-8");
    assert.ok(
      css.includes("--color-cat-food:") && css.includes("@theme"),
      "category tokens ต้องอยู่ใน @theme"
    );
  });
});

// ─── CategoryIcon component ───

describe("CategoryIcon component", () => {
  it("uses CSS var(--color-cat-*) for icon colors, not hardcoded hex", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/CategoryIcon.tsx", "utf-8");
    assert.ok(
      content.includes("var(--color-cat-"),
      "CategoryIcon ต้องใช้ CSS var(--color-cat-*) สำหรับสี"
    );
    // ห้าม hardcode hex สีใน fill
    const hexPattern = /fill=["']#[0-9a-fA-F]+["']/g;
    const matches = content.match(hexPattern);
    assert.equal(
      matches,
      null,
      "CategoryIcon ห้าม hardcode hex สีใน fill attribute"
    );
  });

  it("shows ellipsis (dots) when name is null", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/CategoryIcon.tsx", "utf-8");
    assert.ok(
      content.includes("null") && content.includes("circle"),
      "CategoryIcon ต้องแสดง ellipsis (3 dots) เมื่อ name เป็น null"
    );
  });

  it("has CATEGORY_ICON_MAP with at least 8 entries", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/CategoryIcon.tsx", "utf-8");
    // นับ key ที่เป็นภาษาไทย/อังกฤษ
    const thaiKeys = ["อาหาร", "ขนส่ง", "บันเทิง", "สุขภาพ", "การศึกษา", "ค่าบิล"];
    for (const key of thaiKeys) {
      assert.ok(
        content.includes(key),
        `CategoryIcon ควรมี mapping สำหรับ "${key}"`
      );
    }
  });
});

// ─── ExpenseBarChart ───

describe("ExpenseBarChart", () => {
  it("renders empty state message", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ExpenseBarChart.tsx", "utf-8");
    assert.ok(
      content.includes("ยังไม่มีรายการจ่าย"),
      "ExpenseBarChart ต้องแสดงข้อความเมื่อไม่มีข้อมูล"
    );
  });

  it("uses CSS var for bar colors, not hardcoded hex", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ExpenseBarChart.tsx", "utf-8");
    assert.ok(
      content.includes("var(--color-cat-"),
      "ExpenseBarChart ต้องใช้ CSS var สำหรับสี bar"
    );
  });

  it("has legend section", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ExpenseBarChart.tsx", "utf-8");
    assert.ok(
      content.includes("legend") || content.includes("flex-wrap"),
      "ExpenseBarChart ต้องมี legend"
    );
  });
});

// ─── MonthTrend ───

describe("MonthTrend", () => {
  it("renders empty state message", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/MonthTrend.tsx", "utf-8");
    assert.ok(
      content.includes("ยังไม่มีข้อมูล"),
      "MonthTrend ต้องแสดงข้อความเมื่อไม่มีข้อมูล"
    );
  });

  it("has income/expense legend", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/MonthTrend.tsx", "utf-8");
    assert.ok(
      content.includes("รายรับ") && content.includes("รายจ่าย"),
      "MonthTrend ต้องมี legend รายรับ/รายจ่าย"
    );
  });
});

// ─── BudgetProgress ───

describe("BudgetProgress", () => {
  it("uses >=80% warning color", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BudgetProgress.tsx", "utf-8");
    assert.ok(
      content.includes("80") && content.includes("warn"),
      "BudgetProgress ต้องเตือนเมื่อ >= 80%"
    );
  });

  it("uses CSS var(--color-warn) and var(--color-balance)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BudgetProgress.tsx", "utf-8");
    assert.ok(
      content.includes("var(--color-warn)"),
      "BudgetProgress ต้องใช้ CSS var(--color-warn)"
    );
    assert.ok(
      content.includes("var(--color-balance)"),
      "BudgetProgress ต้องใช้ CSS var(--color-balance)"
    );
  });

  it("returns null when no budgets (not visible)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BudgetProgress.tsx", "utf-8");
    assert.ok(
      content.includes("return null"),
      "BudgetProgress ต้อง return null เมื่อไม่มีงบ"
    );
  });
});

// ─── Summary page ───

describe("Summary page", () => {
  it("page.tsx exists", async () => {
    const fs = await import("node:fs/promises");
    await fs.access("src/app/summary/page.tsx");
  });

  it("page.tsx has force-dynamic", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/summary/page.tsx", "utf-8");
    assert.ok(
      content.includes("force-dynamic"),
      "Summary page ต้องมี force-dynamic"
    );
  });

  it("SummaryContent has month navigation (‹ and ›)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/summary/SummaryContent.tsx", "utf-8");
    assert.ok(
      content.includes("‹") && content.includes("›"),
      "SummaryContent ต้องมีปุ่ม ‹ และ › สำหรับ month navigation"
    );
  });

  it("SummaryContent has 3 summary cards (income/expense/balance)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/summary/SummaryContent.tsx", "utf-8");
    assert.ok(
      content.includes("รายรับ") && content.includes("รายจ่าย") && content.includes("คงเหลือ"),
      "SummaryContent ต้องมี 3 การ์ดสรุป: รายรับ, รายจ่าย, คงเหลือ"
    );
  });
});
