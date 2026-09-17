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

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTransactionsLive } from "./useTransactionsLive";
import { getMonthData } from "@/app/actions/get-month-data";
import { listAccountsWithBalances } from "@/app/actions/accounts";
import type { AccountBalance } from "@/lib/account-balance";
import { createClient } from "@/lib/supabase/client";
import type { MonthSummary } from "@/lib/summary";

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
  accountBalances: AccountBalance[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  addOptimistic: (tx: TransactionItem) => void;
  refresh: () => Promise<void>;
};

// แคชเดือนฝั่ง client — ไฟล์นี้ใช้เฉพาะ client component จึงไม่แชร์ข้าม request
// เก็บแค่ 3 เดือนรอบตัว (ก่อนหน้า/ปัจจุบัน/ถัดไป) สำหรับสไลด์นิ้วเปลี่ยนเดือนแบบไม่รอ
type HomeMonthEntry = {
  transactions: TransactionItem[];
  summary: MonthSummary;
  accountBalances: AccountBalance[];
  cachedAt: number;
};

const homeMonthCache = new Map<string, HomeMonthEntry>();
const HOME_CACHE_MAX = 3;
const HOME_CACHE_STALE_MS = 60_000;

// เขียนแคชแบบเลื่อนเป็นล่าสุด + ตัดเดือนเก่าสุดทิ้งเมื่อเกิน 3
function writeHomeCache(
  monthStr: string,
  data: Omit<HomeMonthEntry, "cachedAt">
) {
  homeMonthCache.delete(monthStr);
  homeMonthCache.set(monthStr, { ...data, cachedAt: Date.now() });
  while (homeMonthCache.size > HOME_CACHE_MAX) {
    const oldest = homeMonthCache.keys().next().value;
    if (oldest === undefined) break;
    homeMonthCache.delete(oldest);
  }
}

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
  const router = useRouter();
  const [month, setMonthState] = useState<string>(getInitialMonth);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [summary, setSummary] = useState<MonthSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialRef = useRef(false);

  // month ล่าสุดสำหรับ revalidate ตอนกลับมาโฟกัส (อ่านผ่าน ref กัน effect ผูกใหม่ทุกครั้ง)
  const monthRef = useRef(month);
  // markFresh ถูกกำหนดหลัง fetchData — ฝากผ่าน ref เพื่อเรียกใน success path ได้
  const markFreshRef = useRef<() => void>(() => {});

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

  // ดึงข้อมูลดิบของเดือน (throw เมื่อพัง — ผู้เรียกเลือกเองว่าจะโชว์ skeleton หรือคงของเก่า)
  const loadMonth = useCallback(
    async (monthStr: string) => {
      const range = getDateRange(monthStr);
      const [result, accountResult] = await Promise.all([
        getMonthData(range),
        listAccountsWithBalances(),
      ]);

      if ("error" in result) throw new Error(result.error);
      if ("error" in accountResult) throw new Error(accountResult.error);
      return {
        transactions: result.data.recent,
        summary: result.data.summary,
        accountBalances: accountResult.data,
      };
    },
    [getDateRange]
  );

  // ดึงข้อมูล
  // - เคยมีในแคช: เสียบของเก่าทันที (ไม่โชว์ skeleton) เก่าเกิน 60 วิค่อยรีเฟรชเงียบข้างหลัง
  // - ไม่เคยมี: silent=false โชว์ skeleton / silent=true คงจอเดิมไว้
  const fetchData = useCallback(
    async (monthStr: string, silent = false) => {
      const cached = homeMonthCache.get(monthStr);
      if (cached) {
        setTransactions(cached.transactions);
        setSummary(cached.summary);
        setAccountBalances(cached.accountBalances);
        setError(null);
        setIsLoading(false);
        if (Date.now() - cached.cachedAt < HOME_CACHE_STALE_MS) {
          markFreshRef.current();
          return;
        }
        try {
          const fresh = await loadMonth(monthStr);
          writeHomeCache(monthStr, fresh);
          setTransactions(fresh.transactions);
          setSummary(fresh.summary);
          setAccountBalances(fresh.accountBalances);
          markFreshRef.current();
        } catch {
          // เน็ตหล่นตอนรีเฟรชเงียบ — คงของเก่าไว้ ไม่โชว์ error
        }
        return;
      }
      // ถ้าเคยโหลดหน้าแรกสำเร็จแล้ว การเปลี่ยนเดือน/ปีถัดไปจะไม่ตัดเข้า Skeleton เต็มหน้า
      // เพื่อคงฟอร์มและปฏิทินไว้ ไม่ให้หน้ากะพริบหรือดีดหลุด
      if (!hasLoadedInitialRef.current) {
        setIsLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      try {
        const fresh = await loadMonth(monthStr);
        writeHomeCache(monthStr, fresh);
        setTransactions(fresh.transactions);
        setSummary(fresh.summary);
        setAccountBalances(fresh.accountBalances);
        hasLoadedInitialRef.current = true;
        markFreshRef.current();
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [loadMonth]
  );

  // ดึงข้อมูลเมื่อ month เปลี่ยน
  useEffect(() => {
    monthRef.current = month;
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

  // กลับมาโฟกัสแล้วข้อมูลเก่าเกิน 60 วิ → ดึงเดือนปัจจุบันใหม่ (เงียบ ไม่โชว์ skeleton)
  const markFresh = useTransactionsLive(
    useCallback(() => {
      void fetchData(monthRef.current, true);
    }, [fetchData])
  );
  // ฝาก markFresh ไว้ให้ fetchData เรียกตอนดึงสำเร็จ — ทำใน effect ห้ามแตะ ref ตอน render
  useEffect(() => {
    markFreshRef.current = markFresh;
  });

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

  const refresh = useCallback(async () => {
    // ล้าง router cache ด้วย — กันแท็บอื่นโชว์ยอดก่อน mutation (staleTimes จำไว้ 60 วิ)
    router.refresh();
    // ล้างแคชเดือนนี้ด้วย — เพิ่งมีการเปลี่ยนแปลง ต้องเอาของใหม่สถานเดียว
    // (กันของเก่าในแคชทับ optimistic update ที่โชว์อยู่)
    homeMonthCache.delete(month);
    // silent: คงของเก่าไว้ (รวม optimistic) แล้วเสียบของจริงทับ — ไม่วูบ skeleton
    await fetchData(month, true);
  }, [fetchData, month, router]);
  return {
    month,
    setMonth,
    transactions,
    summary,
    accountBalances,
    isLoading,
    isFetching,
    error,
    addOptimistic,
    refresh,
  };
}
