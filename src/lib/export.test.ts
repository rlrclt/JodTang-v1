import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  transactionsToCsv,
  isOverExportLimit,
  EXPORT_ROW_LIMIT,
  CSV_HEADERS,
  type ExportTransaction,
} from "./export.ts";

const sampleRow = (over: Partial<ExportTransaction> = {}): ExportTransaction => ({
  id: "0b000000-0000-0000-0000-000000000001",
  kind: "expense",
  amount: 12345, // 123.45 บาท
  note: "ข้าวกลางวัน",
  occurred_at: "2026-09-16T12:00:00.000Z",
  account_name: "กระเป๋าหลัก",
  to_account_name: null,
  category_name: "อาหาร",
  ...over,
});

describe("transactionsToCsv", () => {
  it("มี BOM นำหัวไฟล์ เพื่อให้ Excel/ชีตอ่าน UTF-8 ผ่าน", () => {
    const csv = transactionsToCsv([sampleRow()]);
    assert.ok(csv.startsWith("\uFEFF"), "ต้องขึ้นต้นด้วย BOM");
  });

  it("มีหัวคอลัมน์ภาษาไทยครบตาม CSV_HEADERS", () => {
    const csv = transactionsToCsv([sampleRow()]);
    const firstLine = csv.slice(1).split("\r\n")[0];
    // เพราะหัวคอลัมน์ "ไปยังกระเป๋า" และ "โน้ต" ไม่มีตัวอักษรที่ต้อง quote
    assert.equal(firstLine, CSV_HEADERS.join(","));
  });

  it("คอลัมน์สตางค์เป็นจำนวนเต็ม (ห้ามทศนิยม) และคอลัมน์บาทจัดรูปแบบแล้ว", () => {
    const csv = transactionsToCsv([sampleRow({ amount: 12345 })]);
    const bodyLine = csv.slice(1).split("\r\n")[1];
    const cols = bodyLine.split(",");
    // ลำดับ: วันที่, ประเภท, สตางค์, บาท, ...
    assert.equal(cols[2], "12345", "สตางค์ต้องเป็นจำนวนเต็ม");
    assert.ok(cols[3].includes("฿"), "บาทต้องมีสัญลักษณ์ ฿");
    assert.ok(cols[3].includes("123"), "บาทต้องมีตัวเลข 123");
    assert.ok(!/123\.45/.test(cols[3]), "บาทไม่แสดงทศนิยม (รูปแบบตาม formatSatang)");
  });

  it("amount เป็น string เชิงเลข (มาจาก DB ที่คืน string ได้) ก็ยังเป็นจำนวนเต็มได้", () => {
    const csv = transactionsToCsv([sampleRow({ amount: "7777" })]);
    const bodyLine = csv.slice(1).split("\r\n")[1];
    assert.equal(bodyLine.split(",")[2], "7777");
  });

  it("quote ค่าที่มี comma/quote/ขึ้นบรรทัดใหม่ (โน้ตผู้ใช้ใส่อะไรก็ได้)", () => {
    const csv = transactionsToCsv([
      sampleRow({ note: 'พูดว่า "กินข้าว, กินผัด"' }),
    ]);
    const bodyLine = csv.slice(1).split("\r\n")[1];
    assert.ok(bodyLine.includes('"พูดว่า ""กินข้าว, กินผัด"""'));
  });

  it("null → ค่าว่าง (ไม่ใส่คำว่า null)", () => {
    const csv = transactionsToCsv([
      sampleRow({ note: null, category_name: null }),
    ]);
    const bodyLine = csv.slice(1).split("\r\n")[1];
    const cols = bodyLine.split(",");
    // ... หมวดหมู่ (index 4) และไปยังกระเป๋า/โน้ต (index 7)
    assert.equal(cols[4], "");
    assert.equal(cols[7], "");
  });

  it("หลายแถว → ได้ครบทุกแถวใน output (มี \r\n คั่น)", () => {
    const csv = transactionsToCsv([
      sampleRow(),
      sampleRow({ note: "แถวที่สอง" }),
      sampleRow({ note: "แถวที่สาม" }),
    ]);
    const lines = csv.slice(1).split("\r\n").filter((l) => l !== "");
    assert.equal(lines.length, 4, "หัว + 3 แถวข้อมูล");
  });

  it("ประเภทโอนใส่ชื่อกระเป๋าต้นทางและปลายทาง", () => {
    const csv = transactionsToCsv([
      sampleRow({
        kind: "transfer",
        to_account_name: "กระเป๋าเงินสด",
        category_name: null,
      }),
    ]);
    const bodyLine = csv.slice(1).split("\r\n")[1];
    assert.ok(bodyLine.includes("โอน"));
    assert.ok(bodyLine.includes("กระเป๋าเงินสด"));
  });

  it("รายรับแสดงคำว่า รายรับ", () => {
    const csv = transactionsToCsv([sampleRow({ kind: "income" })]);
    assert.ok(csv.slice(1).split("\r\n")[1].includes("รายรับ"));
  });
});

describe("export limit", () => {
  it("EXPORT_ROW_LIMIT = 20000", () => {
    assert.equal(EXPORT_ROW_LIMIT, 20000);
  });

  it("isOverExportLimit: ต่ำกว่า/เท่ากับลิมิต = false", () => {
    assert.equal(isOverExportLimit(0), false);
    assert.equal(isOverExportLimit(20000), false);
  });

  it("isOverExportLimit: เกินลิมิต = true", () => {
    assert.equal(isOverExportLimit(20001), true);
  });
});
