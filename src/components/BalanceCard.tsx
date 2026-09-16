"use client";

import { formatSatang } from "@/lib/format-satang";

type Props = {
  income: number;
  expense: number;
  balance: number;
};

export default function BalanceCard({ income, expense, balance }: Props) {
  return (
    <div
      className="rounded-2xl bg-balance p-5 text-white shadow-md"
      style={{ viewTransitionName: "balance-card" }}
    >
      <p className="text-sm opacity-80">ยอดคงเหลือเดือนนี้</p>
      <p
        className="mt-1 text-3xl font-bold tabular-nums"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatSatang(balance)}
      </p>

      <div className="mt-4 flex gap-6">
        <div>
          <p className="flex items-center gap-1 text-xs opacity-80">
            <span className="inline-block h-2 w-2 rounded-full bg-income" />
            รับ
          </p>
          <p
            className="text-base font-semibold tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatSatang(income)}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs opacity-80">
            <span className="inline-block h-2 w-2 rounded-full bg-white/60" />
            จ่าย
          </p>
          <p
            className="text-base font-semibold tabular-nums"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatSatang(expense)}
          </p>
        </div>
      </div>
    </div>
  );
}
