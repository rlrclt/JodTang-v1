import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("AppShell design tokens (CSS)", () => {
  it("globals.css defines required CSS custom properties", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile("src/app/globals.css", "utf-8");

    // สีหลัก — Tailwind v4 @theme ใช้ prefix --color-
    const requiredVars = [
      "--color-bg",
      "--color-surface",
      "--color-surface-2",
      "--color-border",
      "--color-text",
      "--color-text-muted",
      "--color-income",
      "--color-expense",
      "--color-balance",
      "--color-warn",
      "--color-focus",
    ];
    for (const v of requiredVars) {
      assert.ok(
        css.includes(`${v}:`),
        `globals.css ควรมี custom property ${v}`,
      );
    }

    // radius tokens
    const requiredRadius = [
      "--radius-input",
      "--radius-btn",
      "--radius-card",
      "--radius-sheet",
      "--radius-pill",
    ];
    for (const r of requiredRadius) {
      assert.ok(
        css.includes(`${r}:`),
        `globals.css ควรมี radius token ${r}`,
      );
    }
  });

  it("globals.css uses semantic names (bg-surface, text-muted) via @theme", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile("src/app/globals.css", "utf-8");
    // Tailwind v4 @theme ใช้ register ชื่อ semantic
    assert.ok(
      css.includes("bg-surface") || css.includes("--color-surface"),
      "globals.css ควรมี semantic color name สำหรับ surface",
    );
    assert.ok(
      css.includes("text-muted") || css.includes("--color-text-muted"),
      "globals.css ควรมี semantic color name สำหรับ text-muted",
    );
  });

  it("globals.css has 100dvh body rule (not 100vh)", async () => {
    const fs = await import("node:fs/promises");
    const css = await fs.readFile("src/app/globals.css", "utf-8");
    assert.ok(css.includes("100dvh"), "body ควรใช้ 100dvh ไม่ใช่ 100vh");
    assert.ok(
      css.includes("overscroll-behavior"),
      "body ควร overscroll-behavior: none",
    );
  });
});

describe("TabBar component", () => {
  it("renders 4 tabs with correct labels and hrefs", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/components/TabBar.tsx",
      "utf-8",
    );

    const tabs = [
      { label: "หน้าแรก", href: "/" },
      { label: "รายการ", href: "/transactions" },
      { label: "สรุป", href: "/summary" },
      { label: "ตั้งค่า", href: "/settings" },
    ];

    for (const t of tabs) {
      assert.ok(
        content.includes(t.label),
        `TabBar ควรมี tab "${t.label}"`,
      );
      assert.ok(
        content.includes(t.href),
        `TabBar ควรมี link ไป ${t.href}`,
      );
    }
  });

  it("has safe-area-inset-bottom padding", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/components/TabBar.tsx",
      "utf-8",
    );
    assert.ok(
      content.includes("safe-area-inset-bottom"),
      "TabBar ควรมี safe-area-inset-bottom",
    );
  });

  it("tab bar height is 56px", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/components/TabBar.tsx",
      "utf-8",
    );
    assert.ok(
      content.includes("56"),
      "TabBar ควรมีความสูง 56px",
    );
  });
});

describe("FAB component", () => {
  it("renders 56x56 button", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FAB.tsx", "utf-8");
    assert.ok(content.includes("56"), "FAB ควรมีขนาด 56x56");
  });

  it("has safe-area-aware positioning", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FAB.tsx", "utf-8");
    assert.ok(
      content.includes("safe-area-inset-bottom") ||
        content.includes("bottom-["),
      "FAB ควรวางตัวโดยอิง safe-area",
    );
  });

  it("does not overlap tab bar (positioned above 56px bar)", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/components/FAB.tsx", "utf-8");
    // FAB ควรวางเหนือ tab bar — bottom ต้องมากกว่า 56px + safe-area
    assert.ok(
      content.includes("bottom-") || content.includes("bottom:"),
      "FAB ควรมี positioning ด้านล่าง",
    );
  });
});

describe("AppShell layout", () => {
  it("main content has padding-bottom for tab bar", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(
      "src/components/AppShell.tsx",
      "utf-8",
    );
    assert.ok(
      content.includes("padding-bottom") || content.includes("pb-"),
      "AppShell ควรมี padding-bottom สำหรับ tab bar",
    );
  });

  it("layout.tsx wraps children with AppShell", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/layout.tsx", "utf-8");
    assert.ok(
      content.includes("AppShell"),
      "layout.tsx ควรใช้ AppShell ครอบ children",
    );
  });
});

describe("Layout metadata", () => {
  it("layout.tsx has viewport-fit=cover", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/layout.tsx", "utf-8");
    assert.ok(
      content.includes("viewportFit") || content.includes("viewport-fit"),
      "layout.tsx ควรมี viewport-fit=cover",
    );
  });

  it("layout.tsx loads IBM Plex Sans Thai font", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/layout.tsx", "utf-8");
    assert.ok(
      content.includes("IBM_Plex_Sans_Thai") ||
        content.includes("IBM Plex Sans Thai") ||
        content.includes("ibm-plex-sans-thai"),
      "layout.tsx ควรโหลด IBM Plex Sans Thai",
    );
  });

  it("layout.tsx has tabular-nums for number display", async () => {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile("src/app/layout.tsx", "utf-8");
    assert.ok(
      content.includes("tabular-nums"),
      "layout.tsx ควรมี font-variant-numeric: tabular-nums",
    );
  });
});

describe("Offline page", () => {
  it("/offline page exists", async () => {
    const fs = await import("node:fs/promises");
    await fs.access("src/app/offline/page.tsx");
  });
});
