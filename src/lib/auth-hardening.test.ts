import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ============================================================
// D1 — validateSessionResult: getUser() result ต้องถูกต้อง
// (ทดสอบแทน middleware.ts ที่ต้องพึ่ง Next.js runtime)
// ============================================================
describe("validateSessionResult (D1)", () => {
  it("returns true when user exists and no error", async () => {
    const { validateSessionResult } = await import("./middleware-guards.ts");
    const result = validateSessionResult({
      data: { user: { id: "u1", email: "a@b.com" } },
      error: null,
    });
    assert.equal(result, true);
  });

  it("returns false when user is null (no session / invalid JWT)", async () => {
    const { validateSessionResult } = await import("./middleware-guards.ts");
    const result = validateSessionResult({
      data: { user: null },
      error: null,
    });
    assert.equal(result, false);
  });

  it("returns false when error is present (JWT tampered / expired)", async () => {
    const { validateSessionResult } = await import("./middleware-guards.ts");
    const result = validateSessionResult({
      data: { user: null },
      error: { message: "invalid JWT" },
    });
    assert.equal(result, false);
  });

  it("returns false when user is undefined", async () => {
    const { validateSessionResult } = await import("./middleware-guards.ts");
    const result = validateSessionResult({
      data: { user: undefined },
      error: null,
    });
    assert.equal(result, false);
  });
});

// ============================================================
// D4 — isValidOAuthProvider: allow-list ต้องถูกต้อง
// ============================================================
describe("isValidOAuthProvider (D4)", () => {
  it("accepts 'google' as a valid provider", async () => {
    const { isValidOAuthProvider } = await import("./middleware-guards.ts");
    assert.equal(isValidOAuthProvider("google"), true);
  });

  it("rejects bogus provider", async () => {
    const { isValidOAuthProvider } = await import("./middleware-guards.ts");
    assert.equal(isValidOAuthProvider("bogus"), false);
  });

  it("rejects custom:line format", async () => {
    const { isValidOAuthProvider } = await import("./middleware-guards.ts");
    assert.equal(isValidOAuthProvider("custom:line"), false);
  });

  it("rejects empty string", async () => {
    const { isValidOAuthProvider } = await import("./middleware-guards.ts");
    assert.equal(isValidOAuthProvider(""), false);
  });

  it("rejects case-mixed variant", async () => {
    const { isValidOAuthProvider } = await import("./middleware-guards.ts");
    assert.equal(isValidOAuthProvider("Google"), false);
  });
});

// ============================================================
// D3 — signOut: ต้อง redirect ไม่ใช่ throw (tested via file
// content because next/navigation redirect() can't run outside
// Next.js runtime)
// ============================================================
describe("signOut robustness (D3)", () => {
  it("actions.ts has try/catch wrapping signOut + redirect", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.resolve(
        import.meta.dirname ?? ".",
        "../lib/supabase/actions.ts"
      ),
      "utf-8"
    );
    // signOut must have try/catch — if signOut fails, it should not 500
    assert.ok(
      content.includes("try") && content.includes("catch"),
      "signOut action must have try/catch to prevent 500 on invalid session"
    );
    // redirect to /login must exist
    assert.ok(
      content.includes('"/login"') || content.includes("'/login'"),
      "signOut must redirect to /login"
    );
  });
});

// ============================================================
// D4 — /auth/signin route: must validate provider before GoTrue
// ============================================================
describe("/auth/signin route provider validation (D4)", () => {
  it("signin route imports isValidOAuthProvider", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.resolve(
        import.meta.dirname ?? ".",
        "../app/auth/signin/route.ts"
      ),
      "utf-8"
    );
    assert.ok(
      content.includes("isValidOAuthProvider"),
      "signin route must import isValidOAuthProvider from middleware-guards"
    );
  });

  it("signin route rejects unknown providers before calling GoTrue", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const content = fs.readFileSync(
      path.resolve(
        import.meta.dirname ?? ".",
        "../app/auth/signin/route.ts"
      ),
      "utf-8"
    );
    // Must check isValidOAuthProvider and redirect to /login?error=unknown_provider
    assert.ok(
      content.includes("unknown_provider"),
      "signin route must redirect with unknown_provider error for invalid providers"
    );
    // The check must happen before signInWithOAuth call
    const providerCheckIdx = content.indexOf("isValidOAuthProvider");
    const signInIdx = content.indexOf("signInWithOAuth");
    assert.ok(
      providerCheckIdx < signInIdx,
      "provider validation must happen before signInWithOAuth call"
    );
  });
});
