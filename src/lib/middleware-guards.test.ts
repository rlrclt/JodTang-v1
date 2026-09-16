import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("isPublicPath", () => {
  it("returns true for /login", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/login"), true);
  });

  it("returns true for /auth/callback", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/auth/callback"), true);
  });

  it("returns true for /auth/signin", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/auth/signin"), true);
  });

  it("returns true for /offline (PWA offline page)", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/offline"), true);
  });

  it("returns true for /manifest.webmanifest (PWA manifest)", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/manifest.webmanifest"), true);
  });

  it("returns false for /", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/"), false);
  });

  it("returns false for /dashboard", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/dashboard"), false);
  });

  it("returns false for /settings", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/settings"), false);
  });

  it("does not match sub-paths of non-public routes", async () => {
    const { isPublicPath } = await import("./middleware-guards.ts");
    assert.equal(isPublicPath("/login/callback"), true); // /login/* is public
    assert.equal(isPublicPath("/auth/signin/google"), true); // /auth/signin/* is public
    assert.equal(isPublicPath("/api/data"), false);
    assert.equal(isPublicPath("/offline/settings"), true); // /offline/* is public
  });
});

describe("middlewareConfig", () => {
  it("has matcher that excludes _next/static", async () => {
    const { middlewareConfig } = await import("./middleware-guards.ts");
    const str = JSON.stringify(middlewareConfig.matcher);
    assert.ok(str.includes("_next/static"), "should exclude _next/static");
  });

  it("has matcher that excludes image files", async () => {
    const { middlewareConfig } = await import("./middleware-guards.ts");
    const str = JSON.stringify(middlewareConfig.matcher);
    assert.ok(str.includes("png"), "should exclude png files");
    assert.ok(str.includes("svg"), "should exclude svg files");
  });

  it("matcher is a non-empty array", async () => {
    const { middlewareConfig } = await import("./middleware-guards.ts");
    assert.ok(Array.isArray(middlewareConfig.matcher));
    assert.ok(middlewareConfig.matcher.length > 0);
  });
});
