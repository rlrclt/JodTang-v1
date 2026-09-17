import { createClient } from "@supabase/supabase-js";
import { formatSatang } from "@/lib/format-satang";
import { computeBalances } from "@/lib/account-balance";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const CHAT_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "inclusionai/ling-3.0-flash-vl:free",
];

/**
 * ถาม AI Advisor ผ่าน LINE แชท
 * ดึงยอดเงินและรายการล่าสุดเฉพาะของ user คนนั้นผ่าน profile.id 100%
 */
export async function askLineAiAdvisor(
  userId: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return "⚠️ ระบบ AI ยังไม่ได้ตั้งค่า API Key กรุณาติดต่อแอดมินครับ";
  }

  const supabase = getAdmin();

  // 1. ดึงกระเป๋าเงินและคำนวณยอดคงเหลือสด (เฉพาะ user คนนี้เท่านั้น)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .eq("user_id", userId)
    .is("archived_at", null);

  const { data: txs } = await supabase
    .from("transactions")
    .select("kind, account_id, to_account_id, amount")
    .eq("user_id", userId)
    .is("deleted_at", null);

  const balances = computeBalances(
    (txs ?? []).map((tx: any) => ({
      kind: tx.kind,
      account_id: tx.account_id,
      to_account_id: tx.to_account_id ?? null,
      amount: String(tx.amount),
    }))
  );

  let totalBalanceSatang = 0;
  let accountsDetailText = "";

  if (accounts && accounts.length > 0) {
    for (const acc of accounts) {
      const b = balances.get(acc.id) ?? 0;
      totalBalanceSatang += b;
      accountsDetailText += `  • ${acc.name}: ${formatSatang(b)}\n`;
    }
  }

  // 2. ดึงรายการล่าสุด 10 รายการ (เฉพาะ user คนนี้เท่านั้น)
  const { data: recentTx } = await supabase
    .from("transactions")
    .select("kind, amount, occurred_at, note, categories(name)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(10);

  let transactionsDetailText = "";
  if (recentTx && recentTx.length > 0) {
    for (const tx of recentTx) {
      const cat = (tx.categories as any)?.name || "ทั่วไป";
      const sign = tx.kind === "income" ? "+" : "-";
      transactionsDetailText += `  • [${tx.occurred_at.slice(0, 10)}] ${cat}: ${sign}${formatSatang(tx.amount)}${tx.note ? ` (${tx.note})` : ""}\n`;
    }
  }

  const financialContext = `
[ข้อมูลสถานะการเงินจริงของคุณในปัจจุบัน]:
- ยอดเงินคงเหลือรวมทุกกระเป๋า: ${formatSatang(totalBalanceSatang)}
- รายละเอียดแต่ละกระเป๋าเงิน:
${accountsDetailText || "  (ยังไม่มีกระเป๋าเงิน)"}
- รายการใช้จ่ายล่าสุด 10 รายการ:
${transactionsDetailText || "  (ยังไม่มีรายการบันทึก)"}
`.trim();

  const systemInstruction = `คุณคือ 'JodTang AI Advisor' ผู้ช่วยการเงินส่วนบุคคลในแชท LINE
คุณได้รับข้อมูลสถานะการเงินจริงของผู้ใช้คนนี้โดยตรง:

${financialContext}

แนวทางการตอบใน LINE:
1. คุณ "รู้ยอดเงินคงเหลือรวมและยอดแต่ละกระเป๋าของผู้ใช้คนนี้แล้ว" (ห้ามบอกว่าไม่รู้หรือไม่มียอดเงินเด็ดขาด!)
2. เมื่อผู้ใช้ถามว่า "เงินเหลือเท่าไหร่", "สรุปยอดให้หน่อย", "มีเงินเท่าไหร่" ให้ตอบยอดเงินคงเหลือรวมทันที พร้อมแจกแจงตามกระเป๋า
3. ตอบภาษาไทย กระชับ เป็นกันเอง ใช้ Emoji ให้น่ารักอ่านง่าย เหมาะกับหน้าจอแชท LINE (ไม่ตอบยาวเป็นบทความ)`;

  const openRouterMessages = [
    { role: "system", content: systemInstruction },
    { role: "user", content: userMessage },
  ];

  for (const model of CHAT_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://jodtangv1.vercel.app",
          "X-Title": "JodTang LINE Bot AI",
        },
        body: JSON.stringify({
          model,
          messages: openRouterMessages,
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const replyText = data.choices?.[0]?.message?.content;
      if (replyText) return replyText;
    } catch {
      continue;
    }
  }

  return "ขออภัยครับ ขณะนี้ระบบ AI ไม่สามารถตอบกลับได้ชั่วคราว กรุณาลองใหม่อีกครั้งครับ";
}
