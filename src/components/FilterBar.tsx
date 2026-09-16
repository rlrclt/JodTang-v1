"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { parseTransactionParams, buildTransactionParams } from "@/lib/transaction-params";

type Props = {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
};

/**
 * FilterBar — filters เก็บใน URL (shareable/bookmarkable)
 */
export default function FilterBar({ accounts, categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsed = parseTransactionParams(searchParams);

  const updateFilter = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/transactions?${params.toString()}`);
    },
    [searchParams, router]
  );

  const kindLabel = (k: string) =>
    k === "income" ? "รายรับ" : k === "expense" ? "รายจ่าย" : "โอน";

  return (
    <div className="flex flex-wrap gap-2 px-4">
      {/* ค้นหา */}
      <input
        type="search"
        placeholder="ค้นหา..."
        defaultValue={parsed.filters.search || ""}
        onChange={(e) => updateFilter("search", e.target.value || undefined)}
        className="h-9 rounded-[var(--radius-input)] border border-border bg-white px-3 text-sm text-text placeholder-text-muted focus:border-focus focus:outline-none"
      />

      {/* ประเภท */}
      <select
        value={parsed.filters.kind || ""}
        onChange={(e) => updateFilter("kind", e.target.value || undefined)}
        className="h-9 rounded-[var(--radius-input)] border border-border bg-white px-2 text-sm text-text focus:border-focus focus:outline-none"
      >
        <option value="">ทุกประเภท</option>
        {(["income", "expense", "transfer"] as const).map((k) => (
          <option key={k} value={k}>
            {kindLabel(k)}
          </option>
        ))}
      </select>

      {/* หมวด */}
      {categories.length > 0 && (
        <select
          value={parsed.filters.category_id || ""}
          onChange={(e) =>
            updateFilter("category_id", e.target.value || undefined)
          }
          className="h-9 rounded-[var(--radius-input)] border border-border bg-white px-2 text-sm text-text focus:border-focus focus:outline-none"
        >
          <option value="">ทุกหมวด</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* กระเป๋า */}
      {accounts.length > 0 && (
        <select
          value={parsed.filters.account_id || ""}
          onChange={(e) =>
            updateFilter("account_id", e.target.value || undefined)
          }
          className="h-9 rounded-[var(--radius-input)] border border-border bg-white px-2 text-sm text-text focus:border-focus focus:outline-none"
        >
          <option value="">ทุกกระเป๋า</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
