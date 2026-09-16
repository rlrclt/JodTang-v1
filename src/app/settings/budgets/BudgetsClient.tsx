"use client";

/**
 * Client component ของ /settings/budgets — ตั้ง/แก้/ล้างงบ ต่อหมวดต่อเดือน
 *
 * เหตุผลที่อยู่ใน client:
 * - เปลี่ยนเดือน = กด `<` `>` เลื่อน URL (?m=YYYY-MM) — App Router navigation ไม่ reload หน้า
 * - แก้งบใช้ server action (upsertBudget) + useOptimistic ให้ยอดปรับทันที (PLAN §5)
 * - งบ 0 กับ "ยังไม่ตั้งงบ" เป็นของละต่างกัน (budgetSatang = null ถ้าไม่ตั้ง) — แสดงต่างกันตลอด
 */

import { useRouter, usePathname } from "next/navigation";
import { useOptimistic, useTransition, useState } from "react";
import { upsertBudget, deleteBudget } from "@/app/actions/budgets";
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
  /** null = ยังไม่ตั้งงบ · id ของแถวงบถ้าตั้งแล้ว (ใช้ตอน DELETE) */
  budgetId: string | null;
  /** null = ยังไม่ตั้งงบ · สตางค์ ถ้าตั้งแล้ว */
  budgetSatang: bigint | null;
  spentSatang: bigint;
};

type CategoryLite = { id: string; name: string; icon: string | null };

type Props = {
  year: number;
  month: number;
  rows: BudgetRowClient[];
  categories: CategoryLite[];
  formatBaht: (satang: bigint | number) => string;
};

export default function BudgetsClient(props: Props) {
  const { year, month, rows, formatBaht } = props;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // optimistic list — แก้งบแล้วเห็นมือก่อน round-trip เสร็จ
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
        // สตางค์จาก action มาเป็น number (server action รับ amount: number)
        return { ...r, budgetSatang: BigInt(action.satang) };
      })
  );

  const [error, setError] = useState<string | null>(null);

  // หลัง upsert/delete สำเร็จ — ขอ server จริง ๆ re-render ใหม่ให้ budgetId ตรง DB
  // (ไม่ reload ธรรมดา แต่ refresh route = Next จะเรียก server component ใหม่โดยไม่กระพริบ)
  function refreshServerState() {
    router.refresh();
  }

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
      setError("กรอกเป็นตัวเลข (บาท) เท่านั้น");
      return;
    }
    const period_month = `${year}-${String(month).padStart(2, "0")}-01`;

    startTransition(async () => {
      applyOptimistic({ type: "set", category_id, satang: Number(satang) });
      try {
        const res = await upsertBudget({
          category_id,
          period_month,
          amount: Number(satang),
        });
        if ("error" in res) setError(res.error);
        else refreshServerState(); // budgetId ที่ได้ใหม่ต้องเด้งกลับมาที่ UI
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "เชื่อมต่อไม่ได้");
      }
    });
  }

  async function clearBudget(category_id: string, budgetId: string | null) {
    setError(null);
    const row = optimisticRows.find((r) => r.category_id === category_id);
    if (!row || row.budgetSatang === null) return; // ยังไม่ตั้งงบ → ไม่มีอะไรให้ล้าง
    if (!budgetId) {
      setError("ระบุ id งบไม่ได้ — ลองโหลดหน้าใหม่ด้วยการเปลี่ยนเดือนกลับไปมา");
      return;
    }

    startTransition(async () => {
      applyOptimistic({ type: "clear", category_id });
      try {
        const res = await deleteBudget(budgetId);
        if ("error" in res) setError(res.error);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "เชื่อมต่อไม่ได้");
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-4">
      <MonthNav year={year} month={month} onNav={navigateMonth} />
      {error && (
        <div className="mb-4 rounded-card border border-warn bg-surface p-3 text-sm">
          {error}
        </div>
      )}
      <ul className="divide-y divide-border">
        {optimisticRows.map((row) => (
          <BudgetRowItem
            key={row.category_id}
            row={row}
            formatBaht={formatBaht}
            onSave={saveBudget}
            onClear={clearBudget}
          />
        ))}
      </ul>
      {optimisticRows.length === 0 && (
        <div className="py-16 text-center text-text-muted">
          ยังไม่มีหมวดหมู่รายจ่าย — ไป
          <a
            href="/settings/categories"
            className="underline min-h-[44px] inline-flex items-center"
          >
            ตั้งค่าหมวด
          </a>
          ก่อน
        </div>
      )}
    </div>
  );
}

/* ─── เลื่อนเดือน ─── */
function MonthNav({
  year,
  month,
  onNav,
}: {
  year: number;
  month: number;
  onNav: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <button
        type="button"
        onClick={() => onNav(-1)}
        aria-label="เดือนก่อนหน้า"
        className="min-h-[44px] min-w-[44px] rounded-btn border border-border bg-surface px-3"
      >
        ‹
      </button>
      <h2 className="text-lg font-semibold tabular-nums">
        {year}-{String(month).padStart(2, "0")}
      </h2>
      <button
        type="button"
        onClick={() => onNav(1)}
        aria-label="เดือนถัดไป"
        className="min-h-[44px] min-w-[44px] rounded-btn border border-border bg-surface px-3"
      >
        ›
      </button>
    </div>
  );
}

/* ─── แถวงบของหมวดหนึ่ง ─── */
function BudgetRowItem({
  row,
  formatBaht,
  onSave,
  onClear,
}: {
  row: BudgetRowClient;
  formatBaht: (satang: bigint | number) => string;
  onSave: (category_id: string, rawText: string) => void;
  onClear: (category_id: string, budgetId: string | null) => void;
}) {
  const state = budgetStateLabel(row.budgetSatang);
  const pct = spendPercent(row.spentSatang, row.budgetSatang);
  const warn = shouldWarn(row.spentSatang, row.budgetSatang);
  const [draft, setDraft] = useState<string>(() =>
    row.budgetSatang === null ? "" : satangToBahtText(row.budgetSatang)
  );

  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden>
          {row.icon ?? "•"}
        </span>
        <span className="font-medium">{row.name}</span>
        {row.icon === null && (
          <span className="sr-only">(ไม่มีไอคอน อ่านจากชื่อแทน)</span>
        )}
      </div>

      {state === "none" ? (
        <p className="text-text-muted text-sm">
          ยังไม่ตั้งงบ · ใช้ไป {formatBaht(row.spentSatang)}
        </p>
      ) : state === "zero" ? (
        <p className="text-text-muted text-sm">
          งบ 0 บาท · ใช้ไป {formatBaht(row.spentSatang)}
        </p>
      ) : (
        <p className="text-sm">
          งบ {formatBaht(row.budgetSatang!)} · ใช้ไป{" "}
          {formatBaht(row.spentSatang)}
          {pct !== null && (
            <span className="tabular-nums">
              {" "}({pct}%)
            </span>
          )}
        </p>
      )}

      {warn && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-card bg-surface-2 p-2 text-sm"
        >
          <span aria-hidden>⚠️</span>
          <span>
            ใช้ไปแล้ว {pct}% ของงบ — ใกล้หมด
          </span>
        </div>
      )}

      {/* เตือนแบบข้อความไม่ใช่สี (ผู้พิการสีอ่านได้) */}
      <p className="sr-only">
        {state === "none"
          ? "ไม่มีงบ"
          : warn
            ? "เตือน: ใช้งบเกินเกณฑ์"
            : "ปกติ"}
      </p>

      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`budget-${row.category_id}`}>
          งบของ {row.name}
        </label>
        <input
          id={`budget-${row.category_id}`}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="เช่น 5000 หรือ 5000.00"
          className="min-h-[44px] flex-1 rounded-input border border-border bg-surface px-3 text-base tabular-nums"
        />
        <button
          type="button"
          onClick={() => onSave(row.category_id, draft)}
          className="min-h-[44px] min-w-[64px] rounded-btn bg-balance px-4 text-sm text-white"
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
            className="min-h-[44px] min-w-[44px] rounded-btn border border-border bg-surface px-3 text-sm"
            aria-label={`ล้างงบ ${row.name}`}
          >
            ล้าง
          </button>
        )}
      </div>
    </li>
  );
}
