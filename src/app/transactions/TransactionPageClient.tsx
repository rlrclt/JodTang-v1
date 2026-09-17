"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTransactionsLive } from "@/hooks/useTransactionsLive";
import { useSwipeMonth } from "@/hooks/useSwipeMonth";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";
import { buildTransactionParams } from "@/lib/transaction-params";
import TransactionItem from "@/components/TransactionItem";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import MonthCalendar from "@/components/MonthCalendar";
import FilterBar from "@/components/FilterBar";
import TransactionListSkeleton from "@/components/TransactionListSkeleton";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";

type TransactionRow = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  note: string | null;
  occurred_at: string;
  accounts: { id: string; name: string } | null;
  to_accounts: { id: string; name: string } | null;
  categories: { id: string; name: string; icon: string | null } | null;
};

type Cursor = { occurred_at: string; id: string } | null;

type Props = {
  initialItems: TransactionRow[];
  nextCursor: Cursor;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
  initialFilters: Record<string, string>;
};

/**
 * Client component สำหรับ /transactions — จัดการ keyset infinite scroll
 */
export default function TransactionPageClient({
  initialItems,
  nextCursor: initialCursor,
  year,
  month,
  totalIncome,
  totalExpense,
  accounts,
  categories,
  initialFilters,
}: Props) {
  const [items, setItems] = useState<TransactionRow[]>(initialItems);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigate = useSmoothNavigate();

  // URL เดือนข้างๆ (คงตัวกรองเดิม) — ใช้ทั้งสไลด์นิ้วและ prefetch ล่วงหน้า
  const monthUrl = useCallback(
    (delta: number) => {
      let m = month + delta;
      let y = year;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      const params = buildTransactionParams({
        month: m,
        year: y,
        filters: initialFilters as any,
      });
      return `/transactions?${params.toString()}`;
    },
    [month, year, initialFilters]
  );

  // อุ่นเดือนข้างๆ ล่วงหน้า — สไลด์ไปจะได้ไม่ต้องรอ (มีผลเฉพาะ production)
  useEffect(() => {
    router.prefetch(monthUrl(-1));
    router.prefetch(monthUrl(1));
  }, [router, monthUrl]);

  // สไลด์นิ้วซ้าย/ขวาเพื่อเปลี่ยนเดือน (ทิศตรงกับท่า transition)
  const { swipeRef, swipeHandlers, swipeStyle } = useSwipeMonth({
    onSwipeLeft: () => navigate(monthUrl(1), { direction: "forward" }),
    onSwipeRight: () => navigate(monthUrl(-1), { direction: "back" }),
  });

  // กลับมาโฟกัสแล้วข้อมูลเก่าเกิน 60 วิ → สั่ง server รีเฟรชเงียบ (ไม่โชว์ loading)
  const markFresh = useTransactionsLive(
    useCallback(() => {
      router.refresh();
    }, [router])
  );
  useEffect(() => {
    // เพิ่ง render จาก server = สดแล้ว
    markFresh();
  }, [markFresh]);

  // โหลดหน้าถัดไป (keyset)
  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(null);

    try {
      const sp = new URLSearchParams();
      sp.set("cursor_occurred_at", cursor.occurred_at);
      sp.set("cursor_id", cursor.id);

      const res = await fetch(`/api/transactions/next?${sp.toString()}`);
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");

      const data = await res.json();
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.next_cursor);
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  // Intersection Observer สำหรับ infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && cursor) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, loading, cursor]);

  const monthStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const summary = useMemo(() => ({
    income: totalIncome,
    expense: totalExpense,
    balance: totalIncome - totalExpense,
  }), [totalIncome, totalExpense]);

  const handleMonthChange = useCallback((newMonthStr: string) => {
    const [y, m] = newMonthStr.split("-").map(Number);
    const params = buildTransactionParams({
      month: m,
      year: y,
      filters: initialFilters as any,
    });
    navigate(`/transactions?${params.toString()}`);
  }, [initialFilters, navigate]);

  return (
    <div className="min-h-[100dvh] p-4">
      {/* Header — เหมือนหน้าแรก ใช้ MonthCalendar (iOS Zoom & Dynamic Capsule) */}
      <div className="mb-3">
        <MonthCalendar
          month={monthStr}
          setMonth={handleMonthChange}
          summary={summary}
        />
      </div>

      {/* Filter bar */}
      <div className="mb-2">
        <FilterBar accounts={accounts} categories={categories} />
      </div>
      {/* Transaction list — สไลด์เฉพาะส่วนนี้ เฮดเดอร์ค้างที่เดิม */}
      <div
        ref={swipeRef}
        {...swipeHandlers}
        style={swipeStyle}
        className="mt-2"
      >
        {items.length === 0 && !loading ? (
          <EmptyState />
        ) : (
          <>
            {items.map((item) => (
              <TransactionItem
                key={item.id}
                kind={item.kind}
                note={item.note}
                amount={item.amount}
                category_name={item.categories?.name ?? null}
                account_name={item.accounts?.name ?? null}
                to_account_name={item.to_accounts?.name ?? null}
                occurred_at={item.occurred_at}
                on_click={() => setSelectedTx(item)}
              />
            ))}
          </>
        )}

        {error && (
          <ErrorState message={error} on_retry={loadMore} />
        )}

        {loading && <TransactionListSkeleton />}

        {/* Sentinel สำหรับ infinite scroll */}
        {cursor && <div ref={sentinelRef} className="h-4" />}

        {!cursor && items.length > 0 && (
          <div className="py-4 text-center text-sm text-text-muted">
            — หมดแล้ว —
          </div>
        )}
      </div>

      {selectedTx && (
        <TransactionDetailSheet
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onUpdated={() => {
            window.location.reload();
          }}
          onDeleted={() => {
            setItems((prev) => prev.filter((it) => it.id !== selectedTx.id));
            setSelectedTx(null);
            // ลบแบบ local-only เลยต้องล้าง router cache เอง — กันแท็บอื่นโชว์ยอดเก่า
            router.refresh();
            markFresh();
          }}
        />
      )}
    </div>
  );
}
