"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { listAccounts } from "@/app/actions/accounts";
import { listCategories } from "@/app/actions/categories";
import { useTransactions } from "./TransactionsProvider";
import CategoryIcon from "@/components/CategoryIcon";
import type { TransactionItem } from "@/hooks/useTransactionsHook";

/**
 * BottomSheet — กรอกเร็ว
 *
 * กติกา:
 * - Parent ควบคุม mounting: <BottomSheet onClose={...} /> เมื่อ isOpen=true, unmount เมื่อ false
 * - ไม่ต้อง reset state เพราะ unmount/remount ทำให้ state กลับเป็นค่าเริ่มต้นเอง
 * - FAB → เปิด sheet → เลือกจ่าย/รับ/โอน → numpad → หมวด → วันที่ → บันทึก
 * - optimistic UI: เพิ่ม transaction ทันที, ถ้า server ให้ error → rollback + reload
 * - เก็บ key ที่กดไว้ใน localStorage เพื่อกดซ้ำได้
 */

type Props = {
  onClose: () => void;
};

type TabKind = "expense" | "income" | "transfer";

const TABS: { kind: TabKind; label: string }[] = [
  { kind: "expense", label: "จ่าย" },
  { kind: "income", label: "รับ" },
  { kind: "transfer", label: "โอน" },
];

const NUMPAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];

const QUICK_DATES = [
  { label: "วันนี้", offset: 0 },
  { label: "เมื่อวาน", offset: -1 },
];

/** สร้าง occurred_at ISO จาก offset วัน (Asia/Bangkok) */
function getOccurrenceDate(dayOffset: number): string {
  const now = new Date();
  const bangkokDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
  );
  bangkokDate.setDate(bangkokDate.getDate() + dayOffset);
  const y = bangkokDate.getFullYear();
  const m = String(bangkokDate.getMonth() + 1).padStart(2, "0");
  const d = String(bangkokDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T00:00:00+07:00`;
}

/** เดาหมวดหมู่อัตโนมัติจาก Note ที่พิมพ์ */
function guessCategory(
  text: string,
  categories: { id: string; name: string }[]
): string | null {
  const lower = text.trim().toLowerCase();
  if (!lower) return null;

  const direct = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (direct) return direct.id;

  const KEYWORD_MAP: Record<string, string[]> = {
    อาหาร: [
      "ข้าว", "ก๋วยเตี๋ยว", "อาหาร", "กิน", "ส้มตำ", "ชา", "กาแฟ", "cafe",
      "dinner", "lunch", "breakfast", "ขนม", "น้ำดื่ม", "บุฟเฟต์", "หมูกระทะ",
      "starbucks", "kfc", "mcdonald", "7-eleven", "เซเว่น",
    ],
    เดินทาง: [
      "bts", "mrt", "รถ", "แท็กซี่", "grab", "bolt", "วิน", "น้ำมัน",
      "ทางด่วน", "ตั๋ว", "เครื่องบิน", "รถเมล์", "ที่จอด", "gas",
    ],
    ช้อปปิ้ง: [
      "ซื้อ", "ช้อป", "เสื้อ", "กางเกง", "รองเท้า", "shopee", "lazada",
      "tiktok", "uniqlo", "zara", "ห้าง",
    ],
    ของใช้ส่วนตัว: [
      "สบู่", "ยาสระผม", "ครีม", "ยา", "หมอ", "ตัดผม", "เครื่องสำอาง",
    ],
    บิลและสาธารณูปโภค: [
      "ค่าไฟ", "ค่าน้ำ", "เน็ต", "ค่าห้อง", "ค่าเช่า", "บิล", "โทรศัพท์",
      "ais", "true", "dtac", "การไฟฟ้า", "การประปา",
    ],
    บันเทิง: [
      "หนัง", "เกม", "netflix", "spotify", "youtube", "คอนเสิร์ต", "เที่ยว",
      "ตั๋วหนัง", "steam",
    ],
    การศึกษา: ["หนังสือ", "คอร์ส", "เรียน", "อบรม", "ติว", "เครื่องเขียน"],
    สุขภาพ: ["ฟิตเนส", "ยา", "โรงพยาบาล", "วิตามิน", "ตรวจสุขภาพ", "คลินิก"],
    เงินเดือน: ["เงินเดือน", "salary", "โบนัส", "bonus", "ot"],
    รายได้เสริม: ["ขายของ", "ฟรีแลนซ์", "freelance", "งานนอก", "ปันผล", "กำไร"],
  };

  for (const [catName, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const match = categories.find((c) => c.name.includes(catName));
      if (match) return match.id;
    }
  }

  return null;
}

export default function BottomSheet({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKind>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const { addOptimistic, refresh } = useTransactions();
  // รายการกระเป๋าเงินของผู้ใช้
  const [accounts, setAccounts] = useState<
    { id: string; name: string; currency?: string }[]
  >([]);
  const [account, setAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [toAccount, setToAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [hasNoAccount, setHasNoAccount] = useState(false);
  const [categories, setCategories] = useState<
    { id: string; name: string; icon: string | null }[]
  >([]);
  const prevTabRef = useRef<TabKind>("expense");

  const amountSatang = Math.round(parseFloat(amount || "0") * 100);
  const isTransfer = activeTab === "transfer";
  const hasValidTransfer =
    !isTransfer ||
    (account !== null && toAccount !== null && account.id !== toAccount.id);

  const canSave =
    amountSatang > 0 &&
    !isSaving &&
    account !== null &&
    (!isTransfer || hasValidTransfer);

  // โหลดกระเป๋าเงินจริงครั้งเดียวตอนเปิด sheet — ใช้บัญชีแรกเป็นค่าเริ่มต้น
  useEffect(() => {
    let cancelled = false;
    const loadAccount = async () => {
      const result = await listAccounts();
      if (cancelled) return;
      if ("data" in result && result.data.length > 0) {
        setAccounts(result.data);
        setAccount({ id: result.data[0].id, name: result.data[0].name });
        if (result.data.length > 1) {
          setToAccount({ id: result.data[1].id, name: result.data[1].name });
        }
      } else {
        // ไม่มีบัญชีเลย — กันยิง server action ด้วย account_id ปลอม
        setHasNoAccount(true);
      }
    };
    loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  // โหลด categories เมื่อ tab เปลี่ยน
  useEffect(() => {
    if (activeTab === "transfer") return;
    let cancelled = false;
    const loadCats = async () => {
      const result = await listCategories(activeTab);
      if (!cancelled && "data" in result) {
        setCategories(result.data);
      }
    };
    loadCats();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // จัดการ numpad
  const handleNumpadKey = useCallback(
    (key: string) => {
      if (key === "⌫") {
        setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : ""));
      } else if (key === ".") {
        if (!amount.includes(".")) {
          setAmount((prev) => (prev || "0") + ".");
        }
      } else {
        const dotIndex = amount.indexOf(".");
        if (dotIndex !== -1 && amount.length - dotIndex > 2) return;
        setAmount((prev) => prev + key);
      }
    },
    [amount]
  );

  // บันทึก
  const handleSave = async () => {
    if (!canSave || !account) return;
    if (isTransfer && (!toAccount || toAccount.id === account.id)) return;
    setIsSaving(true);

    const tempId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();
    const occurredAt = getOccurrenceDate(dateOffset);

    const optimisticTx: TransactionItem = {
      id: tempId,
      user_id: "optimistic",
      account_id: account.id,
      category_id: isTransfer ? null : categoryId,
      to_account_id: isTransfer && toAccount ? toAccount.id : null,
      kind: activeTab,
      amount: amountSatang,
      note: note || null,
      occurred_at: occurredAt,
      client_id: clientId,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      accounts: { id: account.id, name: account.name },
      to_accounts:
        isTransfer && toAccount
          ? { id: toAccount.id, name: toAccount.name }
          : null,
      categories: null,
    };

    addOptimistic(optimisticTx);

    try {
      const result = await createTransaction({
        account_id: account.id,
        category_id: isTransfer ? null : categoryId,
        to_account_id: isTransfer && toAccount ? toAccount.id : null,
        kind: activeTab,
        amount: amountSatang,
        note: note || null,
        occurred_at: occurredAt,
        client_id: clientId,
      });

      if ("error" in result) {
        throw new Error(result.error);
      }

      await refresh();
      onClose();
    } catch (err) {
      console.error("บันทึกล้มเหลว:", err);

      try {
        const savedKeys = JSON.parse(
          localStorage.getItem("jodtang_retry_keys") || "[]"
        ) as string[];
        savedKeys.push(clientId);
        localStorage.setItem("jodtang_retry_keys", JSON.stringify(savedKeys));
      } catch {
        // localStorage อาจเต็ม — ไม่เป็นไร
      }

      window.location.reload();
    }
  };

  const handleTabChange = (kind: TabKind) => {
    setActiveTab(kind);
    setCategoryId(null);
    prevTabRef.current = kind;
    if (kind === "transfer" && accounts.length > 1) {
      if (!toAccount || toAccount.id === account?.id) {
        const alt = accounts.find((a) => a.id !== account?.id);
        if (alt) setToAccount({ id: alt.id, name: alt.name });
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black opacity-40 transition-opacity duration-200" />

      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-bg shadow-xl transition-transform duration-300 ease-out translate-y-0"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-surface-2" />
        </div>

        <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: "calc(100dvh - 120px)" }}>
          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-surface p-1">
            {TABS.map((tab) => (
              <button
                key={tab.kind}
                type="button"
                onClick={() => handleTabChange(tab.kind)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${activeTab === tab.kind ? "bg-bg shadow-sm text-text" : "text-text-muted"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* จำนวนเงิน */}
          <div className="mb-4 rounded-xl bg-surface p-4 text-center">
            <p className="text-3xl font-bold text-text tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
              ฿{amount || "0"}
            </p>
          </div>

          {/* Numpad */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {NUMPAD_KEYS.map((row) =>
              row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleNumpadKey(key)}
                  className={`flex h-12 items-center justify-center rounded-xl text-lg font-medium transition-colors ${key === "⌫" ? "bg-expense/10 text-expense" : "bg-surface text-text active:bg-surface-2"}`}
                >
                  {key}
                </button>
              ))
            )}
          </div>
          {/* กระเป๋าเงิน (สำหรับ รับ / จ่าย) */}
          {activeTab !== "transfer" && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-text-muted">กระเป๋าเงิน</p>
                <span className="text-xs text-text-muted">
                  ใช้: <strong className="font-medium text-text">{account?.name || "-"}</strong>
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccount({ id: acc.id, name: acc.name })}
                    className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      account?.id === acc.id
                        ? "bg-balance text-white shadow-sm"
                        : "bg-surface text-text active:bg-surface-2"
                    }`}
                  >
                    <span>💰</span>
                    <span>{acc.name}</span>
                  </button>
                ))}
                {accounts.length === 0 && (
                  <span className="text-xs text-text-muted">กำลังโหลดกระเป๋าเงิน...</span>
                )}
              </div>
            </div>
          )}

          {/* การโอนเงิน: เลือกกระเป๋าต้นทาง และกระเป๋าปลายทาง */}
          {activeTab === "transfer" && (
            <div className="mb-4 space-y-3">
              {accounts.length < 2 && (
                <div className="rounded-xl bg-warn/10 p-3 text-xs text-text">
                  ต้องมีอย่างน้อย 2 กระเป๋าเงินเพื่อโอนเงินระหว่างกระเป๋า{" "}
                  <a href="/settings/accounts" className="font-medium underline">
                    สร้างกระเป๋าเพิ่ม
                  </a>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-text-muted">จากกระเป๋า (ต้นทาง)</p>
                  <span className="text-xs font-medium text-text">
                    {account?.name || "-"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {accounts.map((acc) => (
                    <button
                      key={`from-${acc.id}`}
                      type="button"
                      onClick={() => {
                        setAccount({ id: acc.id, name: acc.name });
                        if (toAccount?.id === acc.id) {
                          const alt = accounts.find((a) => a.id !== acc.id);
                          if (alt) setToAccount({ id: alt.id, name: alt.name });
                        }
                      }}
                      className={`flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        account?.id === acc.id
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
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-text-muted">ไปยังกระเป๋า (ปลายทาง)</p>
                  <span className="text-xs font-medium text-text">
                    {toAccount?.name || "-"}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {accounts.map((acc) => {
                    const isSelf = account?.id === acc.id;
                    return (
                      <button
                        key={`to-${acc.id}`}
                        type="button"
                        disabled={isSelf}
                        onClick={() => setToAccount({ id: acc.id, name: acc.name })}
                        className={`flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          toAccount?.id === acc.id
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


          {/* หมวดหมู่ (ไม่แสดงสำหรับการโอน) */}
          {activeTab !== "transfer" && (
            <div className="mb-4">
              <p className="mb-2 text-xs text-text-muted">หมวดหมู่</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setCategoryId(categoryId === cat.id ? null : cat.id)
                    }
                    className={`flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors ${categoryId === cat.id ? "bg-balance text-white" : "bg-surface text-text"}`}
                  >
                    <CategoryIcon icon={cat.icon} className="h-4 w-4" />
                    {cat.name}
                  </button>
                ))}
                {categories.length === 0 && (
                  <span className="text-xs text-text-muted">ยังไม่มีหมวด</span>
                )}
              </div>
            </div>
          )}

          {/* วันที่ */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-text-muted">วันที่</p>
            <div className="flex gap-2">
              {QUICK_DATES.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => setDateOffset(qd.offset)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${dateOffset === qd.offset ? "bg-balance text-white" : "bg-surface text-text"}`}
                >
                  {qd.label}
                </button>
              ))}
            </div>
          </div>

          {/* หมายเหตุ */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="หมายเหตุ (ไม่บังคับ)"
              value={note}
              onChange={(e) => {
                const val = e.target.value;
                setNote(val);
                if (!categoryId && categories.length > 0) {
                  const guessed = guessCategory(val, categories);
                  if (guessed) setCategoryId(guessed);
                }
              }}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-focus focus:outline-none"
            />
          </div>

          {/* ไม่มีกระเป๋าเงิน — บังคับไปสร้างก่อน ไม่ยิง action ให้ error uuid */}
          {hasNoAccount && (
            <div className="mb-4 rounded-xl bg-warn/10 p-3 text-center">
              <p className="text-sm text-text">
                ยังไม่มีกระเป๋าเงิน — สร้างกระเป๋าก่อนบันทึกรายการ
              </p>
              <a
                href="/settings/accounts"
                className="mt-2 inline-block min-h-[44px] rounded-btn border border-border bg-surface px-4 py-2 text-sm"
              >
                ไปที่ตั้งค่ากระเป๋าเงิน
              </a>
            </div>
          )}

          {/* ปุ่มบันทึก */}
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className={`w-full rounded-xl py-3.5 text-base font-semibold transition-colors ${canSave ? "bg-balance text-white active:bg-balance/90" : "bg-surface-2 text-text-muted cursor-not-allowed"}`}
            style={{ minHeight: "56px" }}
          >
            {hasNoAccount
              ? "สร้างกระเป๋าเงินก่อนบันทึก"
              : isTransfer && accounts.length < 2
                ? "ต้องมีอย่างน้อย 2 กระเป๋าเพื่อโอน"
                : isSaving
                  ? "กำลังบันทึก..."
                  : "บันทึกรายการ"}
          </button>
        </div>
      </div>
    </div>
  );
}
