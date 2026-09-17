"use server";

import { createClient } from "@/lib/supabase/server";

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

  // ตั้งชื่อ Session อัตโนมัติจากคำถามแรกของผู้ใช้ถ้ายังไม่มีชื่อ
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

/** ส่งคำถามให้ AI Advisor */
export async function askAiAdvisor(
  messages: ChatMessage[]
): Promise<{ reply?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "กรุณาเข้าสู่ระบบก่อนใช้งาน AI Chatbot" };
  }

  // ดึงยอดรวมและหมวดหมู่ล่าสุดของผู้ใช้มาเป็นบริบทความรู้ (Context) ให้บอท
  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance")
    .eq("user_id", user.id);

  const { data: recentTx } = await supabase
    .from("transactions")
    .select("kind, amount, occurred_at, categories(name)")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(10);

  let financialContext = "บริบทการเงินปัจจุบันของผู้ใช้:\n";
  if (accounts && accounts.length > 0) {
    financialContext += "- กระเป๋าเงิน:\n";
    for (const acc of accounts) {
      financialContext += `  • ${acc.name}: ${(acc.balance / 100).toLocaleString()} บาท\n`;
    }
  }

  if (recentTx && recentTx.length > 0) {
    financialContext += "- รายการล่าสุด:\n";
    for (const tx of recentTx) {
      const cat = (tx.categories as any)?.name || "ทั่วไป";
      const sign = tx.kind === "income" ? "+" : "-";
      financialContext += `  • [${tx.occurred_at.slice(0, 10)}] ${cat}: ${sign}${(tx.amount / 100).toLocaleString()} บาท\n`;
    }
  }

  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      error:
        "ยังไม่ได้ตั้งค่า API Key สำหรับ AI (กรุณาตั้งค่า GEMINI_API_KEY ในไฟล์ .env.local)",
    };
  }

  const systemInstruction = `คุณคือ 'JodTang AI Advisor' ที่ปรึกษาทางการเงินส่วนบุคคลประจำแอป JodTang
ตอบคำถามอย่างเป็นกันเอง สุภาพ กระชับ จริงใจ และให้คำแนะนำที่นำไปใช้ได้จริงเป็นภาษาไทย
คุณมีข้อมูลภาพรวมการเงินของผู้ใช้ดังนี้ (รักษาความเป็นส่วนตัวอย่างเคร่งครัด):
${financialContext}
จงใช้ข้อมูลนี้ตอบข้อสงสัย แนะนำการประหยัด วางแผนการเงิน หรือตอบคำถามทั่วไปเกี่ยวกับการเงินอย่างชาญฉลาด`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const formattedContents = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: formattedContents,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `AI API Error: ${err}` };
    }

    const data = await res.json();
    const replyText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "ขออภัยครับ ไม่สามารถสร้างคำตอบได้";

    return { reply: replyText };
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI" };
  }
}
