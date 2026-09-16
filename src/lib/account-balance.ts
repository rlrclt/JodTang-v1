/**
 * คำนวณยอดคงเหลือต่อกระเป๋าเงิน — pure function เพื่อให้ node --test (PGlite) ทดสอบได้
 *
 * สูตร: เข้า − ออก
 * - income เข้าบัญชี (account_id)       = +
 * - expense จากบัญชี                    = −
 * - transfer ออกจากบัญชี (account_id)   = − (โอนออกจาก A = A ลด)
 * - transfer เข้าบัญชี (to_account_id)  = + (โอนเข้า B = B เพิ่ม)
 * - เงื่อนไข "ไม่นับรายการลบ/archived" กรองที่ SQL แล้ว: deleted_at IS NULL
 */

export type BalanceTxRow = {
  kind: "income" | "expense" | "transfer";
  account_id: string;
  to_account_id: string | null;
  amount: number | string; // PGlite คืน bigint เป็น string
};

export type AccountBalance = {
  id: string;
  name: string;
  currency: string;
  balance: number;
};

/**
 * คืนแผนที่ accountId -> ยอดคงเหลือ (หน่วยสตางค์, จำนวนเต็ม)
 * ถ้า amount ทำให้เป็นทศนิยม = ข้อมูลเสียพันธ์ (schema บังคับ bigint อยู่แล้ว) — Math.trunc กันพลาด
 */
export function computeBalances(rows: BalanceTxRow[]): Map<string, number> {
  const balances = new Map<string, number>();

  const add = (accountId: string, delta: number) => {
    const prev = balances.get(accountId) ?? 0;
    balances.set(accountId, prev + delta);
  };

  for (const row of rows) {
    // สตางค์ = จำนวนเต็มเสมอ — Number() เพื่อรองรับกรณี PGlite คืนเป็น string
    const abs = Math.trunc(Number(row.amount));

    if (row.kind === "income") {
      add(row.account_id, abs);
    } else if (row.kind === "expense") {
      add(row.account_id, -abs);
    } else if (row.kind === "transfer") {
      // โอนออกจาก A และโอนเข้า B — แตะสองบัญชีในรายการเดียว
      add(row.account_id, -abs);
      if (row.to_account_id && row.to_account_id !== row.account_id) {
        add(row.to_account_id, abs);
      }
    }
  }

  return balances;
}
