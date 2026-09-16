import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("TransactionItem", () => {
  it("renders as button/link with ≥56px touch target", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionItem.tsx", "utf-8");
    // ต้องใช้ button หรือ Link (ห้ามใช้ div+onClick)
    assert.ok(
      content.includes("<button") || content.includes("<Link") || content.includes("<a"),
      "TransactionItem ต้องใช้ button หรือ Link ไม่ใช่ div+onClick"
    );
    // min-height ≥ 56px
    assert.ok(
      content.includes("min-h-[56px]") || content.includes("56px") || content.includes("min-h-14"),
      "TransactionItem ต้องมี min-height ≥ 56px"
    );
  });

  it("displays amount with formatSatang and +/- sign", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionItem.tsx", "utf-8");
    assert.ok(
      content.includes("formatSatang") || content.includes("format-satang"),
      "TransactionItem ต้องใช้ formatSatang"
    );
    assert.ok(
      content.includes("tabular-nums"),
      "TransactionItem ต้องมี tabular-nums"
    );
  });

  it("uses ± sign for income/expense", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionItem.tsx", "utf-8");
    assert.ok(
      content.includes('"+"') || content.includes("'+'"),
      "TransactionItem ต้องมี + sign สำหรับ income"
    );
    assert.ok(
      content.includes("−") || content.includes('"-"'),
      "TransactionItem ต้องมี − sign สำหรับ expense"
    );
  });

  it("does not use div+onClick", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionItem.tsx", "utf-8");
    // ไม่ควรมี div onClick (ห้ามใช้ div+onClick สำหรับ interactive elements)
    const divOnClickMatch = content.match(/<div[^>]*\s+onClick/);
    assert.ok(
      !divOnClickMatch,
      "TransactionItem ห้ามใช้ div+onClick — ต้องใช้ button หรือ Link"
    );
  });
});

describe("MonthSelector", () => {
  it("has prev/next navigation buttons", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/MonthSelector.tsx", "utf-8");
    assert.ok(content.includes("‹") || content.includes("previous") || content.includes("prev"),
      "MonthSelector ต้องมีปุ่มย้อนกลับ");
    assert.ok(content.includes("›") || content.includes("next"),
      "MonthSelector ต้องมีปุ่มถัดไป");
  });

  it("uses aria-label for accessibility", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/MonthSelector.tsx", "utf-8");
    assert.ok(
      content.includes("aria-label"),
      "MonthSelector ต้องมี aria-label เพื่อ accessibility"
    );
  });
});

describe("BalanceCard", () => {
  it("has view-transition-name for morph", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BalanceCard.tsx", "utf-8");
    assert.ok(
      content.includes("balance-card"),
      "BalanceCard ต้องมี view-transition-name: balance-card"
    );
  });

  it("displays income, expense, and balance", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BalanceCard.tsx", "utf-8");
    assert.ok(content.includes("income") || content.includes("รายรับ"),
      "BalanceCard ต้องแสดงรายรับ");
    assert.ok(content.includes("expense") || content.includes("รายจ่าย"),
      "BalanceCard ต้องแสดงรายจ่าย");
  });

  it("uses tabular-nums for financial display", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BalanceCard.tsx", "utf-8");
    assert.ok(
      content.includes("tabular-nums"),
      "BalanceCard ต้องใช้ tabular-nums สำหรับตัวเลขการเงิน"
    );
  });

  it("uses formatSatang for amount display", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/BalanceCard.tsx", "utf-8");
    assert.ok(
      content.includes("formatSatang"),
      "BalanceCard ต้องใช้ formatSatang สำหรับแสดงยอดเงิน"
    );
  });
});

describe("TransactionListSkeleton", () => {
  it("renders 8 skeleton rows", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionListSkeleton.tsx", "utf-8");
    assert.ok(
      content.includes("skeleton") || content.includes("animate") || content.includes("shimmer"),
      "Skeleton ต้องมี animation"
    );
    assert.ok(
      content.includes("length: 8"),
      "Skeleton ต้องมี 8 แถว"
    );
  });

  it("has bottom skeleton row for loading more", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionListSkeleton.tsx", "utf-8");
    // bottom skeleton ต้องมี min-h-[56px] เท่ากับแถวธุรกรรมจริง
    assert.ok(
      content.includes("min-h-[56px]"),
      "Skeleton bottom ต้องมี min-h-[56px] เท่ากับแถวธุรกรรมจริง"
    );
    // ต้องมี bottom skeleton (แถวที่อยู่นอก loop) พร้อม comment อธิบาย
    assert.ok(
      content.includes("bottom skeleton") || content.includes("โหลดเพิ่ม"),
      "Skeleton ต้องมี bottom skeleton row สำหรับโหลดเพิ่ม"
    );
  });

  it("uses animate-pulse for loading animation", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/TransactionListSkeleton.tsx", "utf-8");
    assert.ok(
      content.includes("animate-pulse"),
      "Skeleton ต้องใช้ animate-pulse สำหรับ loading animation"
    );
  });
});

describe("EmptyState", () => {
  it("shows empty message", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/EmptyState.tsx", "utf-8");
    assert.ok(
      content.includes("ยังไม่มี") || content.includes("ว่าง") || content.includes("ไม่มีรายการ"),
      "EmptyState ต้องมีข้อความว่าง"
    );
  });

  it("has visual indicator (emoji/icon)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/EmptyState.tsx", "utf-8");
    assert.ok(
      content.includes("📝") || content.includes("icon") || content.includes("svg"),
      "EmptyState ต้องมี visual indicator"
    );
  });
});

describe("ErrorState", () => {
  it("displays error message", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ErrorState.tsx", "utf-8");
    assert.ok(
      content.includes("message"),
      "ErrorState ต้องรับและแสดง message prop"
    );
  });

  it("has retry button when on_retry provided", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ErrorState.tsx", "utf-8");
    assert.ok(
      content.includes("on_retry") && content.includes("button"),
      "ErrorState ต้องมีปุ่มลองใหม่"
    );
  });

  it("has retry button text in Thai", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/ErrorState.tsx", "utf-8");
    assert.ok(
      content.includes("ลองใหม่"),
      "ErrorState ปุ่ม retry ต้องมีข้อความ 'ลองใหม่'"
    );
  });
});

describe("FilterBar", () => {
  it("has kind filter options", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FilterBar.tsx", "utf-8");
    assert.ok(
      content.includes("income") || content.includes("รายรับ"),
      "FilterBar ต้องมีตัวเลือกรายรับ"
    );
    assert.ok(
      content.includes("expense") || content.includes("รายจ่าย"),
      "FilterBar ต้องมีตัวเลือกรายจ่าย"
    );
    assert.ok(
      content.includes("transfer") || content.includes("โอน"),
      "FilterBar ต้องมีตัวเลือกโอน"
    );
  });

  it("has search input", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FilterBar.tsx", "utf-8");
    assert.ok(
      content.includes("search") && content.includes("input"),
      "FilterBar ต้องมี input สำหรับค้นหา"
    );
  });

  it("has category filter", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FilterBar.tsx", "utf-8");
    assert.ok(
      content.includes("category") || content.includes("หมวด"),
      "FilterBar ต้องมีตัวเลือกหมวดหมู่"
    );
  });

  it("has account filter", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FilterBar.tsx", "utf-8");
    assert.ok(
      content.includes("account") || content.includes("กระเป๋า"),
      "FilterBar ต้องมีตัวเลือกกระเป๋า"
    );
  });

  it("updates URL on filter change", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FilterBar.tsx", "utf-8");
    assert.ok(
      content.includes("router.push") || content.includes("useRouter"),
      "FilterBar ต้อง push URL เมื่อเปลี่ยน filter (shareable)"
    );
  });
});

describe("transactions page", () => {
  it("has /transactions route", async () => {
    const fs = await import("node:fs/promises");
    await fs.access("src/app/transactions/page.tsx");
  });

  it("exports dynamic = force-dynamic", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("force-dynamic") || content.includes("dynamic"),
      "page.tsx ควรมี dynamic = force-dynamic"
    );
  });

  it("server component checks auth", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("getUser") || content.includes("auth"),
      "page.tsx ต้องตรวจสอบ authentication"
    );
  });

  it("redirects to /login when not authenticated", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("redirect") && content.includes("/login"),
      "page.tsx ต้อง redirect ไป /login เมื่อยังไม่ login"
    );
  });

  it("uses keyset pagination (not offset)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("occurred_at") && content.includes("id"),
      "page.tsx ต้องใช้ keyset cursor (occurred_at + id) ไม่ใช่ OFFSET"
    );
    assert.ok(
      !content.includes("OFFSET") && !content.includes("offset"),
      "page.tsx ห้ามใช้ OFFSET"
    );
  });

  it("fetches 51 items for hasMore detection", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("51") || content.includes("limit(51)"),
      "page.tsx ต้อง fetch 51 รายการเพื่อตรวจ hasMore"
    );
  });

  it("filters soft-deleted items", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("deleted_at"),
      "page.tsx ต้องกรองรายการที่ soft delete แล้ว"
    );
  });

  it("calculates income and expense totals", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/transactions/page.tsx", "utf-8");
    assert.ok(
      content.includes("totalIncome") || content.includes("total_income"),
      "page.tsx ต้องคำนวณยอดรายรับ"
    );
    assert.ok(
      content.includes("totalExpense") || content.includes("total_expense"),
      "page.tsx ต้องคำนวณยอดรายจ่าย"
    );
  });
});

describe("TransactionPageClient", () => {
  it("does not use useSearchParams (avoids Suspense requirement)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      !content.includes("useSearchParams"),
      "TransactionPageClient ห้ามใช้ useSearchParams (ต้องไม่ต้อง Suspense wrapping)"
    );
  });

  it("uses IntersectionObserver for infinite scroll", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("IntersectionObserver"),
      "TransactionPageClient ต้องใช้ IntersectionObserver สำหรับ infinite scroll"
    );
  });

  it("fetches from /api/transactions/next for keyset paging", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("/api/transactions/next"),
      "TransactionPageClient ต้อง fetch จาก /api/transactions/next"
    );
  });

  it("handles loading state with skeleton", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("loading") && content.includes("Skeleton"),
      "TransactionPageClient ต้องแสดง skeleton ตอน loading"
    );
  });

  it("handles empty state", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("EmptyState") || content.includes("empty"),
      "TransactionPageClient ต้องแสดง empty state"
    );
  });

  it("handles error state with retry", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("ErrorState") || content.includes("error"),
      "TransactionPageClient ต้องแสดง error state"
    );
    assert.ok(
      content.includes("on_retry") || content.includes("retry"),
      "TransactionPageClient ต้องมี retry mechanism"
    );
  });

  it("shows end-of-list indicator when no more items", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/transactions/TransactionPageClient.tsx",
      "utf-8"
    );
    assert.ok(
      content.includes("หมดแล้ว") || content.includes("end") || content.includes("no more"),
      "TransactionPageClient ต้องแสดง indicator เมื่อไม่มีรายการเพิ่ม"
    );
  });
});

describe("API route /api/transactions/next", () => {
  it("route file exists", async () => {
    const fs = await import("node:fs/promises");
    await fs.access("src/app/api/transactions/next/route.ts");
  });

  it("exports GET handler", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("export async function GET"),
      "route.ts ต้อง export GET handler"
    );
  });

  it("checks authentication", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("getUser") || content.includes("auth"),
      "route.ts ต้องตรวจสอบ authentication"
    );
  });

  it("returns 401 when not authenticated", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("401"),
      "route.ts ต้อง return 401 เมื่อยังไม่ login"
    );
  });

  it("uses keyset cursor from query params", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("cursor_occurred_at") && content.includes("cursor_id"),
      "route.ts ต้องรับ cursor_occurred_at และ cursor_id จาก query params"
    );
  });

  it("filters soft-deleted items", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("deleted_at"),
      "route.ts ต้องกรองรายการที่ soft delete แล้ว"
    );
  });

  it("returns items and next_cursor", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("next_cursor"),
      "route.ts ต้อง return next_cursor"
    );
    assert.ok(
      content.includes("items"),
      "route.ts ต้อง return items"
    );
  });

  it("has force-dynamic export", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/app/api/transactions/next/route.ts",
      "utf-8"
    );
    assert.ok(
      content.includes("force-dynamic"),
      "route.ts ต้องมี dynamic = force-dynamic"
    );
  });
});
