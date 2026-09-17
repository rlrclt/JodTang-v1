/**
 * AI Analysis Engine for JodTang
 *
 * Privacy Rules (PLAN.md §7):
 * - ส่งเฉพาะยอดรวมรายหมวดหมู่ และยอดรวมรายรับ/รายจ่ายประจำเดือน
 * - ไม่ส่งชื่อกระเป๋าเงิน บันทึกส่วนตัว (Note) หรือข้อมูลระบุตัวตน
 * - ถ้าระบบไม่มี API Key -> วิเคราะห์ด้วย Heuristic Engine อัจฉริยะ (ไม่พัง ไม่เงียบ)
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

/** สร้าง Payload ปลอดภัยสำหรับการส่งวิเคราะห์ (เฉพาะยอดรวม ไม่ส่ง note/account) */
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

/** Local Heuristic Engine — ใช้เมื่อไม่ได้ใส่ API Key จากภายนอก */
export function runLocalHeuristicAnalysis(
  monthLabel: string,
  data: AggregatedSummary
): AnalysisResult {
  const savingsRate =
    data.totalIncome > 0
      ? ((data.totalIncome - data.totalExpense) / data.totalIncome) * 100
      : 0;

  const topCategory = data.categories[0];
  const insights: AnalysisResult["insights"] = [];

  // วิเคราะห์อัตราการออม
  if (savingsRate >= 20) {
    insights.push({
      title: "สุขภาพการเงินยอดเยี่ยม",
      description: `เดือนนี้คุณมีอัตราการออมคงเหลือ ${savingsRate.toFixed(1)}% ของรายรับ ซึ่งสูงกว่าเกณฑ์มาตรฐาน 20% แนะนำให้นำส่วนที่เหลือไปจัดสรรลงทุน`,
      type: "positive",
    });
  } else if (savingsRate > 0) {
    insights.push({
      title: "มีเงินคงเหลือสุทธิเป็นบวก",
      description: `มีเงินเหลือเก็บ ${savingsRate.toFixed(1)}% ของรายรับ หากต้องการเพิ่มเงินออม แนะนำให้ลองลดค่าใช้จ่ายในหมวดที่มีสัดส่วนสูงสุด`,
      type: "tip",
    });
  } else if (data.totalExpense > data.totalIncome && data.totalIncome > 0) {
    insights.push({
      title: "รายจ่ายเกินรายรับ (ติดลบ)",
      description: `เดือนนี้รายจ่ายรวมสูงกว่ารายรับ ${Math.abs(savingsRate).toFixed(1)}% ควรระมัดระวังการใช้จ่ายในหมวดหมู่ที่ไม่จำเป็น`,
      type: "warning",
    });
  }

  // วิเคราะห์หมวดหมู่ที่ใช้เงินมากที่สุด
  if (topCategory && topCategory.percentage > 40) {
    insights.push({
      title: `ค่าใช้จ่ายหมวด ${topCategory.name} สูงเป็นพิเศษ`,
      description: `หมวด ${topCategory.name} กินสัดส่วนไปถึง ${topCategory.percentage.toFixed(1)}% ของรายจ่ายทั้งหมด ควรพิจารณากำหนดงบประมาณเพื่อควบคุม`,
      type: "warning",
    });
  } else if (topCategory) {
    insights.push({
      title: `หมวดที่ใช้มากที่สุดคือ ${topCategory.name}`,
      description: `คิดเป็นสัดส่วน ${topCategory.percentage.toFixed(1)}% ของรายจ่ายทั้งหมดในเดือนนี้`,
      type: "tip",
    });
  }

  // วิเคราะห์งบประมาณ
  if (data.budgetComparison) {
    const exceeded = data.budgetComparison.filter((b) => b.percent >= 100);
    const warned = data.budgetComparison.filter(
      (b) => b.percent >= 80 && b.percent < 100
    );

    if (exceeded.length > 0) {
      insights.push({
        title: `เกินงบประมาณ ${exceeded.length} หมวด`,
        description: `หมวด ${exceeded.map((e) => e.categoryName).join(", ")} ใช้เงินเกินงบที่ตั้งไว้`,
        type: "warning",
      });
    } else if (warned.length > 0) {
      insights.push({
        title: `ใกล้ถึงเพดานงบ ${warned.length} หมวด`,
        description: `หมวด ${warned.map((w) => w.categoryName).join(", ")} ใช้ไปเกิน 80% ของงบแล้ว`,
        type: "tip",
      });
    }
  }

  const netSatang = data.totalIncome - data.totalExpense;
  const netText =
    netSatang >= 0
      ? `คงเหลือเก็บ ${(netSatang / 100).toLocaleString("th-TH")} บาท`
      : `ใช้จ่ายเกินรายรับ ${(Math.abs(netSatang) / 100).toLocaleString("th-TH")} บาท`;

  const summary = `สรุปภาพรวมเดือน ${monthLabel}: รายรับ ${(data.totalIncome / 100).toLocaleString("th-TH")} บาท, รายจ่าย ${(data.totalExpense / 100).toLocaleString("th-TH")} บาท (${netText}). หมวดที่มีการใช้จ่ายสูงสุดคือ ${topCategory ? `${topCategory.name} (${(topCategory.amount / 100).toLocaleString("th-TH")} บาท)` : "ยังไม่มีข้อมูล"}.`;

  return {
    summary,
    model: "jodtang-heuristic-v1 (local)",
    insights,
  };
}

/** เรียก AI Analysis จริงผ่าน Gemini/OpenAI API (บังคับต้องมี API Key ไม่มี Fallback) */
export async function analyzeSpending(
  monthLabel: string,
  data: AggregatedSummary
): Promise<AnalysisResult> {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("ยังไม่ได้ตั้งค่า API Key สำหรับ AI (AI_API_KEY หรือ GEMINI_API_KEY)");
  }

  const prompt = `คุณคือผู้เชี่ยวชาญด้านวางแผนการเงินส่วนบุคคล ให้วิเคราะห์สรุปข้อมูลการเงินต่อไปนี้เป็นภาษาไทย กระชับ มีประโยชน์ จริงใจ:\n\n${buildPrivacyPayload(monthLabel, data)}\n\nตอบในรูปแบบ JSON:\n{\n  "summary": "ข้อความสรุปภาพรวม 2-3 ประโยค",\n  "insights": [\n    {"title": "หัวข้อข้อคิดเห็น", "description": "คำอธิบายและคำแนะนำ", "type": "warning" | "tip" | "positive"}\n  ]\n}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API Error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("AI ตอบกลับมาไม่ถูกต้องหรือว่างเปล่า");
  }

  const parsed = JSON.parse(rawText);
  return {
    summary: parsed.summary || "",
    model: "gemini-2.0-flash",
    insights: parsed.insights || [],
  };
}
