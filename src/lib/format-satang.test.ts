import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatSatang } from "./format-satang.ts";

describe("formatSatang", () => {
  it("formats 0 satang as ฿0", () => {
    assert.equal(formatSatang(BigInt(0)), "฿0");
  });

  it("formats 1 satang as ฿0 (sub-baht rounds down)", () => {
    assert.equal(formatSatang(BigInt(1)), "฿0");
  });

  it("formats 100 satang (1 baht) correctly", () => {
    assert.equal(formatSatang(BigInt(100)), "฿1");
  });

  it("formats values with comma separators", () => {
    // 100,000 satang = 1,000 baht
    assert.equal(formatSatang(BigInt(100000)), "฿1,000");
  });

  it("formats large values with commas", () => {
    // 1,000,000 satang = 10,000 baht
    assert.equal(formatSatang(BigInt(1000000)), "฿10,000");
  });

  it("formats number input the same as bigint", () => {
    assert.equal(formatSatang(100), "฿1");
    assert.equal(formatSatang(100000), "฿1,000");
  });

  it("formats negative values", () => {
    assert.equal(formatSatang(BigInt(-100)), "-฿1");
    assert.equal(formatSatang(-1), "-฿0");
  });

  it("formats fractional baht values correctly", () => {
    // 150 satang = 1.50 baht → rounds to ฿2 with maxFractionDigits=0
    assert.equal(formatSatang(BigInt(150)), "฿2");
  });

  it("returns string containing ฿ symbol", () => {
    const result = formatSatang(BigInt(5000));
    assert.ok(result.includes("฿"), `Expected ฿ in "${result}"`);
  });
});
