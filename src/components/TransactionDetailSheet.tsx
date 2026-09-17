"use client";

import { useState, useEffect, useCallback } from "react";
import {
  updateTransaction,
  deleteTransaction,
} from "@/app/actions/transactions";
import { listAccounts } from "@/app/actions/accounts";
import { listCategories } from "@/app/actions/categories";
import CategoryIcon from "@/components/CategoryIcon";
import { formatSatang } from "@/lib/format-satang";

export type TransactionDetailData = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number; // satang
  note: string | null;
  occurred_at: string;
  account_id?: string | null;
  category_id?: string | null;
  to_account_id?: string | null;
  accounts?: { id: string; name: string } | null;
  to_accounts?: { id: string; name: string } | null;
  categories?: { id: string; name: string; icon: string | null } | null;
};

type Props = {
  transaction: TransactionDetailData;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
};

type TabKind = "expense" | "income" | "transfer";

const TABS: { kind: TabKind; label: string }[] = [
  { kind: "expense", label: "จ่าย" },
  { kind: "income", label: "รับ" },
  { kind: "transfer", label: "โอน" },
];

/** แปลง ISO string ให้เป็นค่าสำหรับ input datetime-local ในโซนเวลาท้องถิ่น */
function toLocalDatetimeInput(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

/** แปลงค่า input datetime-local ให้เป็น ISO timestamptz (Asia/Bangkok) */
function fromLocalDatetimeInput(localStr: string): string {
  try {
    if (!localStr) return new Date().toISOString();
    return new Date(localStr).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export default function TransactionDetailSheet({
  transaction,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [kind, setKind] = useState<TabKind>(transaction.kind);
  const [amountBaht, setAmountBaht] = useState(
    (transaction.amount / 100).toString()
  );
  const [note, setNote] = useState(transaction.note || "");
  const [occurredAt, setOccurredAt] = useState(
    toLocalDatetimeInput(transaction.occurred_at)
  );

  const [accountId, setAccountId] = useState<string>(
    transaction.account_id || transaction.accounts?.id || ""
  );
  const [toAccountId, setToAccountId] = useState<string | null>(
    transaction.to_account_id || transaction.to_accounts?.id || null
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction.category_id || transaction.categories?.id || null
  );

  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string | null }[]
  >([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // โหลดรายการกระเป๋าเงิน
  useEffect(() => {
    let cancelled = false;
    const loadAccs = async () => {
      const res = await listAccounts();
      if (cancelled) return;
      if ("data" in res && res.data.length > 0) {
        setAccounts(res.data);
        if (!accountId) {
          setAccountId(res.data[0].id);
        }
      }
    };
    loadAccs();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    const loadCats = async () => {
      if (kind === "transfer") {
        if (!cancelled) setCategories([]);
        return;
      }
      const res = await listCategories(kind);
      if (cancelled) return;
      if ("data" in res) {
        setCategories(res.data);
      }
    };
    loadCats();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const amountSatang = Math.round(parseFloat(amountBaht || "0") * 100);
  const isTransfer = kind === "transfer";
  const hasValidTransfer =
    !isTransfer || (!!accountId && !!toAccountId && accountId !== toAccountId);

  const canSave =
    amountSatang > 0 &&
    !isSaving &&
    !isDeleting &&
    !!accountId &&
    hasValidTransfer;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateTransaction(transaction.id, {
        kind,
        amount: amountSatang,
        note: note.trim() || null,
        account_id: accountId,
        to_account_id: isTransfer ? toAccountId : null,
        category_id: isTransfer ? null : categoryId,
        occurred_at: fromLocalDatetimeInput(occurredAt),
      });

      if ("error" in result) {
        setError(result.error);
        setIsSaving(false);
        return;
      }

      onUpdated?.();
      onClose();
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการบันทึก");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteTransaction(transaction.id);
      if ("error" in result) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }

      onDeleted?.();
      onClose();
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการลบ");
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-200" />

      {/* Sheet Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-bg shadow-2xl transition-transform duration-200 ease-out"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - 16px)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Top Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-surface-2" />
        </div>

        {/* Header with Title & Close button */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h2 className="text-base font-semibold text-text">
            รายละเอียดรายการ
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface active:bg-surface-2"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div
          className="overflow-y-auto px-4 py-4 space-y-4"
          style={{ maxHeight: "calc(100dvh - 160px)" }}
        >
          {error && (
            <div className="rounded-xl bg-expense/10 p-3 text-xs text-expense">
              {error}
            </div>
          )}

          {/* Type Switcher */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">
              ประเภทรายการ
            </label>
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.kind}
                  type="button"
                  onClick={() => {
                    setKind(tab.kind);
                    if (tab.kind === "transfer") {
                      setCategoryId(null);
                      if (accounts.length > 1 && (!toAccountId || toAccountId === accountId)) {
                        const alt = accounts.find((a) => a.id !== accountId);
                        if (alt) setToAccountId(alt.id);
                      }
                    }
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    kind === tab.kind
                      ? tab.kind === "expense"
                        ? "bg-expense text-white shadow-sm"
                        : tab.kind === "income"
                          ? "bg-income text-white shadow-sm"
                          : "bg-balance text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">
              จำนวนเงิน (บาท)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-lg font-bold text-text-muted">
                ฿
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountBaht}
                onChange={(e) => setAmountBaht(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-border bg-surface py-3 pl-8 pr-4 text-xl font-bold text-text tabular-nums focus:border-focus focus:outline-none"
              />
            </div>
          </div>

          {/* Wallet Selector (Income / Expense) */}
          {!isTransfer && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-medium text-text-muted">
                  กระเป๋าเงิน
                </label>
                <span className="text-xs font-medium text-text">
                  {accounts.find((a) => a.id === accountId)?.name || "-"}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      accountId === acc.id
                        ? "bg-balance text-white shadow-sm"
                        : "bg-surface text-text active:bg-surface-2"
                    }`}
                  >
                    <span>💰</span>
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transfer Source & Destination Wallets */}
          {isTransfer && (
            <div className="space-y-3 rounded-2xl bg-surface/50 p-3 border border-border/50">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted">
                    จากกระเป๋า (ต้นทาง)
                  </label>
                  <span className="text-xs font-medium text-text">
                    {accounts.find((a) => a.id === accountId)?.name || "-"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {accounts.map((acc) => (
                    <button
                      key={`from-${acc.id}`}
                      type="button"
                      onClick={() => {
                        setAccountId(acc.id);
                        if (toAccountId === acc.id) {
                          const alt = accounts.find((a) => a.id !== acc.id);
                          if (alt) setToAccountId(alt.id);
                        }
                      }}
                      className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        accountId === acc.id
                          ? "bg-expense text-white shadow-sm"
                          : "bg-surface text-text active:bg-surface-2"
                      }`}
                    >
                      <span>{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-text-muted">
                    ไปยังกระเป๋า (ปลายทาง)
                  </label>
                  <span className="text-xs font-medium text-text">
                    {accounts.find((a) => a.id === toAccountId)?.name || "-"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {accounts.map((acc) => {
                    const isSelf = accountId === acc.id;
                    return (
                      <button
                        key={`to-${acc.id}`}
                        type="button"
                        disabled={isSelf}
                        onClick={() => setToAccountId(acc.id)}
                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          toAccountId === acc.id
                            ? "bg-income text-white shadow-sm"
                            : isSelf
                              ? "cursor-not-allowed bg-surface-2 opacity-30 text-text-muted"
                              : "bg-surface text-text active:bg-surface-2"
                        }`}
                      >
                        <span>{acc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Category Selector (Expense / Income) */}
          {!isTransfer && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                หมวดหมู่
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setCategoryId(categoryId === cat.id ? null : cat.id)
                    }
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      categoryId === cat.id
                        ? "bg-balance text-white shadow-sm"
                        : "bg-surface text-text active:bg-surface-2"
                    }`}
                  >
                    <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </button>
                ))}
                {categories.length === 0 && (
                  <span className="text-xs text-text-muted py-1">
                    ไม่มีหมวดหมู่
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">
              วันที่และเวลา
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text focus:border-focus focus:outline-none"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-muted">
              หมายเหตุ (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ใส่โน้ตหรือรายละเอียด..."
              className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-focus focus:outline-none"
            />
          </div>

          {/* Delete Confirmation or Actions */}
          <div className="pt-2 space-y-2">
            {showDeleteConfirm ? (
              <div className="rounded-2xl border border-expense/20 bg-expense/10 p-3.5 text-center space-y-2.5">
                <p className="text-sm font-semibold text-expense">
                  ต้องการย้ายรายการนี้ลงถังขยะหรือไม่?
                </p>
                <p className="text-xs text-text-muted">
                  (คุณสามารถกู้คืนได้ที่หน้า การตั้งค่า → ถังขยะ)
                </p>
                <div className="flex gap-2 justify-center pt-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-medium text-text"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 rounded-xl bg-expense py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-expense/90"
                  >
                    {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center rounded-xl border border-expense/30 px-4 py-3 text-sm font-medium text-expense hover:bg-expense/10 active:bg-expense/20"
                >
                  🗑️ ลบ
                </button>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={handleSave}
                  className={`flex-1 rounded-xl py-3 text-base font-semibold text-white transition-colors shadow-sm ${
                    canSave
                      ? "bg-balance hover:bg-balance/90 active:scale-[0.99]"
                      : "bg-surface-2 text-text-muted cursor-not-allowed"
                  }`}
                  style={{ minHeight: "48px" }}
                >
                  {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
