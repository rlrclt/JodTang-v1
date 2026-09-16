import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeBalances } from "./account-balance.ts";

const A = "a1";
const B = "b1";

describe("computeBalances", () => {
  it("ยอดต่อกระเป๋า = รับ − จ่าย", () => {
    const balances = computeBalances([
      { kind: "income", account_id: A, to_account_id: null, amount: 10000 },
      { kind: "expense", account_id: A, to_account_id: null, amount: 3000 },
    ]);
    assert.equal(balances.get(A), 7000);
  });

  it("โอนออกจาก A = A ลด, B เพิ่ม", () => {
    const balances = computeBalances([
      { kind: "income", account_id: A, to_account_id: null, amount: 10000 },
      { kind: "transfer", account_id: A, to_account_id: B, amount: 4000 },
    ]);
    assert.equal(balances.get(A), 6000, "A ควรเหลือ 6000");
    assert.equal(balances.get(B), 4000, "B ควรมี 4000");
  });

  it("transfer สองฝั่งเป็นกระเป๋าเดียวกัน (โอนใส่ตัวเอง — เมย์ไม่ควรเกิด) ไม่บวกซ้ำ", () => {
    const balances = computeBalances([
      { kind: "transfer", account_id: A, to_account_id: A, amount: 5000 },
    ]);
    assert.equal(balances.get(A), -5000, "ถือเป็นออกอย่างเดียว (ล็อกพฤติกรรม)");
  });

  it("กระเป๋าที่ไม่มีรายการไม่ปรากฏใน map (caller ต้อง default 0)", () => {
    const balances = computeBalances([]);
    assert.equal(balances.size, 0);
  });

  it("รับเป็น string (PGlite คืน bigint เป็น string) ยังคิดเป็นจำนวนเต็ม", () => {
    const balances = computeBalances([
      { kind: "income", account_id: A, to_account_id: null, amount: "12345" },
      { kind: "expense", account_id: A, to_account_id: null, amount: "1" },
    ]);
    assert.equal(balances.get(A), 12344);
  });
  it("คำนวณหลายกระเป๋าพร้อมกัน ทั้งรายรับ รายจ่าย โอน และคงเหลือติดลบ", () => {
    const C = "c1";
    const balances = computeBalances([
      { kind: "income", account_id: A, to_account_id: null, amount: 20000 },
      { kind: "transfer", account_id: A, to_account_id: B, amount: 5000 },
      { kind: "expense", account_id: B, to_account_id: null, amount: 7000 },
      { kind: "expense", account_id: C, to_account_id: null, amount: 1500 },
    ]);
    assert.equal(balances.get(A), 15000);
    assert.equal(balances.get(B), -2000);
    assert.equal(balances.get(C), -1500);
  });
});
