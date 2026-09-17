"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import TransactionItem from "@/components/TransactionItem";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import BalanceCard from "@/components/BalanceCard";
import MonthSelector from "@/components/MonthSelector";
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

  return (
    <div className="min-h-[100dvh]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm">
        <div className="px-4 pt-4 pb-2">
          <h1 className="mb-3 text-xl font-bold text-text">รายการทั้งหมด</h1>
          <MonthSelector year={year} month={month} filters={initialFilters} />
        </div>
        <div className="py-2">
          <BalanceCard income={totalIncome} expense={totalExpense} />
        </div>
        <div className="py-2">
          <FilterBar accounts={accounts} categories={categories} />
        </div>
      </div>

      {/* Transaction list */}
      <div className="mt-2 pb-28">
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
          }}
        />
      )}
    </div>
  );
}
