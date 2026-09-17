/**
 * AI Analysis Engine for JodTang
 * ใช้ OpenRouter API จริง 100% (ไม่มี Offline Fallback)
 * รองรับโมเดล OpenRouter พร้อม Auto-Retry ข้ามโมเดลฟรีเมื่อติด Rate Limit (429)
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

export type AnalysisResult = {
  summary: string;
  model: string;
  insights: {
    title: string;
    description: string;
    type: "warning" | "tip" | "positive";
  }[];
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

// รายชื่อโมเดลฟรีที่รองรับบทวิเคราะห์ (เรียงลำดับความฉลาด)
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
        console.warn(`Model ${model} failed (${res.status}), trying next model...`);
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

/** วิเคราะห์รายจ่าย — ยิง API OpenRouter จริงเท่านั้น 100% */
export async function analyzeSpending(
  monthLabel: string,
  data: AggregatedSummary
): Promise<AnalysisResult> {
  const prompt = `คุณคือผู้เชี่ยวชาญด้านวางแผนการเงินส่วนบุคคล ให้วิเคราะห์สรุปข้อมูลการเงินต่อไปนี้เป็นภาษาไทย กระชับ มีประโยชน์ จริงใจ:\n\n${buildPrivacyPayload(monthLabel, data)}\n\nตอบในรูปแบบ JSON เท่านั้น (ห้ามมีคำนำหรือ markdown อื่น):\n{\n  "summary": "ข้อความสรุปภาพรวม 2-3 ประโยค",\n  "insights": [\n    {"title": "หัวข้อข้อคิดเห็น", "description": "คำอธิบายและคำแนะนำ", "type": "warning" | "tip" | "positive"}\n  ]\n}`;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    throw new Error("ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ในไฟล์ .env.local ครับ");
  }

  return await analyzeWithOpenRouter(prompt, openRouterKey);
}
