/**
 * Gemini Vision Service for Receipt & Slip Parsing
 */

export type ParsedSlip = {
  kind: "expense" | "income";
  amount: number; // satang
  category: string;
  note: string;
  date?: string;
};

export async function parseSlipImageWithGemini(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<{ data?: ParsedSlip; error?: string }> {
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY หรือ AI_API_KEY" };
  }

  const prompt = `คุณคือระบบ OCR และสกัดข้อมูลสลิปโอนเงิน / ใบเสร็จรับเงินภาษาไทยอัจฉริยะ
จงวิเคราะห์ภาพนี้และสกัดข้อมูลออกมาเป็น JSON เท่านั้น (ห้ามมีคำนำหรือ markdown อื่น):

โครงสร้าง JSON:
{
  "kind": "expense" หรือ "income",
  "amount_baht": ตัวเลขยอดเงินหน่วยบาท (เช่น 150.50 หรือ 450),
  "category": "อาหาร" | "เดินทาง" | "ช้อปปิ้ง" | "บิลและสาธารณูปโภค" | "ของใช้ส่วนตัว" | "บันเทิง" | "สุขภาพ" | "เงินเดือน" | "อื่น ๆ",
  "note": "ชื่อร้านค้า หรือรายละเอียดสั้นๆ เช่น 7-Eleven, ข้าวมันไก่, โอนให้...",
  "occurred_at": "YYYY-MM-DDTHH:mm:ss+07:00" (ถ้าพบวันเวลาในสลิป)
}

กฎการแยก:
- ถ้าเป็นสลิปโอนเงินสำเร็จ / ชำระเงิน / ซื้อสินค้า -> "kind": "expense"
- ถ้าเป็นสลิปรับเงิน / ได้รับเงินโอนเข้า -> "kind": "income"
- amount_baht ต้องเป็นตัวเลขเท่านั้น`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { error: `Gemini API error: ${err}` };
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return { error: "ไม่สามารถสกัดข้อมูลจากภาพได้" };

    const parsed = JSON.parse(rawText);
    const amountSatang = Math.round((Number(parsed.amount_baht) || 0) * 100);

    if (amountSatang <= 0) {
      return { error: "ไม่พบยอดเงินที่ถูกต้องในสลิป" };
    }

    return {
      data: {
        kind: parsed.kind === "income" ? "income" : "expense",
        amount: amountSatang,
        category: parsed.category || "อื่น ๆ",
        note: parsed.note || (parsed.kind === "income" ? "รับเงิน" : "จ่ายเงิน"),
        date: parsed.occurred_at,
      },
    };
  } catch (err: any) {
    return { error: err.message || "เกิดข้อผิดพลาดในการประมวลผลภาพ" };
  }
}
