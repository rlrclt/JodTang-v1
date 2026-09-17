import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPrivacyPayload,
  runLocalHeuristicAnalysis,
  analyzeSpending,
} from "./analyze.ts";

describe("AI Analysis Engine (Privacy & Heuristics)", () => {
  const sampleData = {
    totalIncome: 5000000, // 50,000 baht
    totalExpense: 3000000, // 30,000 baht
    categories: [
      { name: "อาหาร", amount: 1500000, percentage: 50 },
      { name: "เดินทาง", amount: 1000000, percentage: 33.33 },
      { name: "ช้อปปิ้ง", amount: 500000, percentage: 16.67 },
    ],
    budgetComparison: [
      { categoryName: "อาหาร", budget: 1200000, spent: 1500000, percent: 125 },
      { categoryName: "เดินทาง", budget: 1000000, spent: 1000000, percent: 100 },
    ],
  };

  it("buildPrivacyPayload includes only aggregated amounts without notes or account names", () => {
    const payload = buildPrivacyPayload("กันยายน 2569", sampleData);
    assert.ok(payload.includes("กันยายน 2569"));
    assert.ok(payload.includes("50,000.00"));
    assert.ok(payload.includes("30,000.00"));
    assert.ok(payload.includes("อาหาร"));
    assert.ok(payload.includes("50.0%"));
    assert.ok(payload.includes("125%"));
    // Must NOT contain personal note indicators
    assert.ok(!payload.includes("wallet"));
    assert.ok(!payload.includes("account_id"));
  });

  it("runLocalHeuristicAnalysis produces positive and warning insights accurately", () => {
    const result = runLocalHeuristicAnalysis("กันยายน 2569", sampleData);
    assert.ok(result.summary.includes("กันยายน 2569"));
    assert.ok(result.summary.includes("50,000"));
    assert.ok(result.summary.includes("30,000"));
    assert.ok(result.insights.length >= 2);

    // Savings rate is (50k - 30k)/50k = 40% >= 20%
    const hasSavingsInsight = result.insights.some((i) =>
      i.title.includes("สุขภาพการเงินยอดเยี่ยม")
    );
    assert.ok(hasSavingsInsight, "ควรมี insight สุขภาพการเงินยอดเยี่ยม");

    // Food is 50% > 40%
    const hasFoodWarning = result.insights.some((i) =>
      i.title.includes("อาหาร") && i.type === "warning"
    );
    assert.ok(hasFoodWarning, "ควรเตือนหมวดอาหารที่เกิน 40%");

    // Budget exceeded
    const hasBudgetWarning = result.insights.some((i) =>
      i.title.includes("เกินงบประมาณ")
    );
    assert.ok(hasBudgetWarning, "ควรเตือนเกินงบประมาณ");
  });

  it("analyzeSpending throws error when no API key is provided", async () => {
    // Ensure API keys are cleared for this test
    const oldAiKey = process.env.AI_API_KEY;
    const oldGeminiKey = process.env.GEMINI_API_KEY;
    const oldOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await assert.rejects(
      async () => {
        await analyzeSpending("กันยายน 2569", sampleData);
      },
      /ยังไม่ได้ตั้งค่า API Key/
    );

    if (oldAiKey) process.env.AI_API_KEY = oldAiKey;
    if (oldGeminiKey) process.env.GEMINI_API_KEY = oldGeminiKey;
    if (oldOpenAiKey) process.env.OPENAI_API_KEY = oldOpenAiKey;
  });
});
