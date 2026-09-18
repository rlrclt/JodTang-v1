/**
 * Vision Service for Receipt & Slip Parsing
 * ยิง OpenRouter Free Vision Models แบบ Auto-Failover 100%
 */

export type ParsedSlip = {
  kind: "expense" | "income";
  amount: number; // satang
  category: string;
  account_hint?: "bank" | "cash" | "card" | string; // คำใบ้กระเป๋าเงิน เช่น สลิปธนาคาร -> bank
  bank_name?: string; // เช่น กสิกร, ไทยพาณิชย์, กรุงไทย
  note: string;
  date?: string;
};

const PROMPT = `คุณคือระบบ OCR และสกัดข้อมูลสลิปโอนเงิน / ใบเสร็จรับเงินภาษาไทยอัจฉริยะ
จงวิเคราะห์ภาพนี้และสกัดข้อมูลออกมาเป็น JSON เท่านั้น (ห้ามมีคำนำหรือ markdown อื่น ตอบเฉพาะ JSON raw object):

{
  "kind": "expense" หรือ "income",
  "amount_baht": ตัวเลขยอดเงินหน่วยบาท (เช่น 150.50 หรือ 450),
  "category": เลือกจากรายการนี้เท่านั้น!
    รายจ่าย: "อาหาร" | "เดินทาง" | "ช้อปปิ้ง" | "บิลและสาธารณูปโภค" | "ของใช้ส่วนตัว" | "บันเทิง" | "สุขภาพ" | "การศึกษา" | "ที่อยู่อาศัย" | "อื่น ๆ"
    รายรับ: "เงินเดือน" | "โบนัส" | "รายได้เสริม" | "ดอกเบี้ย" | "อื่น ๆ",
  "account_type": "bank" (ถ้าเป็นสลิปโอนเงินผ่านธนาคาร/PromptPay/Mobile Banking/แอปธนาคาร/QR Payment) หรือ "cash" (ถ้าเป็นใบเสร็จเงินสด/ร้านค้าที่จ่ายสดชัดเจน),
  "bank_name": "ชื่อธนาคารต้นทาง เช่น กสิกรไทย, ไทยพาณิชย์, กรุงไทย, กรุงเทพ, กรุงศรี, ทหารไทยธนชาต, ออมสิน, ทรูมันนี่",
  "note": "ชื่อผู้รับเงิน/ร้านค้า/รายละเอียดจากสลิป",
  "occurred_at": "YYYY-MM-DDTHH:mm:ss+07:00" (ถ้าพบวันเวลาในสลิป)
}

กฎการแยก:
- สลิปโอนเงิน/QR Payment/Mobile Banking/PromptPay -> "account_type": "bank" เสมอ!
- สลิปโอนเงินสำเร็จ / ชำระเงิน / ซื้อสินค้า -> "kind": "expense"
- สลิปรับเงิน / ได้รับเงินโอนเข้า -> "kind": "income"
- ค่าไฟ/ค่าน้ำ/ค่าเน็ต/ค่าโทรศัพท์ -> "category": "บิลและสาธารณูปโภค"
- ค่าเช่า/ค่าห้อง/คอนโด -> "category": "ที่อยู่อาศัย"
- ร้านอาหาร/เครื่องดื่ม/กาแฟ -> "category": "อาหาร"
- amount_baht ต้องเป็นตัวเลขเท่านั้น ห้ามใส่เครื่องหมายจุลภาค`;

const VISION_MODELS = [
  "inclusionai/ling-3.0-flash-vl:free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-26b-a4b-it:free",
];

export async function parseSlipImageWithGemini(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<{ data?: ParsedSlip; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return { error: "ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY ในไฟล์ .env.local" };
  }

  let lastError = "";

  for (const model of VISION_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://jodtangv1.vercel.app",
          "X-Title": "JodTang Slip Vision",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: PROMPT,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        lastError = `${model}: ${err}`;
        console.warn(`Vision model ${model} failed (${res.status}), trying next model...`);
        continue;
      }

      const json = await res.json();
      let rawText: string = json.choices?.[0]?.message?.content || "";

      rawText = rawText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        rawText = rawText.slice(jsonStart, jsonEnd + 1);
      }

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
          account_hint: parsed.account_type || "bank",
          bank_name: parsed.bank_name,
          note: parsed.note || (parsed.kind === "income" ? "รับเงิน" : "จ่ายเงิน"),
          date: parsed.occurred_at,
        },
      };
    } catch (err: any) {
      lastError = err.message;
    }
  }

  return { error: `OpenRouter Error: ${lastError}` };
}
