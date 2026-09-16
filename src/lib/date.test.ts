import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMonthRange,
  getCurrentMonthRange,
  getCurrentYearMonth,
  toTimestamptz,
} from "./date.ts";

describe("getMonthRange", () => {
  it("returns correct start and end for September 2026", () => {
    const { start, end } = getMonthRange(2026, 9);
    // Sept 1 2026 00:00:00 Asia/Bangkok = Aug 31 17:00:00 UTC
    assert.equal(start, "2026-08-31T17:00:00.000Z");
    // Oct 1 2026 00:00:00 Asia/Bangkok = Sep 30 17:00:00 UTC
    assert.equal(end, "2026-09-30T17:00:00.000Z");
  });

  it("handles December → January year boundary", () => {
    const { start, end } = getMonthRange(2026, 12);
    // Dec 1 2026 00:00:00 Bangkok = Nov 30 17:00:00 UTC
    assert.equal(start, "2026-11-30T17:00:00.000Z");
    // Jan 1 2027 00:00:00 Bangkok = Dec 31 17:00:00 UTC
    assert.equal(end, "2026-12-31T17:00:00.000Z");
  });

  it("handles February (short month)", () => {
    const { start, end } = getMonthRange(2026, 2);
    assert.equal(start, "2026-01-31T17:00:00.000Z");
    // Mar 1 2026 00:00:00 Bangkok = Feb 28 17:00:00 UTC
    assert.equal(end, "2026-02-28T17:00:00.000Z");
  });

  it("start is always before end", () => {
    for (let m = 1; m <= 12; m++) {
      const { start, end } = getMonthRange(2026, m);
      assert.ok(start < end, `Month ${m}: start ${start} should be before end ${end}`);
    }
  });
});

describe("Asia/Bangkok month boundary verification", () => {
  it("2026-09-30T23:30:00+07:00 is in September", () => {
    const d = new Date("2026-09-30T23:30:00+07:00");
    const month = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        month: "2-digit",
      }).format(d)
    );
    assert.equal(month, 9, "Should be September (9)");
  });

  it("2026-10-01T00:30:00+07:00 is in October", () => {
    const d = new Date("2026-10-01T00:30:00+07:00");
    const month = parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Bangkok",
        month: "2-digit",
      }).format(d)
    );
    assert.equal(month, 10, "Should be October (10)");
  });

  it("Sept 30 23:59 Bangkok falls within Sept range", () => {
    const d = new Date("2026-09-30T23:59:00+07:00");
    const { start, end } = getMonthRange(2026, 9);
    assert.ok(d.toISOString() >= start, `${d.toISOString()} >= ${start}`);
    assert.ok(d.toISOString() < end, `${d.toISOString()} < ${end}`);
  });

  it("Oct 1 00:01 Bangkok falls within Oct range, not Sept", () => {
    const d = new Date("2026-10-01T00:01:00+07:00");
    const septRange = getMonthRange(2026, 9);
    const octRange = getMonthRange(2026, 10);
    assert.ok(d.toISOString() >= septRange.end, "Should be >= Sept end (outside Sept)");
    assert.ok(d.toISOString() >= octRange.start, "Should be >= Oct start");
    assert.ok(d.toISOString() < octRange.end, "Should be < Oct end");
  });
});

describe("getCurrentMonthRange", () => {
  it("returns valid ISO strings", () => {
    const { start, end } = getCurrentMonthRange();
    assert.ok(!isNaN(Date.parse(start)), `start ${start} should be valid ISO`);
    assert.ok(!isNaN(Date.parse(end)), `end ${end} should be valid ISO`);
    assert.ok(start < end, "start should be before end");
  });
});

describe("getCurrentYearMonth", () => {
  it("returns year >= 2026 and month 1-12", () => {
    const { year, month } = getCurrentYearMonth();
    assert.ok(year >= 2026, `year ${year} should be >= 2026`);
    assert.ok(month >= 1 && month <= 12, `month ${month} should be 1-12`);
  });
});

describe("toTimestamptz", () => {
  it("converts Bangkok time to UTC ISO string", () => {
    // 2026-09-30T23:30:00+07:00 = 2026-09-30T16:30:00Z
    const result = toTimestamptz("2026-09-30T23:30:00");
    assert.equal(result, "2026-09-30T16:30:00.000Z");
  });

  it("handles midnight Bangkok = 17:00 previous day UTC", () => {
    // 2026-10-01T00:00:00+07:00 = 2026-09-30T17:00:00Z
    const result = toTimestamptz("2026-10-01T00:00:00");
    assert.equal(result, "2026-09-30T17:00:00.000Z");
  });
});
