import { createClient } from "@supabase/supabase-js";
import { formatSatang } from "@/lib/format-satang";
import { computeBalances } from "@/lib/account-balance";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const CHAT_MODELS = [
  "nex-agi/nex-n2.5-pro:free",
  "nex-agi/nex-n2.5-mini:free",
  "inclusionai/ling-3.0-flash-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-31b-it:free",
];

// หมวดหมู่จริงในระบบ — ต้องตรงชื่อใน DB เป๊ะ
const EXPENSE_CATEGORIES = [
  "อาหาร",
  "เดินทาง",
  "ช้อปปิ้ง",
  "บิลและสาธารณูปโภค",
  "ของใช้ส่วนตัว",
  "บันเทิง",
  "สุขภาพ",
  "การศึกษา",
  "ที่อยู่อาศัย",
  "อื่น ๆ",
];

const INCOME_CATEGORIES = [
  "เงินเดือน",
  "โบนัส",
  "รายได้เสริม",
  "ดอกเบี้ย",
  "อื่น ๆ",
];

// Mapping ชื่อร้าน/คำสำคัญ → หมวดหมู่
const CATEGORY_HINT_MAP: Record<string, string> = {
  // อาหาร
  ข้าว: "อาหาร", กับข้าว: "อาหาร", อาหาร: "อาหาร", กาแฟ: "อาหาร", ชา: "อาหาร",
  กิน: "อาหาร", ส้มตำ: "อาหาร", ก๋วยเตี๋ยว: "อาหาร", ขนม: "อาหาร",
  "7-eleven": "อาหาร", "seven": "อาหาร", เซเว่น: "อาหาร", แกร็บ: "อาหาร",
  lineman: "อาหาร", foodpanda: "อาหาร", แมค: "อาหาร", kfc: "อาหาร",
  สตาร์บัคส์: "อาหาร", starbucks: "อาหาร", เครื่องดื่ม: "อาหาร",
  น้ำ: "อาหาร", นม: "อาหาร", ผลไม้: "อาหาร", ตลาด: "อาหาร",

  // เดินทาง
  แท็กซี่: "เดินทาง", taxi: "เดินทาง", bolt: "เดินทาง", grab: "เดินทาง",
  น้ำมัน: "เดินทาง", เบนซิน: "เดินทาง", รถไฟ: "เดินทาง", bts: "เดินทาง",
  mrt: "เดินทาง", รถเมล์: "เดินทาง", ทางด่วน: "เดินทาง", ค่าผ่านทาง: "เดินทาง",
  ที่จอดรถ: "เดินทาง", วิน: "เดินทาง", มอเตอร์ไซค์: "เดินทาง",

  // บิลและสาธารณูปโภค
  ค่าไฟ: "บิลและสาธารณูปโภค", ไฟฟ้า: "บิลและสาธารณูปโภค",
  ค่าน้ำ: "บิลและสาธารณูปโภค", ประปา: "บิลและสาธารณูปโภค",
  ค่าเน็ต: "บิลและสาธารณูปโภค", อินเทอร์เน็ต: "บิลและสาธารณูปโภค",
  ค่าโทรศัพท์: "บิลและสาธารณูปโภค", มือถือ: "บิลและสาธารณูปโภค",
  ais: "บิลและสาธารณูปโภค", true: "บิลและสาธารณูปโภค", dtac: "บิลและสาธารณูปโภค",

  // ที่อยู่อาศัย
  ค่าเช่า: "ที่อยู่อาศัย", ค่าห้อง: "ที่อยู่อาศัย", คอนโด: "ที่อยู่อาศัย",
  หอพัก: "ที่อยู่อาศัย", บ้าน: "ที่อยู่อาศัย",

  // ช้อปปิ้ง
  shopee: "ช้อปปิ้ง", lazada: "ช้อปปิ้ง", ซื้อของ: "ช้อปปิ้ง",
  ช้อป: "ช้อปปิ้ง", เสื้อผ้า: "ช้อปปิ้ง", รองเท้า: "ช้อปปิ้ง",

  // สุขภาพ
  หมอ: "สุขภาพ", โรงพยาบาล: "สุขภาพ", ยา: "สุขภาพ", คลินิก: "สุขภาพ",
  ทันตกรรม: "สุขภาพ", ฟัน: "สุขภาพ",

  // บันเทิง
  หนัง: "บันเทิง", netflix: "บันเทิง", youtube: "บันเทิง", เกม: "บันเทิง",
  spotify: "บันเทิง", คอนเสิร์ต: "บันเทิง",

  // การศึกษา
  ค่าเรียน: "การศึกษา", หนังสือ: "การศึกษา", คอร์ส: "การศึกษา",
  udemy: "การศึกษา", เรียน: "การศึกษา",

  // ของใช้ส่วนตัว
  สบู่: "ของใช้ส่วนตัว", แชมพู: "ของใช้ส่วนตัว", เครื่องสำอาง: "ของใช้ส่วนตัว",
  ครีม: "ของใช้ส่วนตัว",
};

export type ActionIntentResult = {
  action: "record" | "edit" | "query";
  // สำหรับ record
  kind?: "income" | "expense";
  amount?: number; // สตางค์
  category?: string;
  note?: string;
  account_hint?: "bank" | "cash" | string;
  // สำหรับ edit
  target_hint?: string;
  new_amount?: number;
  new_category?: string;
  new_note?: string;
  // สำหรับ query
  answer?: string;
};

/**
 * ตรวจจับหมวดหมู่จากข้อความ — ใช้ keyword matching ก่อนส่ง AI
 */
function detectCategoryFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_HINT_MAP)) {
    if (lower.includes(keyword.toLowerCase())) {
      return cat;
    }
  }
  return undefined;
}

/**
 * ตรวจจับ account type จากข้อความ
 */
function detectAccountFromText(text: string): "bank" | "cash" | undefined {
  const lower = text.toLowerCase();
  const bankKeywords = [
    "โอน", "promptpay", "พร้อมเพย์", "ธนาคาร", "bank",
    "กสิกร", "ไทยพาณิชย์", "scb", "กรุงไทย", "กรุงเทพ",
    "กรุงศรี", "ทหารไทย", "ttb", "ออมสิน", "ทรูมันนี่",
    "truemoney", "kbank", "mobile banking",
  ];
  if (bankKeywords.some((k) => lower.includes(k))) return "bank";

  const cashKeywords = ["เงินสด", "cash", "แบงค์", "เหรียญ"];
  if (cashKeywords.some((k) => lower.includes(k))) return "cash";

  return undefined;
}

/**
 * 1. ฟังก์ชันแยกแยะเจตนา (Intent Parser) แบบประหยัด Token สูงสุด
 */
async function parseUserIntentWithAI(
  userText: string,
  financialContext: string,
  apiKey: string,
  accountNames: string[]
): Promise<ActionIntentResult> {
  const expCats = EXPENSE_CATEGORIES.join("|");
  const incCats = INCOME_CATEGORIES.join("|");
  const acctList = accountNames.join("|");

  const systemPrompt = `Analyze user financial text. Output raw JSON only.
Context:
${financialContext}

กระเป๋าเงิน: ${acctList}
หมวดรายจ่าย: ${expCats}
หมวดรายรับ: ${incCats}

Rules:
1. RECORD (e.g. "กินข้าว 60", "จ่ายค่าไฟ 1200", "โอนให้แม่ 500", "ได้เงินเดือน 15000"):
{"action":"record","kind":"expense"|"income","amount":<satang_integer>,"category":"<exact_category_name>","note":"<short_note>","account_hint":"<bank|cash>"}
Note: 1 baht = 100 satang (60 baht -> 6000). ถ้าพูดถึง โอน/PromptPay/ธนาคาร -> account_hint:"bank". ถ้าไม่ระบุ -> ไม่ต้องใส่ account_hint.
category ต้องเลือกจากรายการข้างบนเท่านั้น! ห้ามสร้างชื่อใหม่!

2. EDIT (e.g. "แก้รายการล่าสุดเป็น 70"):
{"action":"edit","target_hint":"<ref>","new_amount":<satang_or_null>,"new_category":"<cat_or_null>","new_note":"<note_or_null>"}

3. QUERY (e.g. "เงินเหลือเท่าไหร่", "สรุปรายจ่าย", "ขอตารางการใช้จ่าย"):
{"action":"query","answer":"<answer>"}
ห้ามใช้ markdown table (|---|) ใน answer เด็ดขาด! LINE แสดงไม่ได้!
ให้ใช้รูปแบบนี้แทน:
📊 สรุปรายจ่ายเดือนนี้:

🍜 อาหาร: 2,500 ฿
🚗 เดินทาง: 800 ฿
💡 บิล: 1,200 ฿
━━━━━━━━━━━━
💰 รวม: 4,500 ฿

ถ้ามีหลายรายการ ให้แสดงทีละบรรทัดใช้ emoji นำหน้า ห้ามใช้ | หรือ --- เด็ดขาด!
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
          temperature: 0.1,
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        console.warn(`[LINE AI] ${model} failed: ${res.status}`);
        continue;
      }

      const json = await res.json();
      let rawText = json.choices?.[0]?.message?.content || "";

      if (!rawText) {
        console.warn(`[LINE AI] ${model} returned empty content`);
        continue;
      }

      // ลบ <think>...</think> blocks (บางโมเดลมี reasoning tags)
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      // หา JSON ในข้อความ
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        rawText = rawText.slice(jsonStart, jsonEnd + 1);
      }

      try {
        const parsed = JSON.parse(rawText);
        console.log(`[LINE AI] ${model} OK:`, JSON.stringify(parsed).slice(0, 100));
        return parsed;
      } catch {
        console.warn(`[LINE AI] ${model} JSON parse fail:`, rawText.slice(0, 100));
        if (rawText.length > 5) {
          return { action: "query" as const, answer: rawText.slice(0, 500) };
        }
        continue;
      }
    } catch (err: any) {
      console.error(`[LINE AI] ${model} error:`, err.message);
      continue;
    }
  }

  return { action: "query", answer: "ขออภัยครับ ระบบ AI ไม่ว่างชั่วคราว กรุณาลองใหม่อีกครั้งใน 10 วินาทีครับ 🙏" };
}

/**
 * จับคู่กระเป๋าเงินที่เหมาะสมจาก account_hint
 */
function matchAccount(
  accounts: { id: string; name: string }[],
  hint?: string
): { id: string; name: string } {
  if (!hint || accounts.length <= 1) return accounts[0];

  if (hint === "bank") {
    const found = accounts.find((a) => {
      const lower = a.name.toLowerCase();
      return lower.includes("ธนาคาร") || lower.includes("bank");
    });
    if (found) return found;
  }

  if (hint === "cash") {
    const found = accounts.find((a) => {
      const lower = a.name.toLowerCase();
      return lower.includes("เงินสด") || lower.includes("cash");
    });
    if (found) return found;
  }

  return accounts[0];
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
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, kind, account_id, to_account_id, amount, occurred_at, category_id, note")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false });

  if (!accounts || accounts.length === 0) {
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
  let accountsSummary = "";
  for (const acc of accounts) {
    const bal = balances.get(acc.id) ?? 0;
    totalBalance += bal;
    accountsSummary += `  • ${acc.name}: ${formatSatang(bal)}\n`;
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

  // รายการล่าสุด 5 รายการ
  const recent5 = (txs ?? []).slice(0, 5);
  let recentContext = "";
  for (const t of recent5) {
    const acctName = accounts.find((a) => a.id === t.account_id)?.name || "?";
    recentContext += `[ID: ${t.id} | ${t.kind === "income" ? "+" : "-"}${formatSatang(t.amount)} | ${acctName} | ${t.note || "ไม่มีโน้ต"}]\n`;
  }

  // สรุปรายจ่ายตามหมวดเดือนนี้
  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("user_id", userId);

  let categorySummary = "";
  if (allCategories) {
    const expenseByCat = new Map<string, number>();
    for (const tx of currentMonthTxs) {
      if (tx.kind !== "expense") continue;
      const cat = allCategories.find((c) => c.id === tx.category_id);
      const catName = cat?.name || "อื่น ๆ";
      expenseByCat.set(catName, (expenseByCat.get(catName) || 0) + Number(tx.amount));
    }
    for (const [name, total] of expenseByCat.entries()) {
      categorySummary += `  • ${name}: ${formatSatang(total)}\n`;
    }
  }

  const compactContext = `
ยอดคงเหลือรวม: ${formatSatang(totalBalance)}
กระเป๋าเงิน:
${accountsSummary}
งบประมาณ:
${budgetContext || "ยังไม่ตั้งงบ"}
รายจ่ายเดือนนี้ตามหมวด:
${categorySummary || "ยังไม่มี"}
5 รายการล่าสุด:
${recentContext || "ไม่มีรายการ"}
`.trim();

  const accountNames = accounts.map((a) => a.name);

  // ส่งให้ AI ประเมินเจตนา
  const intent = await parseUserIntentWithAI(userText, compactContext, apiKey, accountNames);

  // ----------------------------------------------------
  // ACTION 1: บันทึกรายการใหม่ (RECORD)
  // ----------------------------------------------------
  if (intent.action === "record" && intent.amount && intent.amount > 0) {
    const kind = intent.kind || "expense";
    const amount = intent.amount;
    const note = intent.note || (kind === "income" ? "รายรับ" : "รายจ่าย");

    // Smart category: ใช้ local hint ก่อน → fallback AI → fallback "อื่น ๆ"
    const localCatHint = detectCategoryFromText(userText);
    const aiCatName = intent.category;
    const bestCatName = localCatHint || aiCatName;

    // Smart account: ตรวจจับจากข้อความ + AI hint
    const localAcctHint = detectAccountFromText(userText);
    const acctHint = localAcctHint || intent.account_hint;
    const targetAccount = matchAccount(accounts, acctHint);

    // ดึง categories มาจับคู่
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)
      .eq("kind", kind);

    const matchedCat =
      categories?.find((c) => c.name === bestCatName) ||
      categories?.find((c) => c.name.includes(bestCatName || "")) ||
      categories?.find((c) => c.name === "อื่น ๆ") ||
      categories?.[0];

    const { error: insErr } = await supabase.from("transactions").insert({
      user_id: userId,
      account_id: targetAccount.id,
      category_id: matchedCat?.id || null,
      kind,
      amount,
      note: `[LINE] ${note}`,
      occurred_at: new Date().toISOString(),
      client_id: crypto.randomUUID(),
    });

    if (insErr) {
      return `❌ บันทึกไม่สำเร็จ: ${insErr.message}`;
    }

    const sign = kind === "income" ? "🟢 +" : "🔴 -";
    return `✅ บันทึกแล้ว:\n${sign}${formatSatang(amount)}\n📂 ${matchedCat?.name || "ทั่วไป"}\n👛 ${targetAccount.name}\n📝 ${note}`;
  }

  // ----------------------------------------------------
  // ACTION 2: แก้ไขรายการ (EDIT)
  // ----------------------------------------------------
  if (intent.action === "edit") {
    if (!recent5 || recent5.length === 0) {
      return "❌ ไม่พบรายการล่าสุดที่สามารถแก้ไขได้ครับ";
    }

    const targetTx = recent5[0];
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
  let answer = intent.answer || "ขออภัยครับ ไม่สามารถตอบกลับได้ในขณะนี้";

  // Safety: ถ้า answer เป็น JSON ดิบ → ดึงเอาแค่ค่า answer ออกมา
  if (answer.startsWith("{") && answer.includes('"action"')) {
    try {
      const parsed = JSON.parse(answer);
      answer = parsed.answer || answer;
    } catch {
      // ไม่เป็นไร ใช้ answer เดิม
    }
  }

  // ลบ markdown table syntax ที่ LINE แสดงไม่ได้
  answer = answer.replace(/\|[-:]+\|/g, "━━━━━━━━━━━━");
  answer = answer.replace(/\|\s*/g, "").replace(/\s*\|/g, "");

  return answer;
}
