"use client";

/**
 * TrashClient — ฝั่ง client ของหน้าถังขยะ
 *
 * หน้าที่: แสดงรายการ กู้คืน และลบถาวร (มี confirmation ที่ผู้ใช้เห็นชัด —
 * ไม่ใช่แค่กดปุ่มเดียวแล้วหาย ตามสเปกการ์ด)
 * รูปแบบของ confirm: dialog ยืนยันเฉพาะลบถาวรเท่านั้น (กู้คืนไม่ต้องยืนยัน
 * เพราะยังสามารถลบใหม่ได้ ไม่มีทางเสียข้อมูล)
 * โหลดเพิ่ม: ปุ่ม "โหลดเพิ่ม" ด้วย keyset cursor (ไม่ infinite-scroll
 * เพื่อให้คุมได้ว่าโหลดตอนไหน)
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  TrashRow,
  TrashCursor,
} from "@/app/actions/trash-types";
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
      // เอาออกจากถังขยะ + refresh route ฝั่ง server (listTransactions บนหน้าอื่นจะเห็นรายการคืน)
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
      <div className="rounded-card border border-border bg-surface p-8 text-center">
        <p className="text-text-muted">ถังขยะว่างเปล่า</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-btn border border-border bg-surface p-3 text-expense" role="alert">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2 list-none m-0 p-0">
        {items.map((row) => (
          <li
            key={row.id}
            className="rounded-card border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-text-muted">
                  {kindLabel[row.kind]}
                  {row.category_name ? ` · ${row.category_name}` : ""}
                  {row.account_name ? ` · ${row.account_name}` : ""}
                </p>
                {row.note && (
                  <p className="mt-0.5 truncate text-sm">{row.note}</p>
                )}
                <p className="mt-0.5 text-xs text-text-muted">
                  ลบเมื่อ{" "}
                  {new Intl.DateTimeFormat("th-TH", {
                    timeZone: "Asia/Bangkok",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(row.deleted_at))}
                </p>
              </div>
              <p
                className={`shrink-0 tabular-nums font-semibold ${
                  row.kind === "income" ? "text-income" : "text-expense"
                }`}
              >
                {formatSatang(row.amount)}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onRestore(row.id)}
                className="min-h-11 flex-1 rounded-btn border border-border bg-bg px-3 text-sm font-medium text-text hover:bg-surface-2 disabled:opacity-50"
              >
                กู้คืน
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingId(row.id)}
                className="min-h-11 flex-1 rounded-btn bg-expense px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                ลบถาวร
              </button>
            </div>

            {confirmingId === row.id && (
              <div className="mt-3 rounded-btn border border-border bg-bg p-3">
                <p className="mb-3 text-sm">
                  ลบถาวรรายการนี้? ลบแล้วจะกู้คืนไม่ได้อีก
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDeleteConfirmed(row.id)}
                    className="min-h-11 flex-1 rounded-btn bg-expense px-3 text-sm font-medium text-white hover:opacity-90"
                  >
                    ยืนยันลบถาวร
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="min-h-11 flex-1 rounded-btn border border-border bg-surface px-3 text-sm hover:bg-surface-2"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {cursor && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore || pending}
          className="mt-4 min-h-11 w-full rounded-btn border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
        >
          {loadingMore ? "กำลังโหลด…" : "โหลดเพิ่ม"}
        </button>
      )}
    </div>
  );
}
