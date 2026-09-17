import { NextRequest, NextResponse } from "next/server";
import {
  verifyLineSignature,
  downloadLineImage,
  replyLineMessage,
  type LineEvent,
} from "@/lib/line/line-messaging";
import { parseSlipImageWithGemini } from "@/lib/ai/slip-parser";
import { createClient } from "@supabase/supabase-js";
import { formatSatang } from "@/lib/format-satang";

// ใช้ Supabase Service Client สำหรับ Webhook เพื่อบันทึกข้อมูลแทนผู้ใช้
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !channelAccessToken) {
    console.error("Missing LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN");
    return NextResponse.json({ error: "Server not configured for LINE" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // 1. ตรวจสอบความถูกต้องของ Signature
  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events: LineEvent[] = body.events || [];

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

    // ── กรณีที่ 1: ผู้ใช้ส่งข้อความ Text เพื่อเชื่อมบัญชี ──
    if (event.message?.type === "text") {
      const text = event.message.text?.trim() || "";

      // คำสั่งผูกบัญชี: "LINK:user@email.com" หรือ "เชื่อมต่อ:..."
      if (text.startsWith("LINK:") || text.startsWith("เชื่อมต่อ:")) {
        const email = text.replace(/^(LINK:|เชื่อมต่อ:)/i, "").trim().toLowerCase();
        const { data: targetUser, error: findErr } = await supabase
          .from("profiles")
          .select("id, email")
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

        // ผูก line_user_id เข้ากับ profile
        await supabase
          .from("profiles")
          .update({ line_user_id: lineUserId })
          .eq("id", targetUser.id);

        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `🎉 เชื่อมต่อบัญชีสำเร็จ!\nยินดีต้อนรับคุณ ${targetUser.email} ตอนนี้คุณสามารถส่งรูปสลิปหรือใบเสร็จเข้ามาเพื่อให้ AI ช่วยบันทึกรายรับ-รายจ่ายได้ทันทีครับ`,
            },
          ],
          channelAccessToken
        );
        continue;
      }

      // ถ้ายังไม่ได้ผูกบัญชี
      if (!profile) {
        await replyLineMessage(
          event.replyToken,
          [
            {
              type: "text",
              text: `👋 สวัสดีครับ! กรุณาเชื่อมต่อบัญชี JodTang ก่อนใช้งาน โดยพิมพ์:\n\nLINK:อีเมลของคุณ\n\n(เช่น LINK:user@gmail.com)`,
            },
          ],
          channelAccessToken
        );
        continue;
      }

      // ข้อความช่วยเหลือทั่วไป
      await replyLineMessage(
        event.replyToken,
        [
          {
            type: "text",
            text: `📸 ส่งรูปสลิปโอนเงิน หรือใบเสร็จเข้ามาในแชทนี้ได้เลยครับ AI จะสกัดข้อมูลและลงบันทึกให้คุณอัตโนมัติ! ✨`,
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
              text: `⚠️ กรุณาเชื่อมต่อบัญชี JodTang ก่อนส่งสลิปครับ โดยพิมพ์:\nLINK:อีเมลของคุณ`,
            },
          ],
          channelAccessToken
        );
        continue;
      }

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

      // 2) ส่งรูปให้ Gemini Vision สกัดข้อมูล
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

      // 3) ดึงกระเป๋าเงินหลัก (Default Account) ของผู้ใช้
      const { data: accounts } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const defaultAccount = accounts?.[0];
      if (!defaultAccount) {
        await replyLineMessage(
          event.replyToken,
          [{ type: "text", text: "❌ ยังไม่มีกระเป๋าเงินในระบบ กรุณาเข้าเว็บไปสร้างกระเป๋าเงินก่อนครับ" }],
          channelAccessToken
        );
        continue;
      }

      // 4) หาหมวดหมู่ที่ตรงกัน
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", profile.id)
        .eq("kind", slip.kind);

      const matchedCat =
        categories?.find((c) => c.name === slip.category) ||
        categories?.find((c) => c.name === "อื่น ๆ") ||
        categories?.[0];

      // 5) บันทึกลงตาราง transactions
      const clientId = crypto.randomUUID();
      const occurredAt = slip.date || new Date().toISOString();

      const { error: insertErr } = await supabase.from("transactions").insert({
        user_id: profile.id,
        account_id: defaultAccount.id,
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
                          { type: "text", text: defaultAccount.name, weight: "bold", color: "#666666", size: "sm", flex: 4 },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        spacing: "sm",
                        contents: [
                          { type: "text", text: "โน้ต", color: "#aaaaaa", size: "sm", flex: 2 },
                          { type: "text", text: slip.note, color: "#666666", size: "sm", flex: 4, wrap: true },
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
