/**
 * useTransactionsHook — hook สำหรับหน้าแรก
 * จัดการ month state + fetch transactions + optimistic update
 *
 * กติกา:
 * - month sync กับ URL param ?m=YYYY-MM-01
 * - summary คำนวณจาก transactions (ไม่ hardcode ใน component)
 * - optimistic update: เพิ่ม transaction ชั่วคราว แล้ว replace เมื่อ server ตอบ
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getMonthData } from "@/app/actions/get-month-data";
import { createClient } from "@/lib/supabase/client";
import { computeSummary, type MonthSummary } from "@/lib/summary";

export type TransactionItem = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null;
  kind: "income" | "expense" | "transfer";
  amount: number;
  note: string | null;
  occurred_at: string;
  client_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  accounts: { id: string; name: string } | null;
  to_accounts: { id: string; name: string } | null;
  categories: { id: string; name: string; icon: string | null } | null;
};

export type TransactionsHook = {
  month: string;
  setMonth: (m: string) => void;
  transactions: TransactionItem[];
  summary: MonthSummary;
  isLoading: boolean;
  error: string | null;
  addOptimistic: (tx: TransactionItem) => void;
  refresh: () => Promise<void>;
};

function getInitialMonth(): string {
  if (typeof window === "undefined") {
    // SSR: return default month (จะถูก override โดย client effect)
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return parts.slice(0, 7) + "-01";
  }
  const params = new URLSearchParams(window.location.search);
  const m = params.get("m");
  if (m && /^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
  // default = เดือนปัจจุบัน ตาม Asia/Bangkok
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts.slice(0, 7) + "-01";
}

export function useTransactionsHook(): TransactionsHook {
  const [month, setMonthState] = useState<string>(getInitialMonth);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // คำนวณ date range จาก month string
  const getDateRange = useCallback(
    (monthStr: string) => {
      const [y, m] = monthStr.split("-").map(Number);
      const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+07:00`);
      let endYear = y;
      let endMonth = m + 1;
      if (endMonth > 12) {
        endMonth = 1;
        endYear += 1;
      }
      const end = new Date(`${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00+07:00`);
      return {
        date_from: start.toISOString(),
        date_to: end.toISOString(),
      };
    },
    []
  );

  // ดึงข้อมูล
  const fetchData = useCallback(
    async (monthStr: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const range = getDateRange(monthStr);
        const result = await getMonthData(range);

        if ("error" in result) {
          setError(result.error);
        } else {
          setTransactions(result.data.recent);
          setSummary(result.data.summary);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
      }
    },
    [getDateRange]
  );

  // ดึงข้อมูลเมื่อ month เปลี่ยน
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchData(month);
      } else {
        setError("ไม่ได้เข้าสู่ระบบ");
        setIsLoading(false);
      }
    });
  }, [month, fetchData]);

  // sync month → URL (ใช้ history.replaceState ไม่ trigger re-render)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("m", month);
    const newSearch = `?${params.toString()}`;
    if (window.location.search !== newSearch) {
      window.history.replaceState(null, "", `${window.location.pathname}${newSearch}`);
    }
  }, [month]);

  const setMonth = useCallback((m: string) => {
    setMonthState(m);
  }, []);

  const addOptimistic = useCallback((tx: TransactionItem) => {
    setTransactions((prev) => [tx, ...prev]);
    setSummary((prev) => {
      const newSummary = { ...prev };
      if (tx.kind === "income") newSummary.income += tx.amount;
      else if (tx.kind === "expense") newSummary.expense += tx.amount;
      newSummary.balance = newSummary.income - newSummary.expense;
      return newSummary;
    });
  }, []);

  const refresh = useCallback(() => fetchData(month), [fetchData, month]);

  return {
    month,
    setMonth,
    transactions,
    summary,
    isLoading,
    error,
    addOptimistic,
    refresh,
  };
}
