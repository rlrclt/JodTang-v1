"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, useState } from "react";
import { upsertBudget, deleteBudget } from "@/app/actions/budgets";
import { formatSatang } from "@/lib/format-satang";
import { SmoothLink } from "@/components/SmoothLink";
import CategoryIcon, { isCategoryIconName } from "@/components/CategoryIcon";
import {
  bahtTextToSatang,
  satangToBahtText,
  spendPercent,
  shouldWarn,
  budgetStateLabel,
  shiftMonth,
  toMonthKey,
} from "./logic";

export type BudgetRowClient = {
  category_id: string;
  name: string;
  icon: string | null;
  budgetId: string | null;
  budgetSatang: bigint | null;
  spentSatang: bigint;
};

type CategoryLite = { id: string; name: string; icon: string | null };

type Props = {
  year: number;
  month: number;
  rows: BudgetRowClient[];
  categories: CategoryLite[];
};

export default function BudgetsClient(props: Props) {
  const { year, month, rows } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [optimisticRows, applyOptimistic] = useOptimistic(
    rows,
    (
      current: BudgetRowClient[],
      action:
        | { type: "set"; category_id: string; satang: number }
        | { type: "clear"; category_id: string }
    ) =>
      current.map((r) => {
        if (r.category_id !== action.category_id) return r;
        if (action.type === "clear") return { ...r, budgetSatang: null };
        return { ...r, budgetSatang: BigInt(action.satang) };
      })
  );

  const [error, setError] = useState<string | null>(null);

  function navigateMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    startTransition(() => {
      router.push(`/settings/budgets?m=${toMonthKey(next.year, next.month)}`);
    });
  }

  async function saveBudget(category_id: string, rawText: string) {
    setError(null);
    const satang = bahtTextToSatang(rawText);
    if (satang === null) {
      setError("กรุณากรอกเป็นตัวเลข (บาท) เท่านั้น");
      return;
    }

    startTransition(() => {
      applyOptimistic({ type: "set", category_id, satang: Number(satang) });
    });

    const period_month = `${year}-${String(month).padStart(2, "0")}-01`;
    const res = await upsertBudget({
      category_id,
      period_month,
      amount: Number(satang),
    });

    if ("error" in res) {
      setError(res.error);
    }
    router.refresh();
  }

  async function clearBudget(category_id: string, budgetId: string | null) {
    setError(null);
    if (!budgetId) return;

    startTransition(() => {
      applyOptimistic({ type: "clear", category_id });
    });

    const res = await deleteBudget(budgetId);
    if ("error" in res) {
      setError(res.error);
    }
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center gap-3 mb-5">
        <SmoothLink
          href="/settings"
          direction="back"
          className="flex size-10 items-center justify-center rounded-full border border-white/20 dark:border-white/10 bg-surface/80 text-text shadow-sm backdrop-blur-xl transition-all active:scale-95 hover:bg-surface-2"
          aria-label="กลับไปหน้าตั้งค่า"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </SmoothLink>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">งบประมาณ</h1>
          <p className="text-xs text-text-muted">ตั้งงบรายเดือนและควบคุมค่าใช้จ่าย</p>
        </div>
      </header>

      {/* Month Navigator Glass Card */}
      <div className="mb-5 flex items-center justify-between rounded-3xl border border-white/25 dark:border-white/10 bg-surface/80 p-2 shadow-sm backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          aria-label="เดือนก่อนหน้า"
          className="flex size-10 items-center justify-center rounded-2xl bg-surface-2/60 text-text-muted hover:text-text active:scale-95 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">รอบเดือน</span>
          <span className="text-base font-extrabold tabular-nums text-text">
            {year}-{String(month).padStart(2, "0")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          aria-label="เดือนถัดไป"
          className="flex size-10 items-center justify-center rounded-2xl bg-surface-2/60 text-text-muted hover:text-text active:scale-95 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 backdrop-blur-xl">
          {error}
        </div>
      )}

      {/* Budget Items List */}
      <div className="space-y-3">
        {optimisticRows.map((row) => (
          <BudgetRowItem
            key={`${year}-${month}-${row.category_id}`}
            row={row}
            onSave={saveBudget}
            onClear={clearBudget}
          />
        ))}

        {optimisticRows.length === 0 && (
          <div className="rounded-3xl border border-border/40 bg-surface/60 p-8 text-center backdrop-blur-xl">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 mx-auto mb-2 text-2xl">
              📊
            </div>
            <p className="font-semibold text-text text-sm">ยังไม่มีหมวดหมู่รายจ่าย</p>
            <p className="text-xs text-text-muted mt-0.5">
              กรุณาไป{" "}
              <SmoothLink href="/settings/categories" className="text-focus underline font-bold">
                เพิ่มหมวดหมู่
              </SmoothLink>{" "}
              ก่อนตั้งงบประมาณ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BudgetRowItem({
  row,
  onSave,
  onClear,
}: {
  row: BudgetRowClient;
  onSave: (category_id: string, rawText: string) => void;
  onClear: (category_id: string, budgetId: string | null) => void;
}) {
  const state = budgetStateLabel(row.budgetSatang);
  const pct = spendPercent(row.spentSatang, row.budgetSatang);
  const warn = shouldWarn(row.spentSatang, row.budgetSatang);
  const [draft, setDraft] = useState<string>(() =>
    row.budgetSatang === null ? "" : satangToBahtText(row.budgetSatang)
  );

  const iconName = row.icon ? row.icon.split("#")[0] : null;
  const isOver = pct !== null && pct >= 100;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-surface/80 p-4 shadow-sm backdrop-blur-xl transition-all">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-surface-2 text-base shadow-inner">
            {iconName && isCategoryIconName(iconName) ? (
              <CategoryIcon icon={iconName} />
            ) : (
              <span>🏷️</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-text tracking-tight">{row.name}</h3>
            <p className="text-[11px] font-semibold text-text-muted">
              {state === "none" ? (
                <span>ยังไม่ตั้งงบ · ใช้ไป {formatSatang(row.spentSatang)}</span>
              ) : (
                <span>
                  งบ {formatSatang(row.budgetSatang!)} · ใช้ไป {formatSatang(row.spentSatang)}
                </span>
              )}
            </p>
          </div>
        </div>

        {pct !== null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${
              isOver
                ? "bg-rose-500/15 text-rose-500"
                : warn
                ? "bg-amber-500/15 text-amber-500"
                : "bg-emerald-500/15 text-emerald-500"
            }`}
          >
            {pct}%
          </span>
        )}
      </div>

      {/* Modern Progress Bar */}
      {pct !== null && (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-2/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOver ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      {warn && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          <span>⚠️</span>
          <span>ใช้ไปแล้ว {pct}% ของงบเดือนนี้ — ใกล้เกินงบ</span>
        </div>
      )}

      {/* Input Group */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id={`budget-${row.category_id}`}
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="จำนวนเงิน (บาท) เช่น 3000"
            className="w-full rounded-2xl border border-border/50 bg-surface-2 px-3.5 py-2.5 text-xs font-bold tabular-nums text-text outline-none focus:border-focus transition-all"
          />
        </div>
        <button
          type="button"
          onClick={() => onSave(row.category_id, draft)}
          className="flex min-h-[36px] items-center justify-center rounded-xl bg-focus px-3.5 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          บันทึก
        </button>
        {state !== "none" && (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onClear(row.category_id, row.budgetId);
            }}
            className="flex min-h-[36px] items-center justify-center rounded-xl border border-border/50 bg-surface px-3 text-xs font-bold text-text-muted hover:text-rose-500 active:scale-95 transition-all"
            aria-label={`ล้างงบ ${row.name}`}
          >
            ล้าง
          </button>
        )}
      </div>
    </div>
  );
}
