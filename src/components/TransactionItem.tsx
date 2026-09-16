"use client";

import { formatSatang } from "@/lib/format-satang";

type Props = {
  kind: "income" | "expense" | "transfer";
  note: string | null;
  amount: number;
  category_name: string | null;
  account_name: string | null;
  to_account_name: string | null;
  occurred_at: string;
  on_click?: () => void;
};

/**
 * รายการธุรกรรมเดี่ยว — min-height ≥ 56px, ใช้ button (ไม่ใช้ div+onClick)
 * แสดง sign + amount ด้วย formatSatang + tabular-nums
 */
export default function TransactionItem({
  kind,
  note,
  amount,
  category_name,
  account_name,
  to_account_name,
  occurred_at,
  on_click,
}: Props) {
  const sign = kind === "income" ? "+" : "−";
  const kindLabel =
    kind === "income" ? "รายรับ" : kind === "expense" ? "รายจ่าย" : "โอน";

  const displayNote = note || kindLabel;
  const sublabel =
    kind === "transfer"
      ? `${account_name || ""} → ${to_account_name || ""}`
      : category_name || account_name || "";

  return (
    <button
      type="button"
      onClick={on_click}
      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-120 hover:bg-surface active:bg-surface-2"
    >
      {/* Icon / category indicator */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
          kind === "income"
            ? "bg-green-50 text-income"
            : kind === "expense"
              ? "bg-red-50 text-expense"
              : "bg-blue-50 text-balance"
        }`}
      >
        {kind === "income" ? "↓" : kind === "expense" ? "↑" : "⇄"}
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">
          {displayNote}
        </div>
        {sublabel && (
          <div className="truncate text-xs text-text-muted">{sublabel}</div>
        )}
      </div>

      {/* Amount */}
      <div
        className={`flex-shrink-0 text-right text-sm font-semibold tabular-nums ${
          kind === "income"
            ? "text-income"
            : kind === "expense"
              ? "text-expense"
              : "text-balance"
        }`}
      >
        {sign}{formatSatang(amount)}
      </div>
    </button>
  );
}
