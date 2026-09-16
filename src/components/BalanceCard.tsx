import { formatSatang } from "@/lib/format-satang";

type Props = {
  income: number;
  expense: number;
};

/**
 * การ์ดยอดเงิน — มี view-transition-name: balance-card สำหรับ morph
 * ยอด = income - expense
 */
export default function BalanceCard({ income, expense }: Props) {
  const balance = income - expense;

  return (
    <div
      style={{ viewTransitionName: "balance-card" }}
      className="mx-4 rounded-[var(--radius-card)] bg-surface p-4"
    >
      {/* ยอดคงเหลือ */}
      <div className="mb-3 text-center">
        <div className="text-xs text-text-muted">คงเหลือ</div>
        <div
          className={`text-2xl font-bold tabular-nums ${
            balance >= 0 ? "text-balance" : "text-expense"
          }`}
        >
          {balance >= 0 ? "+" : "−"}{formatSatang(Math.abs(balance))}
        </div>
      </div>

      {/* รายรับ / รายจ่าย */}
      <div className="flex justify-between border-t border-border pt-3">
        <div className="text-center">
          <div className="text-xs text-text-muted">รายรับ</div>
          <div className="text-sm font-semibold text-income tabular-nums">
            +{formatSatang(income)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-muted">รายจ่าย</div>
          <div className="text-sm font-semibold text-expense tabular-nums">
            −{formatSatang(expense)}
          </div>
        </div>
      </div>
    </div>
  );
}
