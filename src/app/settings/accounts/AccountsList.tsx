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
// คริปตันก่อนแสดง dialog element — เพื่อกันปุ่มถูกกดสองรอบ (เช่น ชื่อซ้ำ)
const SUBMIT_LOCK_MS = 800;

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
  // state สำหรับช่องแก้ชื่อ: editingId = กำลังแก้กระเป๋าไหน · newName = ข้อความในกล่อง
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [archivedConfirmId, setArchivedConfirmId] = useState<string | null>(null);

  // คริปตันกันกดซ้ำ (double-tap submit) — ล็อกสั้นๆ ทุกครั้งที่เริ่ม transition
  const locked = isPending;

  const invalidate = () => {
    // server action แก้ข้อมูลแล้ว — ให้ Next แสดงข้อมูลใหม่โดยไม่ reload
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
      setAdding(true); // เปิดกล่องคืนให้ผู้ใช้ลองแก้
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
    <main className="flex flex-1 flex-col px-4 pb-4">
      {error && (
        <p role="alert" className="mb-3 rounded-card border border-expense bg-surface p-3 text-sm text-expense">
          {error}
        </p>
      )}

      {/* ─── ปุ่มเพิ่มกระเป๋า ─── */}
      <button
        type="button"
        onClick={() => {
          setAdding(true);
          setNewName("");
        }}
        className="mb-4 flex min-h-[44px] items-center gap-2 rounded-btn border border-border bg-surface px-4 py-3 text-base font-medium transition-colors hover:bg-surface-2"
      >
        <span aria-hidden="true" className="text-lg">＋</span>
        เพิ่มกระเป๋าเงิน
      </button>

      {/* แบบฟอร์มเพิ่ม — แสดงเมื่อกดเพิ่ม ไม่ใช่ modal กลางจอ */}
      {adding && (
        <div className="mb-4">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อกระเป๋า (เช่น กระปุกออมสิน)"
            aria-label="ชื่อกระเป๋าเงินใหม่"
            className="w-full rounded-input border border-border bg-surface px-4 py-3 text-base"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={locked}
              onClick={handleAdd}
              className="flex-1 min-h-[44px] rounded-btn bg-focus px-4 py-3 text-base text-white disabled:opacity-50"
            >
              บันทึก
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
              className="min-h-[44px] rounded-btn border border-border bg-surface px-4 py-3 text-base"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ─── รายการกระเป๋าที่ใช้งานอยู่ ─── */}
      <section aria-label="กระเป๋าที่ใช้งานอยู่" className="grid gap-2">
        {active.length === 0 && !adding && (
          <p className="py-6 text-center text-text-muted">
            ยังไม่มีกระเป๋าเงิน — กด &quot;เพิ่มกระเป๋าเงิน&quot; เพื่อเริ่ม
          </p>
        )}
        {active.map((acc) => (
          <div
            key={acc.id}
            className="rounded-card border border-border bg-surface p-4"
            data-testid={`account-${acc.id}`}
          >
            {editingId === acc.id ? (
              <div>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  aria-label="แก้ไขชื่อกระเป๋า"
                  className="w-full rounded-input border border-border bg-surface-2 px-3 py-2 text-base"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={handleRename}
                    className="flex-1 min-h-[40px] rounded-btn bg-focus px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setNewName("");
                    }}
                    className="min-h-[40px] rounded-btn border border-border bg-surface px-4 py-2 text-sm"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{acc.name}</p>
                  <p className="tabular-nums text-sm text-text-muted">
                    ยอดคงเหลือ {formatSatang(acc.balance)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(acc.id);
                      setNewName(acc.name);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded-btn border border-border bg-surface px-3 text-sm"
                    aria-label={`แก้ชื่อ ${acc.name}`}
                  >
                    แก้
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArchive(acc.id)}
                    className="min-h-[44px] min-w-[44px] rounded-btn border border-border bg-surface px-3 text-sm"
                    aria-label={`ปิดใช้งาน ${acc.name}`}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ─── กลุ่มปิดใช้งาน ─── */}
      {archived.length > 0 && (
        <section aria-label="ปิดใช้งานแล้ว" className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-text-muted">ปิดใช้งานแล้ว</h2>
          <div className="grid gap-2">
            {archived.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface-2 p-4 opacity-70"
              >
                <p className="font-medium">{acc.name}</p>
                {archivedConfirmId === acc.id ? (
                  <button
                    type="button"
                    onClick={() => handleRestore(acc.id)}
                    disabled={locked}
                    className="min-h-[44px] rounded-btn bg-focus px-3 text-sm text-white disabled:opacity-50"
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
                    className="min-h-[44px] rounded-btn border border-border bg-surface px-3 text-sm"
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
