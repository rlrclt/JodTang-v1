import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
  downloadLineImage,
  replyLineMessage,
  showLineLoadingAnimation,
  type LineEvent,
} from "@/lib/line/line-messaging";
import { createClient } from "@supabase/supabase-js";
import { formatSatang } from "@/lib/format-satang";
import { processLineUserMessage } from "@/lib/line/line-ai";
import { parseSlipImageWithGemini } from "@/lib/ai/slip-parser";

// ใช้ Supabase Service Client สำหรับ Webhook เพื่อบันทึกข้อมูลแทนผู้ใช้
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // ถ้ายังไม่ได้ตั้งค่า Secret/Token บน Vercel ให้ตอบ 200 เพื่อให้ปุ่ม Verify ของ LINE ผ่านฉลุยก่อน
  if (!channelSecret || !channelAccessToken) {
    console.error("Missing LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN");
    return NextResponse.json({ error: "Server not configured for LINE" }, { status: 200 });
  }

  // ตรวจสอบความถูกต้องของ Signature
  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    // ตรวจสอบ fallback: หากเป็น Verify Request จาก LINE Developers Console ตอบ 200 ทันที
    try {
      const parsed = JSON.parse(rawBody);
      if (Array.isArray(parsed.events) && parsed.events.length === 0) {
        return NextResponse.json({ message: "Verify OK" }, { status: 200 });
      }
    } catch {}
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events: LineEvent[] = body.events || [];
  if (events.length === 0) {
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }
  const supabase = getSupabaseAdmin();

  // 2. ประมวลผลแต่ละ Event
  for (const event of events) {
    if (event.type !== "message") continue;
    const lineUserId = event.source.userId;
    if (!lineUserId) continue;

    // หาผู้ใช้ใน JodTang จาก line_user_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "2011649062-neOljV8x";
    const liffUrl = `https://liff.line.me/${liffId}`;
    const linkButtonMessage = [
      {
        type: "template",
        altText: "กดเชื่อมต่อบัญชี JodTang",
        template: {
          type: "buttons",
          text: "แตะปุ่มด้านล่างเพื่อผูกบัญชี LINE กับ JodTang ใน 1 คลิกครับ:",
          actions: [
            {
              type: "uri",
              label: "เชื่อมต่อบัญชี JodTang",
              uri: liffUrl,
            },
          ],
        },
      },
    ];

    // ── กรณีที่ 1: ผู้ใช้ส่งข้อความ Text ──
    if (event.message?.type === "text") {
      const text = event.message.text?.trim() || "";

      // คำสั่งผูกบัญชีสำรอง (Legacy LINK:)
      if (text.startsWith("LINK:") || text.startsWith("เชื่อมต่อ:")) {
        const email = text.replace(/^(LINK:|เชื่อมต่อ:)/i, "").trim().toLowerCase();
        const { data: targetUser, error: findErr } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("email", email)
          .maybeSingle();

        if (findErr || !targetUser) {
          await replyLineMessage(
            event.replyToken,
            [
              {
                type: "text",
                text: `❌ ไม่พบอีเมล ${email} ในระบบ JodTang กรุณาตรวจสอบอีเมลที่คุณใช้ล็อกอินในเว็บอีกครั้งครับ`,
              },
            ],
            channelAccessToken
          );
          continue;
        }

        await supabase
          .from("profiles")
          .update({ line_user_id: lineUserId })
          .eq("id", targetUser.id);

        const displayName = targetUser.full_name || targetUser.email.split("@")[0];
        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `🎉 เชื่อมต่อบัญชีสำเร็จเรียบร้อยแล้วครับ!\n\n👤 บัญชี: คุณ ${displayName}\n📧 อีเมล: ${targetUser.email}\n🟢 สถานะ: พร้อมบันทึกสลิปอัตโนมัติ\n\n📸 ส่งรูปสลิปโอนเงิน หรือใบเสร็จเข้ามาในแชทนี้ได้ทันที AI จะช่วยลงบัญชีให้คุณอัตโนมัติครับ ✨`,
            },
          ],
          channelAccessToken
        );
        continue;
      }

      if (!profile) {
        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `👋 สวัสดีครับ! กรุณาเชื่อมต่อบัญชี JodTang ก่อนใช้งาน โดยกดปุ่มด้านล่างครับ`,
            },
            ...linkButtonMessage,
          ],
          channelAccessToken
        );
        continue;
      }

      // แสดงสถานะ "กำลังคิด / กำลังพิมพ์..." ให้ผู้ใช้เห็นในแชททันที
      void showLineLoadingAnimation(lineUserId, channelAccessToken, 20);

      // ประมวลผลข้อความ: จดบันทึก / แก้ไข / ตอบคำถาม (Token Optimized)
      let aiAnswer = "";
      try {
        aiAnswer = await processLineUserMessage(profile.id, text);
      } catch (err: any) {
        console.error("AI text processing error:", err);
        aiAnswer = `⚠️ ระบบ AI ขัดข้องชั่วคราว: ${err.message || "ไม่สามารถติดต่อ AI ได้"} กรุณาลองใหม่อีกครั้งครับ`;
      }

      await replyLineMessage(
        event.replyToken,
        [
          {
            type: "text",
            text: aiAnswer,
          },
        ],
        channelAccessToken
      );
      continue;
    }

    // ── กรณีที่ 2: ผู้ใช้ส่งรูปภาพ (สลิปโอนเงิน / ใบเสร็จ) ──
    if (event.message?.type === "image") {
      if (!profile) {
        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `⚠️ กรุณาเชื่อมต่อบัญชี JodTang ก่อนส่งสลิปครับ โดยกดปุ่มด้านล่าง`,
            },
            ...linkButtonMessage,
          ],
          channelAccessToken
        );
        continue;
      }

      // แสดงสถานะ "กำลังอ่านสลิป..." ให้ผู้ใช้เห็นในแชททันที
      void showLineLoadingAnimation(lineUserId, channelAccessToken, 30);

      // 1) ดาวน์โหลดรูปภาพจาก LINE
      const imgRes = await downloadLineImage(event.message.id, channelAccessToken);
      if (imgRes.error || !imgRes.buffer) {
        await replyLineMessage(
          event.replyToken,
          [{ type: "text", text: "❌ ดาวน์โหลดรูปภาพจาก LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }],
          channelAccessToken
        );
        continue;
      }

      // 2) ส่งรูปให้ Vision Model สกัดข้อมูล
      const base64Img = imgRes.buffer.toString("base64");
      const parseRes = await parseSlipImageWithGemini(base64Img, imgRes.mimeType);

      if (parseRes.error || !parseRes.data) {
        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `⚠️ AI ไม่สามารถอ่านสลิปนี้ได้: ${parseRes.error || "ไม่พบข้อมูลที่ชัดเจน"}`,
            },
          ],
          channelAccessToken
        );
        continue;
      }

      const slip = parseRes.data;

      // 3) ดึงกระเป๋าเงินทั้งหมดของผู้ใช้เพื่อจับคู่ให้ตรงกับสลิป
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", profile.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (!accounts || accounts.length === 0) {
        await replyLineMessage(
          event.replyToken,
          [{ type: "text", text: "❌ ยังไม่มีกระเป๋าเงินในระบบ กรุณาเข้าเว็บไปสร้างกระเป๋าเงินก่อนครับ" }],
          channelAccessToken
        );
        continue;
      }

      // Smart Account Matching:
      // ถ้าเป็นสลิปโอนเงินธนาคาร/PromptPay -> มองหากระเป๋าที่มีคำว่า "ธนาคาร", "bank", หรือชื่อธนาคารก่อน
      let targetAccount = accounts[0];

      if (slip.account_hint === "bank") {
        const bankAccount = accounts.find((a) => {
          const lower = a.name.toLowerCase();
          return (
            lower.includes("ธนาคาร") ||
            lower.includes("bank") ||
            (slip.bank_name && lower.includes(slip.bank_name))
          );
        });
        if (bankAccount) targetAccount = bankAccount;
      } else if (slip.account_hint === "cash") {
        const cashAccount = accounts.find((a) => {
          const lower = a.name.toLowerCase();
          return lower.includes("เงินสด") || lower.includes("cash");
        });
        if (cashAccount) targetAccount = cashAccount;
      }

      // 4) หาหมวดหมู่ที่ตรงกัน
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", profile.id)
        .eq("kind", slip.kind);

      const matchedCat =
        categories?.find((c) => c.name === slip.category) ||
        categories?.find((c) => c.name.includes(slip.category || "")) ||
        categories?.find((c) => c.name === "อื่น ๆ") ||
        categories?.[0];

      // 5) บันทึกลงตาราง transactions
      const clientId = crypto.randomUUID();
      const occurredAt = slip.date || new Date().toISOString();

      const { error: insertErr } = await supabase.from("transactions").insert({
        user_id: profile.id,
        account_id: targetAccount.id,
        category_id: matchedCat?.id || null,
        kind: slip.kind,
        amount: slip.amount,
        note: `[สลิป LINE] ${slip.note}`,
        occurred_at: occurredAt,
        client_id: clientId,
      });

      if (insertErr) {
        await replyLineMessage(
          event.replyToken,
          [{ type: "text", text: `❌ บันทึกไม่สำเร็จ: ${insertErr.message}` }],
          channelAccessToken
        );
        continue;
      }

      // 6) ส่ง Flex Message ตอบกลับผู้ใช้ใน LINE
      const kindText = slip.kind === "income" ? "🟢 รายรับ" : "🔴 รายจ่าย";
      const amountFormatted = formatSatang(slip.amount);

      await replyLineMessage(
        event.replyToken,
        [
          {
            type: "flex",
            altText: `บันทึกรายการสำเร็จ: ${amountFormatted}`,
            contents: {
              type: "bubble",
              size: "mega",
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "บันทึกข้อมูลเรียบร้อย ✅",
                    weight: "bold",
                    color: "#16a34a",
                    size: "sm",
                  },
                  {
                    type: "text",
                    text: amountFormatted,
                    weight: "bold",
                    size: "xxl",
                    margin: "md",
                    color: slip.kind === "income" ? "#16a34a" : "#dc2626",
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: [
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          { type: "text", text: "ประเภท", color: "#aaaaaa", size: "sm", flex: 2 },
                          { type: "text", text: kindText, weight: "bold", color: "#666666", size: "sm", flex: 4 },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          { type: "text", text: "หมวดหมู่", color: "#aaaaaa", size: "sm", flex: 2 },
                          { type: "text", text: matchedCat?.name || "ทั่วไป", weight: "bold", color: "#666666", size: "sm", flex: 4 },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          { type: "text", text: "กระเป๋า", color: "#aaaaaa", size: "sm", flex: 2 },
                          { type: "text", text: targetAccount.name, weight: "bold", color: "#666666", size: "sm", flex: 4 },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          { type: "text", text: "บันทึก", color: "#aaaaaa", size: "sm", flex: 2 },
                          { type: "text", text: slip.note || "-", weight: "bold", color: "#666666", size: "sm", flex: 4 },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        channelAccessToken
      );
    }
  }

  return NextResponse.json({ success: true });
}
