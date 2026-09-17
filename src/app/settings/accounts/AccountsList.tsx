"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatSatang } from "@/lib/format-satang";
import {
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
} from "@/app/actions/accounts";
import type { AccountBalance } from "@/lib/account-balance";

type AccountBrief = { id: string; name: string; currency: string };

const ARCHIVE_CONFIRM_MS = 4000;

export default function AccountsList({
  active,
  archived,
}: {
  active: AccountBalance[];
  archived: AccountBrief[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [archivedConfirmId, setArchivedConfirmId] = useState<string | null>(null);

  const locked = isPending;

  const invalidate = () => {
    startTransition(() => router.refresh());
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || locked) return;
    setNewName("");
    setAdding(false);
    const r = await createAccount({ name });
    if ("error" in r) {
      setError(r.error);
      setAdding(true);
      setNewName(name);
      return;
    }
    setError(null);
    invalidate();
  };

  const handleRename = async () => {
    const name = newName.trim();
    if (!editingId || !name || locked) return;
    const r = await updateAccount(editingId, { name });
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setError(null);
    setEditingId(null);
    setNewName("");
    invalidate();
  };

  const handleArchive = async (id: string) => {
    if (locked) return;
    const r = await archiveAccount(id);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setError(null);
    setArchivedConfirmId(null);
    invalidate();
  };

  const handleRestore = async (id: string) => {
    if (locked) return;
    const r = await restoreAccount(id);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setError(null);
    invalidate();
  };

  return (
    <main className="space-y-4">
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-500 backdrop-blur-xl">
          {error}
        </div>
      )}

      {/* Action Add Button */}
      {!adding && (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setNewName("");
          }}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-focus/40 bg-focus/5 px-4 py-3 text-sm font-bold text-focus shadow-sm backdrop-blur-xl transition-all hover:bg-focus/10 active:scale-[0.99]"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-focus text-white text-base">＋</span>
          <span>เพิ่มกระเป๋าเงินใหม่</span>
        </button>
      )}

      {/* Add New Account Form */}
      {adding && (
        <div className="rounded-3xl border border-focus/30 bg-surface/90 p-4 shadow-sm backdrop-blur-xl animate-in fade-in zoom-in-95">
          <label className="text-xs font-bold text-text-muted mb-1.5 block">
            ชื่อกระเป๋าเงินใหม่
          </label>
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="เช่น บัญชีกสิกร, เงินสด, เงินเก็บ"
            aria-label="ชื่อกระเป๋าเงินใหม่"
            className="w-full rounded-2xl border border-border/60 bg-surface-2 px-4 py-3 text-sm font-medium outline-none focus:border-focus focus:ring-2 focus:ring-focus/20 transition-all"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={locked || !newName.trim()}
              onClick={handleAdd}
              className="flex-1 min-h-[42px] rounded-xl bg-focus px-4 py-2 text-sm font-bold text-white shadow-md shadow-focus/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {locked ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
              className="min-h-[42px] rounded-xl border border-border/60 bg-surface px-4 py-2 text-sm font-semibold text-text-muted hover:text-text active:scale-95 transition-all"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Active Accounts Group */}
      <section aria-label="กระเป๋าที่ใช้งานอยู่" className="space-y-2.5">
        {active.length === 0 && !adding && (
          <div className="rounded-3xl border border-border/40 bg-surface/60 p-8 text-center backdrop-blur-xl">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 mx-auto mb-2 text-2xl">
              💳
            </div>
            <p className="font-semibold text-text text-sm">ยังไม่มีกระเป๋าเงิน</p>
            <p className="text-xs text-text-muted mt-0.5">กด &quot;เพิ่มกระเป๋าเงินใหม่&quot; ด้านบนเพื่อเริ่มบันทึก</p>
          </div>
        )}

        {active.map((acc) => (
          <div
            key={acc.id}
            className="group relative overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-surface/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-focus/30"
            data-testid={`account-${acc.id}`}
          >
            {editingId === acc.id ? (
              <div className="space-y-3">
                <label className="text-xs font-bold text-text-muted block">แก้ไขชื่อกระเป๋า</label>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  aria-label="แก้ไขชื่อกระเป๋า"
                  className="w-full rounded-xl border border-border/60 bg-surface-2 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-focus"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={handleRename}
                    className="flex-1 min-h-[38px] rounded-xl bg-focus px-3 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setNewName("");
                    }}
                    className="min-h-[38px] rounded-xl border border-border/60 bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 font-bold text-lg shadow-inner">
                    💳
                  </div>
                  <div>
                    <h3 className="font-bold text-text text-sm tracking-tight">{acc.name}</h3>
                    <p className="tabular-nums text-xs font-semibold text-text-muted mt-0.5">
                      คงเหลือ <span className="text-text font-bold">{formatSatang(acc.balance)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(acc.id);
                      setNewName(acc.name);
                    }}
                    className="flex size-8 items-center justify-center rounded-xl border border-border/50 bg-surface-2/60 text-text-muted hover:text-focus active:scale-90 transition-all"
                    aria-label={`แก้ชื่อ ${acc.name}`}
                    title="แก้ไขชื่อ"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(acc.id)}
                    className="flex size-8 items-center justify-center rounded-xl border border-border/50 bg-surface-2/60 text-text-muted hover:text-rose-500 active:scale-90 transition-all"
                    aria-label={`ปิดใช้งาน ${acc.name}`}
                    title="ปิดใช้งาน"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Archived Accounts Group */}
      {archived.length > 0 && (
        <section aria-label="ปิดใช้งานแล้ว" className="mt-6 pt-4 border-t border-border/40">
          <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-text-muted">
            ปิดใช้งานแล้ว ({archived.length})
          </h2>
          <div className="space-y-2">
            {archived.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-surface-2/40 p-3 opacity-60 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base grayscale">💳</span>
                  <span className="font-semibold text-xs text-text">{acc.name}</span>
                </div>
                {archivedConfirmId === acc.id ? (
                  <button
                    type="button"
                    onClick={() => handleRestore(acc.id)}
                    disabled={locked}
                    className="min-h-[32px] rounded-lg bg-emerald-500 px-3 text-xs font-bold text-white shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    ยืนยันกู้คืน
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setArchivedConfirmId(acc.id);
                      window.setTimeout(
                        () => setArchivedConfirmId((v) => (v === acc.id ? null : v)),
                        ARCHIVE_CONFIRM_MS
                      );
                    }}
                    className="min-h-[32px] rounded-lg border border-border/60 bg-surface px-3 text-xs font-semibold text-text-muted hover:text-text active:scale-95"
                  >
                    กู้คืน
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
