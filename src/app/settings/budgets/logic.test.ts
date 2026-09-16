import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bahtTextToSatang,
  satangToBahtText,
  spendPercent,
  shouldWarn,
  monthKeyToPeriodMonth,
  toMonthKey,
  shiftMonth,
  budgetStateLabel,
} from "./logic.ts";

const ZERO = BigInt(0);

describe("bahtTextToSatang", () => {
  it("รับจำนวนเต็มบาท", () => {
    assert.equal(bahtTextToSatang("250"), BigInt(25000));
    assert.equal(bahtTextToSatang("2,500"), BigInt(250000));
  });

  it("รับทศนิยม 1-2 ตำแหน่ง", () => {
    assert.equal(bahtTextToSatang("123.45"), BigInt(12345));
    assert.equal(bahtTextToSatang("0.99"), BigInt(99));
    assert.equal(bahtTextToSatang("45.5"), BigInt(4550));
  });

  it("ปัดทิ้งทศนิยมเกิน 2 ตำแหน่ง (ห้าม float)", () => {
    assert.equal(bahtTextToSatang("10.999"), BigInt(1099));
    assert.equal(bahtTextToSatang("0.009"), ZERO);
  });

  it("คืน null สำหรับ input ที่ไม่ใช่ตัวเลข", () => {
    assert.equal(bahtTextToSatang(""), null);
    assert.equal(bahtTextToSatang("   "), null);
    assert.equal(bahtTextToSatang("abc"), null);
    assert.equal(bahtTextToSatang("-50"), null); // งบเป็นลบไม่ได้ (check >= 0)
    assert.equal(bahtTextToSatang("1.2.3"), null);
    assert.equal(bahtTextToSatang("１２３"), null); // fullwidth
  });
});

describe("satangToBahtText (กลับจากตัวกรอก)", () => {
  it("แปลงกลับแล้วค่าตรงกัน", () => {
    assert.equal(satangToBahtText(BigInt(25000)), "250");
    assert.equal(satangToBahtText(BigInt(12345)), "123.45");
    assert.equal(satangToBahtText(BigInt(99)), "0.99");
    assert.equal(satangToBahtText(BigInt(4550)), "45.5");
  });
});

describe("spendPercent", () => {
  it("คำนวณ % แบบจำนวนเต็ม (floor)", () => {
    assert.equal(spendPercent(BigInt(5000), BigInt(10000)), 50);
    assert.equal(spendPercent(BigInt(7999), BigInt(10000)), 79);
    assert.equal(spendPercent(BigInt(8000), BigInt(10000)), 80);
    assert.equal(spendPercent(BigInt(12345), BigInt(1000)), 1234); // เกิน 100 ได้
  });

  it("งบเป็น null = ไม่มีเปอร์เซ็นต์ (ต่างจากงบ 0)", () => {
    assert.equal(spendPercent(BigInt(5000), null), null);
  });

  it("งบ 0 = ไม่แสดง % (ไม่กำหนดเพดาน)", () => {
    assert.equal(spendPercent(BigInt(5000), ZERO), null);
    assert.equal(spendPercent(ZERO, ZERO), null);
  });
});

describe("shouldWarn (เข้มงวดขอบ 80%)", () => {
  it("79.99% ยังไม่เตือน", () => {
    // budget 10000, used 7999 → 79.99% แน่ ๆ
    assert.equal(shouldWarn(BigInt(7999), BigInt(10000)), false, "7999/10000 = 79.99% ไม่เตือน");
  });

  it("80.00% เตือน", () => {
    assert.equal(shouldWarn(BigInt(8000), BigInt(10000)), true, "8000/10000 = 80.00% เตือน");
  });

  it("เกิน 80% เตือน", () => {
    assert.equal(shouldWarn(BigInt(9999), BigInt(10000)), true);
    assert.equal(shouldWarn(BigInt(12000), BigInt(10000)), true);
  });

  it("ใช้จำนวนเต็มตรง ๆ (ไม่ผ่าน float)", () => {
    // budget = 300, spent = 240 → 80.00% แน่นอน (จำนวนเต็มทุกที่)
    assert.equal(shouldWarn(BigInt(240), BigInt(300)), true);
    // budget = 300, spent = 239 → 79.67% ไม่เตือน
    assert.equal(shouldWarn(BigInt(239), BigInt(300)), false);
  });

  it("งบ null/0 ไม่เตือน", () => {
    assert.equal(shouldWarn(BigInt(9999), null), false);
    assert.equal(shouldWarn(BigInt(9999), ZERO), false);
  });
});

describe("budgetStateLabel (งบ 0 กับไม่ตั้งงบต้องแยก)", () => {
  it("งบ null = none", () => {
    assert.equal(budgetStateLabel(null), "none");
  });
  it("งบ 0 = zero (ผู้ใช้ตั้งเป็นศูนย์ด้วยตัวเอง)", () => {
    assert.equal(budgetStateLabel(ZERO), "zero");
  });
  it("งบ > 0 = set", () => {
    assert.equal(budgetStateLabel(BigInt(150000)), "set");
  });
});

describe("monthKeyToPeriodMonth", () => {
  it("แปลง YYYY-MM → วันแรกของเดือน", () => {
    assert.equal(monthKeyToPeriodMonth("2026-09"), "2026-09-01");
    assert.equal(monthKeyToPeriodMonth("2025-01"), "2025-01-01");
    assert.equal(monthKeyToPeriodMonth("2026-12"), "2026-12-01");
  });

  it("ปฏิเสธฟอร์แมตผิด", () => {
    assert.equal(monthKeyToPeriodMonth("2026-9"), null);
    assert.equal(monthKeyToPeriodMonth("2026-13"), null);
    assert.equal(monthKeyToPeriodMonth("abc"), null);
    assert.equal(monthKeyToPeriodMonth("2026-00"), null);
  });
});

describe("toMonthKey", () => {
  it("pad เดือนให้เป็น 2 หลัก", () => {
    assert.equal(toMonthKey(2026, 9), "2026-09");
    assert.equal(toMonthKey(2026, 12), "2026-12");
    assert.equal(toMonthKey(2026, 1), "2026-01");
  });
});

describe("shiftMonth", () => {
  it("ย้อนหลัง 1 เดือนข้ามปี", () => {
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  });
  it("ไปหน้า 1 เดือนข้ามปี", () => {
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  });
  it("ย้อนหลายเดือน", () => {
    assert.deepEqual(shiftMonth(2026, 10, -8), { year: 2026, month: 2 });
  });
});
