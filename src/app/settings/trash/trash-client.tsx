"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TrashRow, TrashCursor } from "@/app/actions/trash-types";
import { deleteForever, restoreFromTrash } from "@/app/actions/trash";
import { listTrash } from "@/app/actions/trash-list";
import { formatSatang } from "@/lib/format-satang";

export default function TrashClient({
  initialItems,
  initialCursor,
}: {
  initialItems: TrashRow[];
  initialCursor: TrashCursor | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<TrashRow[]>(initialItems);
  const [cursor, setCursor] = useState<TrashCursor | null>(initialCursor);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, startTransition] = useTransition();

  const kindLabel = { income: "รายรับ", expense: "รายจ่าย", transfer: "โอน" } as const;

  function onRestore(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await restoreFromTrash(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  function onDeleteConfirmed(id: string) {
    setError(null);
    setConfirmingId(null);
    startTransition(async () => {
      const res = await deleteForever(id);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  async function onLoadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setError(null);
    const res = await listTrash({ cursor, limit: 50 });
    setLoadingMore(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setItems((prev) => [...prev, ...res.data.items]);
    setCursor(res.data.next_cursor);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-border/40 bg-surface/60 p-12 text-center backdrop-blur-xl">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 mx-auto mb-3 text-2xl shadow-inner">
          🗑️
        </div>
        <p className="font-bold text-text text-base">ถังขยะว่างเปล่า</p>
        <p className="text-xs text-text-muted mt-1">ไม่มีรายการที่ถูกลบอยู่ในระบบ</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 backdrop-blur-xl" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((row) => (
          <div
            key={row.id}
            className="group relative overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-surface/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-border/80"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                    {kindLabel[row.kind]}
                  </span>
                  {row.category_name && (
                    <span className="text-xs font-bold text-text truncate">
                      {row.category_name}
                    </span>
                  )}
                  {row.account_name && (
                    <span className="text-xs text-text-muted">
                      · {row.account_name}
                    </span>
                  )}
                </div>

                {row.note && (
                  <p className="mt-1 truncate text-xs text-text/90 font-medium">
                    {row.note}
                  </p>
                )}

                <p className="mt-1 text-[10px] text-text-muted">
                  ลบเมื่อ{" "}
                  {new Intl.DateTimeFormat("th-TH", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.deleted_at))}
                </p>
              </div>

              <div
                className={`shrink-0 tabular-nums font-extrabold text-sm ${
                  row.kind === "income" ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {row.kind === "income" ? "+" : "-"}
                {formatSatang(row.amount)}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 flex gap-2 pt-2 border-t border-border/30">
              <button
                type="button"
                disabled={pending}
                onClick={() => onRestore(row.id)}
                className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface-2/60 px-3 text-xs font-bold text-text hover:bg-surface-2 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>↩</span>
                <span>กู้คืน</span>
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingId(row.id)}
                className="flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-bold text-rose-500 hover:bg-rose-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>✕</span>
                <span>ลบถาวร</span>
              </button>
            </div>

            {/* Permanent Delete Confirmation Dialog */}
            {confirmingId === row.id && (
              <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 animate-in fade-in zoom-in-95">
                <p className="text-xs font-bold text-rose-500 mb-2.5 text-center">
                  ⚠️ ยืนยันลบถาวร? ข้อมูลจะถูกลบและไม่สามารถกู้คืนได้อีก
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDeleteConfirmed(row.id)}
                    className="flex-1 min-h-[36px] rounded-xl bg-rose-500 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-600 active:scale-95 transition-all"
                  >
                    ยืนยันลบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="flex-1 min-h-[36px] rounded-xl border border-border/60 bg-surface px-3 text-xs font-bold text-text-muted hover:text-text active:scale-95 transition-all"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {cursor && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore || pending}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-border/60 bg-surface/80 px-4 py-2.5 text-xs font-bold text-text shadow-sm backdrop-blur-xl hover:bg-surface-2 active:scale-95 disabled:opacity-50 transition-all"
        >
          {loadingMore ? "กำลังโหลด…" : "โหลดเพิ่มเติม"}
        </button>
      )}
    </div>
  );
}
