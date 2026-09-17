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
];

export type ActionIntentResult = {
  action: "record" | "edit" | "query";
  // สำหรับ record
  kind?: "income" | "expense";
  amount?: number; // สตางค์
  category?: string;
  note?: string;
  // สำหรับ edit
  target_hint?: string; // ข้อความอ้างอิงรายการ เช่น "รายการล่าสุด", "ค่าข้าว", "ค่าไฟ"
  new_amount?: number; // สตางค์
  new_category?: string;
  new_note?: string;
  // สำหรับ query (คำถาม)
  answer?: string;
};

/**
 * 1. ฟังก์ชันแยกแยะเจตนา (Intent Parser) แบบประหยัด Token สูงสุด
 * ใช้ Prompt สั้นกระชับ ตอบ JSON สั้นเท่านั้น
 */
async function parseUserIntentWithAI(
  userText: string,
  financialContext: string,
  apiKey: string
): Promise<ActionIntentResult> {
  const systemPrompt = `Analyze user financial text. Output raw JSON only.
Context:
${financialContext}

Rules:
1. If user wants to RECORD (e.g. "กินข้าว 60", "จ่ายค่าไฟ 1200", "ได้เงิน 5000"):
{"action":"record","kind":"expense"|"income","amount":<satang_integer>,"category":"<category_name>","note":"<short_note>"}
Note: 1 baht = 100 satang (e.g. 60 baht -> 6000).

2. If user wants to EDIT/CORRECT (e.g. "แก้รายการล่าสุดเป็น 70", "เปลี่ยนค่าข้าวเป็น 80", "แก้หมวดเป็นเดินทาง"):
{"action":"edit","target_hint":"<ref>","new_amount":<satang_or_null>,"new_category":"<cat_or_null>","new_note":"<note_or_null>"}

3. If user ASKS question (e.g. "เงินเหลือเท่าไหร่", "งบบิลเหลือเท่าไหร่"):
{"action":"query","answer":"<concise_direct_thai_answer_with_emojis_no_fluff>"}
`;

  for (const model of CHAT_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://jodtangv1.vercel.app",
          "X-Title": "JodTang AI Intent",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userText },
          ],
          temperature: 0.1, // นิ่ง ไม่เพ้อเจ้อ ตอบสั้น
          max_tokens: 300,  // จำกัด Token ประหยัดสูงสุด
        }),
      });

      if (!res.ok) continue;

      const json = await res.json();
      let rawText = json.choices?.[0]?.message?.content || "";
      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText);
      return parsed;
    } catch {
      continue;
    }
  }

  return { action: "query", answer: "ขออภัยครับ ไม่สามารถประมวลผลคำสั่งได้ในขณะนี้" };
}

/**
 * 2. ประมวลผลข้อความจากผู้ใช้ใน LINE Bot:
 * รองรับ: 1) สั่งจดรายการ 2) สั่งแก้ไขรายการ 3) ถามยอด/ปรึกษา
 */
export async function processLineUserMessage(
  userId: string,
  userText: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return "⚠️ ระบบ AI ยังไม่ได้ตั้งค่า API Key กรุณาติดต่อแอดมินครับ";
  }

  const supabase = getAdmin();

  // ดึงข้อมูลบริบทอย่างกระชับ (Token Optimized)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .is("archived_at", null);

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, kind, account_id, to_account_id, amount, occurred_at, category_id, note")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });

  const defaultAccount = accounts?.[0];
  if (!defaultAccount) {
    return "❌ ยังไม่มีกระเป๋าเงินในระบบ กรุณาเข้าเว็บไปสร้างกระเป๋าเงินก่อนครับ";
  }

  // คำนวณยอดเงินคงเหลือ
  const balances = computeBalances(
    (txs ?? []).map((t: any) => ({
      kind: t.kind,
      account_id: t.account_id,
      to_account_id: t.to_account_id ?? null,
      amount: String(t.amount),
    }))
  );

  let totalBalance = 0;
  for (const acc of accounts || []) {
    totalBalance += balances.get(acc.id) ?? 0;
  }

  // ดึงงบประมาณเดือนนี้
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const currentPeriod = `${year}-${month}-01`;

  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount, categories(id, name)")
    .eq("user_id", userId)
    .eq("period_month", currentPeriod);

  // คำนวณยอดใช้จริงเดือนนี้
  const startOfMonth = new Date(year, now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(year, now.getMonth() + 1, 1).toISOString();
  const currentMonthTxs = (txs ?? []).filter(
    (t: any) => t.occurred_at >= startOfMonth && t.occurred_at < endOfMonth
  );

  let budgetContext = "";
  if (budgets && budgets.length > 0) {
    for (const b of budgets) {
      const catName = (b.categories as any)?.name || "";
      const catId = (b.categories as any)?.id;
      const bAmt = Number(b.amount) || 0;
      const spent = currentMonthTxs
        .filter((t: any) => t.kind === "expense" && t.category_id === catId)
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      budgetContext += `[งบ ${catName}: ${formatSatang(bAmt)} / ใช้ไป ${formatSatang(spent)} / เหลือ ${formatSatang(bAmt - spent)}]\n`;
    }
  }

  // รายการล่าสุด 5 รายการ (สำหรับใช้แก้ไข)
  const recent5 = (txs ?? []).slice(0, 5);
  let recentContext = "";
  for (const t of recent5) {
    recentContext += `[ID: ${t.id} | ${t.kind === "income" ? "+" : "-"}${formatSatang(t.amount)} | ${t.note || "ไม่มีโน้ต"}]\n`;
  }

  const compactContext = `
ยอดคงเหลือรวม: ${formatSatang(totalBalance)}
งบประมาณ:
${budgetContext || "ยังไม่ตั้งงบ"}
5 รายการล่าสุด:
${recentContext || "ไม่มีรายการ"}
`.trim();

  // ส่งให้ AI ประเมินเจตนา
  const intent = await parseUserIntentWithAI(userText, compactContext, apiKey);

  // ----------------------------------------------------
  // ACTION 1: บันทึกรายการใหม่ (RECORD)
  // ----------------------------------------------------
  if (intent.action === "record" && intent.amount && intent.amount > 0) {
    const kind = intent.kind || "expense";
    const amount = intent.amount;
    const note = intent.note || (kind === "income" ? "รายรับ" : "รายจ่าย");

    // ดึง categories มาจับคู่
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)
      .eq("kind", kind);

    const matchedCat =
      categories?.find((c) => c.name === intent.category) ||
      categories?.find((c) => c.name.includes(intent.category || "")) ||
      categories?.find((c) => c.name === "อื่น ๆ") ||
      categories?.[0];

    const { error: insErr } = await supabase.from("transactions").insert({
      user_id: userId,
      account_id: defaultAccount.id,
      category_id: matchedCat?.id || null,
      kind,
      amount,
      note: `[บอทพิมพ์] ${note}`,
      occurred_at: new Date().toISOString(),
      client_id: crypto.randomUUID(),
    });

    if (insErr) {
      return `❌ บันทึกไม่สำเร็จ: ${insErr.message}`;
    }

    const sign = kind === "income" ? "+" : "-";
    return `✅ บันทึกแล้ว:\n${sign}${formatSatang(amount)} (${matchedCat?.name || "ทั่วไป"})\n📝 ${note}`;
  }

  // ----------------------------------------------------
  // ACTION 2: แก้ไขรายการ (EDIT)
  // ----------------------------------------------------
  if (intent.action === "edit") {
    if (!recent5 || recent5.length === 0) {
      return "❌ ไม่พบรายการล่าสุดที่สามารถแก้ไขได้ครับ";
    }

    // เลือกล่าสุด หรือตามคำใบ้
    const targetTx = recent5[0]; // ดีฟอลต์คือรายการล่าสุด
    const updates: any = {};

    if (intent.new_amount && intent.new_amount > 0) {
      updates.amount = intent.new_amount;
    }
    if (intent.new_note) {
      updates.note = `[แก้ไข] ${intent.new_note}`;
    }
    if (intent.new_category) {
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", userId);

      const matched = categories?.find((c) => c.name.includes(intent.new_category || ""));
      if (matched) updates.category_id = matched.id;
    }

    if (Object.keys(updates).length === 0) {
      return "⚠️ ไม่พบข้อมูลที่ต้องการแก้ไข (เช่น จำนวนเงิน หรือโน้ตใหม่)";
    }

    const { error: updateErr } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", targetTx.id)
      .eq("user_id", userId);

    if (updateErr) {
      return `❌ แก้ไขไม่สำเร็จ: ${updateErr.message}`;
    }

    const newAmtStr = updates.amount ? formatSatang(updates.amount) : formatSatang(targetTx.amount);
    return `✏️ แก้ไขเรียบร้อย:\nรายการล่าสุด ➔ ${newAmtStr}${updates.note ? `\n📝 ${updates.note}` : ""}`;
  }

  // ----------------------------------------------------
  // ACTION 3: ตอบคำถาม / ปรึกษา (QUERY)
  // ----------------------------------------------------
  return intent.answer || "ขออภัยครับ ไม่สามารถตอบกลับได้ในขณะนี้";
}
