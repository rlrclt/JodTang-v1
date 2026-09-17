"use server";

import { createClient } from "@/lib/supabase/server";
import { getSummaryData } from "@/app/actions/summary";
import {
  computeCategoryExpenses,
  computeBudgetProgress,
} from "@/lib/summary-helpers";
import {
  analyzeSpending,
  type AnalysisResult,
  type AggregatedSummary,
} from "@/lib/ai/analyze";
import { getMonthRange } from "@/lib/date";

export type AiAnalysisRow = {
  id: string;
  user_id: string;
  period_from: string;
  period_to: string;
  summary: string;
  raw_response: AnalysisResult | null;
  model: string | null;
  created_at: string;
};

type ActionResult<T> = { data: T } | { error: string };

/** ดึงผลการวิเคราะห์ล่าสุดของเดือนที่ระบุ */
export async function getSavedAnalysis(
  periodFrom: string,
  periodTo: string
): Promise<ActionResult<AiAnalysisRow | null>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("period_from", periodFrom)
    .eq("period_to", periodTo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: data as AiAnalysisRow | null };
}

/** สั่งให้ AI วิเคราะห์รายจ่ายประจำเดือน */
export async function requestAiAnalysis(
  year: number,
  month: number,
  monthLabel: string
): Promise<ActionResult<AnalysisResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { start, end } = getMonthRange(year, month);
  const periodFrom = start.slice(0, 10);
  const periodTo = end.slice(0, 10);

  const summaryData = await getSummaryData(year, month);

  // คำนวณสรุป
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of summaryData.transactions) {
    if (t.kind === "income") totalIncome += t.amount;
    else if (t.kind === "expense") totalExpense += t.amount;
  }

  const categoryExpenses = computeCategoryExpenses(summaryData.transactions);
  const budgetProgress = computeBudgetProgress(
    summaryData.transactions,
    summaryData.budgets
  );

  const aggregated: AggregatedSummary = {
    totalIncome,
    totalExpense,
    categories: categoryExpenses.map((c) => ({
      name: c.name,
      amount: c.total,
      percentage: totalExpense > 0 ? (c.total / totalExpense) * 100 : 0,
    })),
    budgetComparison: budgetProgress.map((b) => ({
      categoryName: b.name,
      budget: b.budget,
      spent: b.spent,
      percent: b.percentage,
    })),
  };

  const analysisResult = await analyzeSpending(monthLabel, aggregated);

  // บันทึกลงตาราง ai_analyses
  await supabase.from("ai_analyses").insert({
    user_id: user.id,
    period_from: periodFrom,
    period_to: periodTo,
    summary: analysisResult.summary,
    raw_response: analysisResult,
    model: analysisResult.model,
  });

  return { data: analysisResult };
}
