"use client";

import { useTransactions } from "@/components/TransactionsProvider";
import BalanceCard from "@/components/BalanceCard";
import HomeTransactionItem from "@/components/HomeTransactionItem";

/** แปลง month string "YYYY-MM-01" เป็นชื่อเดือนภาษาไทย + ปี */
function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** คำนวณเดือนก่อนหน้า/ถัดไป */
function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}-01`;
}

export default function HomePage() {
  const { month, setMonth, transactions, summary, isLoading, error, refresh } =
    useTransactions();

  const handlePrev = () => setMonth(shiftMonth(month, -1));
  const handleNext = () => setMonth(shiftMonth(month, 1));

  // สถานะกำลังโหลด (Skeleton)
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="mb-4 h-8 w-32 animate-pulse rounded bg-surface" />
        <div className="mb-4 h-40 animate-pulse rounded-2xl bg-surface" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  // สถานะ error
  if (error) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center p-8 text-center">
        <p className="mb-2 text-lg font-medium text-expense">
          เกิดข้อผิดพลาด
        </p>
        <p className="mb-4 text-sm text-text-muted">{error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-xl bg-balance px-4 py-2 text-sm font-medium text-white"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  // สถานะว่าง (ไม่มีรายการเลย)
  const isEmpty = transactions.length === 0;

  return (
    <div className="p-4">
      {/* เดือนavigator */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text transition-colors active:bg-surface-2"
          aria-label="เดือนก่อนหน้า"
        >
          ‹
        </button>
        <h1 className="text-lg font-semibold">{monthLabel(month)}</h1>
        <button
          type="button"
          onClick={handleNext}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text transition-colors active:bg-surface-2"
          aria-label="เดือนถัดไป"
        >
          ›
        </button>
      </div>

      {/* การ์ดยอดเงิน */}
      <div className="mb-4">
        <BalanceCard
          income={summary.income}
          expense={summary.expense}
          balance={summary.balance}
        />
      </div>

      {/* รายการล่าสุด */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="mb-2 text-4xl">📝</p>
          <p className="text-base text-text-muted">ยังไม่มีรายการ</p>
          <p className="mt-1 text-sm text-text-muted">
            กดปุ่ม + เพื่อบันทึกรายการแรก
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-medium text-text-muted">
            รายการล่าสุด
          </h2>
          <ul className="rounded-2xl bg-surface">
            {transactions.map((tx) => (
              <HomeTransactionItem key={tx.id} transaction={tx} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
