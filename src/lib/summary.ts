/**
 * summary.ts — ฟังก์ชันคำนวณ summary จาก transactions
 * Pure function, ไม่พึ่ง React/Next.js — test ได้โดยตรง
 */

export type TransactionKind = "income" | "expense" | "transfer";

export type SummaryInput = {
  kind: TransactionKind;
  amount: number;
}[];

export type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

/** คำนวณ summary จาก transactions — pure function */
export function computeSummary(transactions: SummaryInput): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.kind === "income") income += tx.amount;
    else if (tx.kind === "expense") expense += tx.amount;
  }
  return { income, expense, balance: income - expense };
}
