import crypto from "node:crypto";

export type LineEvent = {
  type: string;
  replyToken: string;
  source: {
    userId?: string;
    type: string;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
  };
};

/** ตรวจสอบ Signature ของ LINE Webhook */
export function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/** แสดงสถานะ "กำลังพิมพ์..." (Loading Animation / Three dots) ในแชท LINE */
export async function showLineLoadingAnimation(
  chatId: string,
  channelAccessToken: string,
  loadingSeconds: number = 20
): Promise<boolean> {
  try {
    const res = await fetch("https://api.line.me/v2/bot/chat/loading/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        chatId,
        loadingSeconds: Math.min(Math.max(loadingSeconds, 5), 60),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("LINE loading animation error:", err);
    return false;
  }
}

/** ดาวน์โหลดเนื้อหารูปภาพจาก LINE Content API */
export async function downloadLineImage(
  messageId: string,
  channelAccessToken: string
): Promise<{ buffer?: Buffer; mimeType?: string; error?: string }> {
  try {
    const res = await fetch(
      `https://api-data.line.me/v2/bot/message/${messageId}/content`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      }
    );

    if (!res.ok) {
      return { error: `Failed to download image from LINE: ${res.status}` };
    }

    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } catch (err: any) {
    return { error: err.message || "Failed to download image" };
  }
}

/** ส่งข้อความตอบกลับหาผู้ใช้ใน LINE */
export async function replyLineMessage(
  replyToken: string,
  messages: any[],
  channelAccessToken: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("LINE reply error:", err);
    return false;
  }
}
