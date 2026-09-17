/**
 * AI Analysis Engine for JodTang
 * ใช้ OpenRouter (google/gemma-4-26b-a4b-it:free) ยิง API จริง 100%
 */

export type AggregatedSummary = {
  totalIncome: number; // satang
  totalExpense: number; // satang
  categories: {
    name: string;
    amount: number; // satang
    percentage: number; // 0 - 100
  }[];
  budgetComparison?: {
    categoryName: string;
    budget: number;
    spent: number;
    percent: number;
  }[];
};

export type AnalysisInsight = {
  title: string;
  description: string;
  type: "warning" | "tip" | "positive";
};

export type AnalysisResult = {
  summary: string;
  model: string;
  insights: AnalysisInsight[];
};

/** สร้าง Payload ปลอดภัยสำหรับการส่งวิเคราะห์ */
export function buildPrivacyPayload(
  monthLabel: string,
  data: AggregatedSummary
): string {
  const incomeBaht = (data.totalIncome / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
  });
  const expenseBaht = (data.totalExpense / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
  });
  const netBaht = ((data.totalIncome - data.totalExpense) / 100).toLocaleString(
    "th-TH",
    { minimumFractionDigits: 2 }
  );

  let text = `ข้อมูลการเงินประจำเดือน ${monthLabel}:\n`;
  text += `- รายรับรวม: ${incomeBaht} บาท\n`;
  text += `- รายจ่ายรวม: ${expenseBaht} บาท\n`;
  text += `- คงเหลือสุทธิ: ${netBaht} บาท\n\n`;

  text += `สัดส่วนรายจ่ายตามหมวดหมู่:\n`;
  for (const cat of data.categories) {
    const catBaht = (cat.amount / 100).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
    });
    text += `- ${cat.name}: ${catBaht} บาท (${cat.percentage.toFixed(1)}%)\n`;
  }

  if (data.budgetComparison && data.budgetComparison.length > 0) {
    text += `\nการเปรียบเทียบงบประมาณที่ตั้งไว้:\n`;
    for (const b of data.budgetComparison) {
      const budgetBaht = (b.budget / 100).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
      });
      const spentBaht = (b.spent / 100).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
      });
      text += `- หมวด ${b.categoryName}: ใช้งบไป ${b.percent.toFixed(0)}% (ใช้ ${spentBaht} / งบ ${budgetBaht} บาท)\n`;
    }
  }

  return text;
}

/** Local Heuristic Helper สำหรับ Unit Tests */
export function runLocalHeuristicAnalysis(
  monthLabel: string,
  data: AggregatedSummary
): AnalysisResult {
  const savingsRate =
    data.totalIncome > 0
      ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
      : 0;

  const topCategory = data.categories?.[0];
  const insights: AnalysisInsight[] = [];

  if (savingsRate >= 20) {
    insights.push({
      title: "สุขภาพการเงินยอดเยี่ยม",
      description: `เดือนนี้คุณมีอัตราการออมคงเหลือ ${savingsRate.toFixed(1)}% ของรายรับ ซึ่งสูงกว่าเกณฑ์มาตรฐาน แนะนำให้นำส่วนที่เหลือไปจัดสรรลงทุน`,
      type: "positive",
    });
  } else if (savingsRate > 0) {
    insights.push({
      title: "มีเงินคงเหลือสุทธิเป็นบวก",
      description: `มีเงินเหลือเก็บ ${savingsRate.toFixed(1)}% ของรายรับ`,
      type: "tip",
    });
  }

  if (topCategory && topCategory.percentage > 40) {
    insights.push({
      title: `ค่าใช้จ่ายหมวด ${topCategory.name} สูงเป็นพิเศษ`,
      description: `หมวด ${topCategory.name} กินสัดส่วนไปถึง ${topCategory.percentage.toFixed(1)}% ของรายจ่ายทั้งหมด`,
      type: "warning",
    });
  }

  if (data.budgetComparison) {
    const exceeded = data.budgetComparison.filter((b) => b.percent >= 100);
    if (exceeded.length > 0) {
      insights.push({
        title: `เกินงบประมาณ ${exceeded.length} หมวด`,
        description: `หมวด ${exceeded.map((e) => e.categoryName).join(", ")} ใช้เงินเกินงบที่ตั้งไว้`,
        type: "warning",
      });
    }
  }

  const netSatang = data.totalIncome - data.totalExpense;
  const netText =
    netSatang >= 0
      ? `คงเหลือเก็บ ${(netSatang / 100).toLocaleString("th-TH")} บาท`
      : `ใช้จ่ายเกินรายรับ ${(Math.abs(netSatang) / 100).toLocaleString("th-TH")} บาท`;

  const summary = `สรุปภาพรวมเดือน ${monthLabel}: รายรับ ${(data.totalIncome / 100).toLocaleString("th-TH")} บาท, รายจ่าย ${(data.totalExpense / 100).toLocaleString("th-TH")} บาท (${netText}).`;

  return {
    summary,
    model: "jodtang-heuristic-v1 (local)",
    insights,
  };
}

// รายชื่อโมเดลฟรีที่รองรับบทวิเคราะห์
const ANALYSIS_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "inclusionai/ling-3.0-flash-vl:free",
];

async function analyzeWithOpenRouter(
  prompt: string,
  apiKey: string
): Promise<AnalysisResult> {
  let lastError = "";

  for (const model of ANALYSIS_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://jodtangv1.vercel.app",
          "X-Title": "JodTang Finance",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        lastError = `${model}: ${err}`;
        continue;
      }

      const json = await res.json();
      let rawText = json.choices?.[0]?.message?.content || "";
      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText);
      return {
        summary: parsed.summary || "",
        model: `${model} (OpenRouter)`,
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      };
    } catch (err: any) {
      lastError = err.message;
    }
  }

  throw new Error(`OpenRouter Error: ${lastError}`);
}

/** วิเคราะห์รายจ่าย — ยิง API OpenRouter จริง 100% */
export async function analyzeSpending(
  monthLabel: string,
  data: AggregatedSummary
): Promise<AnalysisResult> {
  const prompt = `คุณคือผู้เชี่ยวชาญด้านวางแผนการเงินส่วนบุคคล ให้วิเคราะห์สรุปข้อมูลการเงินต่อไปนี้เป็นภาษาไทย กระชับ มีประโยชน์ จริงใจ:\n\n${buildPrivacyPayload(monthLabel, data)}\n\nตอบในรูปแบบ JSON เท่านั้น:\n{\n  "summary": "ข้อความสรุปภาพรวม 2-3 ประโยค",\n  "insights": [\n    {"title": "หัวข้อข้อคิดเห็น", "description": "คำอธิบายและคำแนะนำ", "type": "warning" | "tip" | "positive"}\n  ]\n}`;

  const openRouterKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!openRouterKey) {
    throw new Error("ยังไม่ได้ตั้งค่า API Key สำหรับ AI (OPENROUTER_API_KEY หรือ AI_API_KEY)");
  }

  return await analyzeWithOpenRouter(prompt, openRouterKey);
}
