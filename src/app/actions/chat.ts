"use server";

import { createClient } from "@/lib/supabase/server";
import { listAccountsWithBalances } from "./accounts";
import { formatSatang } from "@/lib/format-satang";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

/** ดึงรายการ Sessions ทั้งหมดของผู้ใช้ */
export async function listChatSessions(): Promise<{
  sessions?: ChatSessionRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };
  return { sessions: (data as ChatSessionRow[]) || [] };
}

/** บันทึกหรืออัปเดต Session การสนทนา */
export async function saveChatSession(
  sessionId: string | null,
  messages: ChatMessage[],
  customTitle?: string
): Promise<{ session?: ChatSessionRow; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  let title = customTitle;
  if (!title) {
    const firstUserMsg = messages.find((m) => m.role === "user");
    title = firstUserMsg
      ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "")
      : "บทสนทนาใหม่";
  }

  if (sessionId) {
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({
        messages,
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return { error: error.message };
    return { session: data as ChatSessionRow };
  } else {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title,
        messages,
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { session: data as ChatSessionRow };
  }
}

/** ลบ Session */
export async function deleteChatSession(sessionId: string): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

const CHAT_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "inclusionai/ling-3.0-flash-vl:free",
];

/** ส่งคำถามให้ JodTang AI Advisor — แยกข้อมูลตาม user.id 100% ผ่าน RLS */
export async function askAiAdvisor(
  messages: ChatMessage[]
): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. ความปลอดภัยขั้นสูงสุด: บังคับเช็คว่าต้องมี user ที่ล็อกอินแล้วเท่านั้น
  if (!user) {
    return { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน AI Chatbot" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      error: "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ในไฟล์ .env.local",
    };
  }

  // 2. ดึงยอดเงินคงเหลือจริงทุกกระเป๋า (คำนวณสดเฉพาะบัญชีของ user คนนี้เท่านั้น)
  const accountsRes = await listAccountsWithBalances();
  const accountBalances = "data" in accountsRes ? accountsRes.data : [];

  let totalBalanceSatang = 0;
  let accountsDetailText = "";

  if (accountBalances.length > 0) {
    for (const acc of accountBalances) {
      totalBalanceSatang += acc.balance;
      accountsDetailText += `  • ${acc.name}: ${formatSatang(acc.balance)}\n`;
    }
  }

  // 3. ดึงรายการล่าสุด 15 รายการ (เฉพาะ user.id ของคนนี้เท่านั้น)
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("kind, amount, occurred_at, note, categories(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(15);

  // 3b. สรุปรายจ่ายตามหมวดหมู่เดือนนี้
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  let transactionsDetailText = "";
  let monthIncomeSatang = 0;
  let monthExpenseSatang = 0;
  const expenseByCat = new Map<string, number>();

  if (recentTx && recentTx.length > 0) {
    for (const tx of recentTx) {
      const cat = (tx.categories as any)?.name || "ทั่วไป";
      const sign = tx.kind === "income" ? "+" : "-";
      if (tx.kind === "income") monthIncomeSatang += tx.amount;
      if (tx.kind === "expense") {
        monthExpenseSatang += tx.amount;
        if (tx.occurred_at >= startOfMonth && tx.occurred_at < endOfMonth) {
          expenseByCat.set(cat, (expenseByCat.get(cat) || 0) + tx.amount);
        }
      }
      transactionsDetailText += `  • [${tx.occurred_at.slice(0, 10)}] ${cat}: ${sign}${formatSatang(tx.amount)}${tx.note ? ` (${tx.note})` : ""}\n`;
    }
  }

  let categorySummaryText = "";
  for (const [cat, total] of expenseByCat.entries()) {
    categorySummaryText += `  • ${cat}: ${formatSatang(total)}\n`;
  }

  // 4. ประกอบ Context ข้อมูลการเงินส่วนตัว
  const financialContext = `
[ข้อมูลสถานะการเงินจริงของคุณในปัจจุบัน]:
- ยอดเงินคงเหลือรวมทุกกระเป๋า: ${formatSatang(totalBalanceSatang)}
- รายละเอียดแต่ละกระเป๋าเงิน:
${accountsDetailText || "  (ยังไม่มีกระเป๋าเงิน)"}
- รายจ่ายเดือนนี้แยกตามหมวด:
${categorySummaryText || "  (ยังไม่มีรายจ่ายเดือนนี้)"}
- รายการใช้จ่ายล่าสุด 15 รายการ:
${transactionsDetailText || "  (ยังไม่มีรายการบันทึก)"}
- สรุป: รายรับรวม ${formatSatang(monthIncomeSatang)}, รายจ่ายรวม ${formatSatang(monthExpenseSatang)}
`.trim();

  const systemInstruction = `คุณคือ 'JodTang AI Advisor' ที่ปรึกษาทางการเงินส่วนบุคคลประจำแอป JodTang
คุณได้รับข้อมูลยอดเงินคงเหลือจริงและรายการใช้จ่ายล่าสุดของผู้ใช้คนนี้โดยตรง ดังนี้:

${financialContext}

แนวทางการตอบ:
1. คุณ "มียอดเงินคงเหลือรวมและยอดแต่ละกระเป๋าของผู้ใช้คนนี้แล้ว" (ห้ามบอกว่าไม่มียอดคงเหลือหรือไม่รู้ยอดเงินเด็ดขาด!)
2. เมื่อผู้ใช้ถามว่า "เงินเหลือเท่าไหร่" ให้ตอบยอดเงินคงเหลือรวมทันที พร้อมแจกแจงตามกระเป๋าเงินได้
3. ตอบอย่างสุภาพ กระชับ เป็นกันเอง และให้คำแนะนำทางการเงินที่สร้างสรรค์เป็นภาษาไทย
4. เมื่อต้องแสดงข้อมูลเปรียบเทียบหรือสรุปหลายรายการ ให้ใช้ Markdown table เสมอ เช่น:

| หมวดหมู่ | ยอดใช้จ่าย | สัดส่วน |
|----------|-----------|--------|
| 🍜 อาหาร | 2,500 ฿ | 35% |
| 🚗 เดินทาง | 800 ฿ | 11% |

5. เมื่อแสดงรายการ ใช้ emoji ประกอบหมวดหมู่ให้สวยงามอ่านง่าย เช่น:
   🍜 อาหาร, 🚗 เดินทาง, 🛒 ช้อปปิ้ง, 💡 บิลและสาธารณูปโภค, 🧴 ของใช้ส่วนตัว, 🎬 บันเทิง, 🏥 สุขภาพ, 📚 การศึกษา, 🏠 ที่อยู่อาศัย, 📦 อื่น ๆ
   💰 เงินเดือน, 🎁 โบนัส, 💼 รายได้เสริม, 🏦 ดอกเบี้ย
6. ถ้าผู้ใช้ถามสรุปรายเดือน ให้สรุปเป็น table พร้อมยอดรวม
7. ให้คำแนะนำเชิงปฏิบัติ (เช่น "ลดค่าอาหารนอกบ้าน 20% จะประหยัดได้ X บาท/เดือน")`;

  const openRouterMessages = [
    { role: "system", content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  let lastErr = "";
  for (const model of CHAT_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://jodtangv1.vercel.app",
          "X-Title": "JodTang AI Advisor",
        },
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
        }),
      });

      if (!res.ok) {
        lastErr = await res.text();
        console.warn(`Chat model ${model} rate-limited (${res.status}), trying next free model...`);
        continue;
      }

      const data = await res.json();
      const replyText =
        data.choices?.[0]?.message?.content || "ขออภัยครับ ไม่สามารถสร้างคำตอบได้";

      return { reply: replyText };
    } catch (err: any) {
      lastErr = err.message;
    }
  }

  return { error: `OpenRouter API Error: ${lastErr}` };
}
