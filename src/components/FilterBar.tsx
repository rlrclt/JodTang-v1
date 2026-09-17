"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState, useEffect } from "react";

type Props = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
};

const KIND_OPTIONS = [
  { value: "", label: "ทุกประเภท" },
  { value: "income", label: "รายรับ" },
  { value: "expense", label: "รายจ่าย" },
  { value: "transfer", label: "โอน" },
] as const;

/**
 * FilterBar — redesigned
 * - ช่องค้นหาเต็มแถว + debounce 350ms (ไม่ reload ทุกตัวอักษร)
 * - Pill chips แทน <select> native สำหรับ kind
 * - Dropdown รูปแบบใหม่สำหรับ category + account
 * - Preserve year/month ใน URL ทุกครั้งที่ update filter
 */
export default function FilterBar({ accounts, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // อ่าน filter ปัจจุบัน
  const currentKind = searchParams.get("kind") ?? "";
  const currentCategory = searchParams.get("category_id") ?? "";
  const currentAccount = searchParams.get("account_id") ?? "";
  const currentSearch = searchParams.get("search") ?? "";

  const debounceRef = useRef<number | undefined>(undefined);

  // helper: build URL ใหม่ โดย preserve year/month + params อื่น ที่ไม่ใช่ filter ที่กำลังเปลี่ยน
  const navigate = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v == null || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      router.push(`/transactions?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSearchChange = (val: string) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      navigate({ search: val || null });
    }, 350);
  };

  const activeFiltersCount = [currentKind, currentCategory, currentAccount].filter(Boolean).length;

  return (
    <div className="px-4 space-y-2">
      {/* Row 1: Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          width="15" height="15" viewBox="0 0 20 20" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="9" cy="9" r="7" />
          <line x1="15" y1="15" x2="19" y2="19" />
        </svg>
        <input
          key={currentSearch}
          type="search"
          placeholder="ค้นหาโน้ต หรือหมวดหมู่..."
          defaultValue={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full h-10 rounded-[var(--radius-input)] border border-border bg-surface pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 transition-colors"
        />
        {currentSearch && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            aria-label="ล้างการค้นหา"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        )}
      </div>

      {/* Row 2: Kind pills + dropdowns */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {/* Kind pills */}
        {KIND_OPTIONS.map((opt) => {
          const active = currentKind === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => navigate({ kind: opt.value || null })}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                active
                  ? opt.value === "income"
                    ? "bg-income text-white"
                    : opt.value === "expense"
                    ? "bg-expense text-white"
                    : opt.value === "transfer"
                    ? "bg-balance text-white"
                    : "bg-text text-bg"
                  : "bg-surface border border-border text-text-muted hover:border-text-muted hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="shrink-0 w-px h-5 bg-border mx-0.5" />

        {/* Category select — styled */}
        <div className="relative shrink-0">
          <select
            value={currentCategory}
            onChange={(e) => navigate({ category_id: e.target.value || null })}
            className={`h-8 appearance-none rounded-full border pl-3 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-focus/20 ${
              currentCategory
                ? "border-focus bg-focus/10 text-focus"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            <option value="">หมวดหมู่</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <svg
            className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${currentCategory ? "text-focus" : "text-text-muted"}`}
            width="10" height="10" viewBox="0 0 10 6" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
        </div>

        {/* Account select — styled */}
        <div className="relative shrink-0">
          <select
            value={currentAccount}
            onChange={(e) => navigate({ account_id: e.target.value || null })}
            className={`h-8 appearance-none rounded-full border pl-3 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-focus/20 ${
              currentAccount
                ? "border-focus bg-focus/10 text-focus"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            <option value="">กระเป๋า</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <svg
            className={`pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 ${currentAccount ? "text-focus" : "text-text-muted"}`}
            width="10" height="10" viewBox="0 0 10 6" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M1 1l4 4 4-4" />
          </svg>
        </div>

        {/* Clear all filters */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={() => navigate({ kind: null, category_id: null, account_id: null, search: null })}
            className="shrink-0 h-8 px-3 rounded-full bg-expense/10 text-expense text-xs font-medium hover:bg-expense/20 transition-colors"
          >
            ล้างทั้งหมด ×
          </button>
        )}
      </div>
    </div>
  );
}
