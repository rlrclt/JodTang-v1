"use client";

import { formatSatang } from "@/lib/format-satang";
import type { TransactionItem as TxItem } from "@/hooks/useTransactionsHook";

/** แปลง kind เป็น label ภาษาไทย */
function kindLabel(kind: TxItem["kind"]): string {
  switch (kind) {
    case "income":
      return "รับ";
    case "expense":
      return "จ่าย";
    case "transfer":
      return "โอน";
  }
}

/** แปลง kind เป็นสี */
function kindColor(kind: TxItem["kind"]): string {
  switch (kind) {
    case "income":
      return "text-income";
    case "expense":
      return "text-expense";
    case "transfer":
      return "text-text-muted";
  }
}

/** แปลงวันที่เป็นรูปแบบสั้น (16 ก.ย.) */
function shortDate(isoDate: string): string {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
  }).format(d);
}

type Props = {
  transaction: TxItem;
};

export default function TransactionItemComponent({ transaction }: Props) {
  const tx = transaction;
  const sign = tx.kind === "expense" ? "−" : tx.kind === "income" ? "+" : "";
  const categoryName = tx.categories?.name ?? "ไม่มีหมวด";
  const accountName = tx.accounts?.name ?? "";
  const toAccountName = tx.to_accounts?.name ?? "";

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3">
      {/* ไอคอนหมวด */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-lg">
        {tx.categories?.icon ?? "💰"}
      </div>

      {/* รายละเอียด */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{categoryName}</span>
          <span
            className={`flex-shrink-0 text-sm font-semibold tabular-nums ${kindColor(tx.kind)}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {sign}
            {formatSatang(tx.amount)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <span>{kindLabel(tx.kind)}</span>
          {tx.kind === "transfer" && toAccountName && (
            <span>→ {toAccountName}</span>
          )}
          {accountName && <span>· {accountName}</span>}
          {tx.note && <span className="truncate">· {tx.note}</span>}
        </div>
      </div>

      {/* วันที่ */}
      <span className="flex-shrink-0 text-xs text-text-muted">
        {shortDate(tx.occurred_at)}
      </span>
    </li>
  );
}
