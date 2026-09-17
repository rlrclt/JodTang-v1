"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCalendarData,
  type CalendarDayTotal,
  type CalendarMonthTotal,
} from "@/app/actions/get-calendar-data";
import { formatSatang } from "@/lib/format-satang";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";
import { toTimestamptz } from "@/lib/date";
import { buildTransactionParams } from "@/lib/transaction-params";

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const BE = 543;

type Props = {
  /** month string "YYYY-MM-01" */
  month: string;
  setMonth: (m: string) => void;
  /** summary ของเดือนปัจจุบันที่กำลังดู (จาก useTransactions) */
  summary: { income: number; expense: number; balance: number };
};

type CalendarEntry = {
  year: number;
  month: number;
  months: CalendarMonthTotal[];
  days: CalendarDayTotal[];
  cachedAt: number;
};

// แคชฝั่ง client — ลด refetch ตอนปุ่ม ‹ › และเปลี่ยนปีในมุมมองปี
const calendarCache = new Map<string, CalendarEntry>();
const CAL_CACHE_MAX = 4;
const CAL_CACHE_STALE_MS = 60_000;

function writeCalendarCache(key: string, entry: CalendarEntry) {
  calendarCache.delete(key);
  calendarCache.set(key, entry);
  while (calendarCache.size > CAL_CACHE_MAX) {
    const oldest = calendarCache.keys().next().value;
    if (oldest === undefined) break;
    calendarCache.delete(oldest);
  }
}

/** ฿ หลักสิบ/หลักพัน → "12", "1.2K" */
function shortBaht(satang: number): string {
  const b = satang / 100;
  if (b < 1000) return String(Math.round(b));
  const k = b / 1000;
  return (k % 1 === 0 ? String(Math.round(k)) : k.toFixed(1)) + "K";
}

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, "0");
  return `${ny}-${nm}-01`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** วันนี้ตามเวลา Asia/Bangkok */
function getTodayParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
}

/**
 * ปฏิทินแบบ iOS Zoom (Design 7)
 * - ปุ่มกลางแสดงชื่อเดือน (มุมมองเดือน) หรือปี (มุมมองปี)
 * - แตะปุ่มกลาง → ซูมออกเป็นปี / ซูมเข้าเป็นเดือน
 * - คอลัมน์บนสุดของเดือน: รายรับ/รายจ่าย/คงเหลือของเดือนที่กำลังดู
 * - แตะวันไหน → ไป /transactions ที่ฟิลเตอร์วันนั้น
 */
export default function MonthCalendar({ month, setMonth, summary }: Props) {
  const navigate = useSmoothNavigate();
  const [year, mnum] = month.split("-").map(Number);

  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [navYear, setNavYear] = useState(year);
  const [data, setData] = useState<CalendarEntry | null>(() => {
    const cached = calendarCache.get(`${year}-${month}`);
    return cached ? { ...cached } : null;
  });

  const effectiveYear = zoom ? navYear : year;
  const today = useMemo(() => getTodayParts(), []);
  // ป้องกันการเลื่อนหน้าจอ (Body scroll lock) ขณะที่เปิดปฏิทินกางทับ
  useEffect(() => {
    if (!isExpanded) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isExpanded]);

  // key ปัจจุบัน → ใช้แคชที่ mount ค้างไว้โดยไม่ต้อง setState ใน effect
  const key = `${effectiveYear}-${month}`;
  const displayData =
    data && data.year === effectiveYear && data.month === mnum
      ? data
      : calendarCache.get(key) ?? null;

  // โหลดข้อมูล (ปี × เดือน) — refetch เงียบแม้ cached (เอา neighbors มา warm cache ด้วย)
  useEffect(() => {
    let active = true;
    const cached = calendarCache.get(key);
    if (cached && Date.now() - cached.cachedAt < CAL_CACHE_STALE_MS) return;

    getCalendarData({ year: effectiveYear, month: mnum })
      .then((res) => {
        if (!active) return;
        if ("data" in res) {
          const entry: CalendarEntry = {
            year: effectiveYear,
            month: mnum,
            ...res.data,
            cachedAt: Date.now(),
          };
          writeCalendarCache(key, entry);
          setData(entry);
        }
      })
      .catch(() => {
        // เน็ตหล่นตอน refetch เงียบ — คงของเก่าไว้
      });

    // อุ่นเดือนข้างๆ ไว้ให้ปุ่ม ‹ › เปลี่ยนเดือนแบบไม่ต้องรอ
    for (const delta of [-1, 1]) {
      const ny = new Date(effectiveYear, mnum - 1 + delta, 1);
      const neighborYear = ny.getFullYear();
      const neighborMonth = ny.getMonth() + 1;
      const neighborKey = `${neighborYear}-${pad2(neighborMonth)}-01`;
      const neighborCacheKey = `${neighborYear}-${neighborKey}`;
      if (!calendarCache.has(neighborCacheKey)) {
        getCalendarData({ year: neighborYear, month: neighborMonth })
          .then((res) => {
            if ("data" in res) {
              const entry: CalendarEntry = {
                year: neighborYear,
                month: neighborMonth,
                ...res.data,
                cachedAt: Date.now(),
              };
              writeCalendarCache(neighborCacheKey, entry);
            }
          })
          .catch(() => {});
      }
    }

    return () => {
      active = false;
    };
  }, [key, effectiveYear, mnum]);

  const daysMap = useMemo(() => {
    const map = new Map<number, CalendarDayTotal>();
    if (displayData) for (const d of displayData.days) map.set(d.day, d);
    return map;
  }, [displayData]);

  const monthsMap = useMemo(() => {
    const map = new Map<number, CalendarMonthTotal>();
    if (displayData) for (const m of displayData.months) map.set(m.month, m);
    return map;
  }, [displayData]);

  // ยอดรวมปีเมื่ออยู่ในมุมมองปี
  const yearIncome = useMemo(() => {
    if (!displayData) return null;
    let inc = 0;
    let exp = 0;
    for (const m of displayData.months) {
      inc += m.income;
      exp += m.expense;
    }
    return { income: inc, expense: exp, balance: inc - exp };
  }, [displayData]);

  // ข้อมูลกริดเดือน
  const dim = useMemo(
    () => new Date(year, mnum, 0).getDate(),
    [year, mnum]
  );
  // วันแรกของเดือนคือวันไหน (Bangkok) — ใช้ timezone ชัดเจนกันพลาดวัน
  const firstDOW = useMemo(() => {
    const instant = new Date(`${month}T00:00:00+07:00`);
    return instant.getUTCDay();
  }, [month]);
  const isCurrentMonth = today.year === year && today.month === mnum;

  const prev = () => {
    if (zoom) setNavYear((y) => y - 1);
    else setMonth(shiftMonth(month, -1));
  };
  const next = () => {
    if (zoom) setNavYear((y) => y + 1);
    else setMonth(shiftMonth(month, 1));
  };

  const openDay = (d: number) => {
    const from = toTimestamptz(`${year}-${pad2(mnum)}-${pad2(d)}T00:00:00`);
    const to = toTimestamptz(`${year}-${pad2(mnum)}-${pad2(d + 1)}T00:00:00`);
    const params = buildTransactionParams({
      month: mnum,
      year,
      filters: { date_from: from, date_to: to },
    });
    navigate(`/transactions?${params.toString()}`, { direction: "forward" });
  };

  const strip = zoom ? yearIncome : summary;

  return (
    <div className={`relative ${isExpanded ? "z-[60]" : "z-30"}`}>
      {/* Backdrop เบลอทั่วทั้งจอ (ครอบคลุมทับ TabBar z-50 และล็อคไม่ให้ฉากหลังเลื่อน) */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => {
            setIsExpanded(false);
            setZoom(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Island Container — ขยายลอยทับเนื้อหาและเมนูบาร์ข้างล่างแบบ Dynamic Island */}
      <div
        className={`relative z-[70] overflow-hidden bg-surface/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isExpanded
            ? "absolute top-0 left-0 right-0 rounded-3xl p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:ring-white/10"
            : "rounded-[26px] p-2.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]"
        }`}
      >
      {/* Dynamic Header Row / Capsule Island */}
      <div className="flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={prev}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2/80 text-sm font-semibold text-text shadow-sm transition-transform active:scale-85 hover:bg-surface-2"
          aria-label={zoom ? "ปีก่อนหน้า" : "เดือนก่อนหน้า"}
        >
          ‹
        </button>

        {/* Capsule Center: Dynamic Island style pill */}
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              setIsExpanded(true);
            } else {
              setZoom((z) => !z);
            }
          }}
          className={`group flex items-center justify-center gap-2 rounded-full px-4 py-1.5 transition-all duration-300 active:scale-95 ${
            isExpanded
              ? "bg-focus/10 text-focus shadow-inner"
              : "bg-surface-2/90 hover:bg-surface-2 text-text"
          }`}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[14px] font-bold tracking-tight">
                {isExpanded && zoom ? `${navYear + BE}` : MONTHS[mnum - 1]}
              </span>
              <span
                className={`inline-block text-[10px] transition-transform duration-300 ${
                  isExpanded ? (zoom ? "rotate-90" : "rotate-180") : "rotate-0 text-text-muted"
                }`}
              >
                ▾
              </span>
            </div>
            <small className="block text-[9px] font-medium text-text-muted opacity-80">
              {!isExpanded
                ? `${year + BE} · แตะเปิดปฏิทิน`
                : zoom
                ? "แตะเพื่อดูเดือน"
                : `${year + BE} · ซูมดูทั้งปี`}
            </small>
          </div>
        </button>

        <button
          type="button"
          onClick={next}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2/80 text-sm font-semibold text-text shadow-sm transition-transform active:scale-85 hover:bg-surface-2"
          aria-label={zoom ? "ปีถัดไป" : "เดือนถัดไป"}
        >
          ›
        </button>
      </div>
      {/* แถบสรุปยอด */}
      {/* Summary Chips (iOS Segmented / Island Stats) */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-2/60 px-2 py-1.5 transition-all hover:bg-surface-2">
          <span className="text-[9px] font-medium text-text-muted">รายรับ</span>
          <span className="text-xs font-bold text-income tabular-nums">
            +{formatSatang(strip?.income ?? 0)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-2/60 px-2 py-1.5 transition-all hover:bg-surface-2">
          <span className="text-[9px] font-medium text-text-muted">รายจ่าย</span>
          <span className="text-xs font-bold text-expense tabular-nums">
            −{formatSatang(strip?.expense ?? 0)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface-2/60 px-2 py-1.5 transition-all hover:bg-surface-2">
          <span className="text-[9px] font-medium text-text-muted">คงเหลือ</span>
          <span
            className={`text-xs font-bold tabular-nums ${
              (strip?.balance ?? 0) >= 0 ? "text-balance" : "text-expense"
            }`}
          >
            {(strip?.balance ?? 0) >= 0 ? "+" : ""}
            {formatSatang(strip?.balance ?? 0)}
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="mt-3 border-t border-border/40 pt-2.5 animate-in fade-in zoom-in-95 duration-250">
          <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
            {/* ปุ่มซ้าย: ซูมสลับ 12 เดือน / ปฏิทินวัน */}
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              className="flex items-center gap-1 rounded-full bg-focus/10 px-2.5 py-1 text-[11px] font-bold text-focus transition-all active:scale-95 hover:bg-focus/20"
            >
              <span>{zoom ? "📅 ปฏิทินวัน" : "🔍 12 เดือน"}</span>
            </button>

            {/* ปุ่มกลาง: กะทัดรัด แตะเปิดตัวหมุนปี iOS Wheel */}
            <button
              type="button"
              onClick={() => setShowYearPicker((p) => !p)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold transition-all active:scale-95 shadow-xs ${
                showYearPicker
                  ? "bg-focus text-white"
                  : "bg-surface-2 text-text hover:bg-surface-2/80"
              }`}
              title="แตะเพื่อหมุนเลื่อนเลือกปีแบบ iOS"
            >
              <span>พ.ศ. {navYear + BE}</span>
              <span className="text-[9px] opacity-70">▾</span>
            </button>

            {/* ปุ่มขวา: พับเก็บ */}
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setZoom(false);
                setShowYearPicker(false);
              }}
              className="flex items-center gap-1 rounded-full bg-surface-2/80 px-2.5 py-1 text-[11px] font-medium text-text-muted hover:text-text active:scale-95 transition-all"
            >
              <span>พับเก็บ ✕</span>
            </button>
          </div>

          {/* iOS Drum Wheel Popover / Dropdown (กะทัดรัด สวยหรู สไตล์ iOS DatePicker) */}
          {showYearPicker && (
            <div className="mb-3 rounded-2xl border border-focus/20 bg-surface-2/90 p-2.5 shadow-lg backdrop-blur-xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-semibold text-text-muted">หมุนเลื่อนขึ้น-ลงเพื่อเลือกปี</span>
                <button
                  type="button"
                  onClick={() => setShowYearPicker(false)}
                  className="text-[10px] font-bold text-focus hover:underline"
                >
                  เสร็จสิ้น ✓
                </button>
              </div>
              <div
                className="relative h-28 overflow-y-auto snap-y snap-mandatory scroll-smooth py-9 text-center scrollbar-hide"
                tabIndex={0}
                aria-label="ตัวเลื่อนเลือกปีแบบ iOS"
              >
                <div className="pointer-events-none sticky top-1/2 -translate-y-1/2 h-9 -mx-2 rounded-xl bg-focus/15 border-y border-focus/30" />
                {Array.from({ length: 31 }, (_, i) => {
                  const y = today.year - 15 + i;
                  const isSelected = y === navYear;
                  const thaiYearText = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
                    year: "numeric",
                  }).format(new Date(y, 0, 1));

                  return (
                    <div
                      key={y}
                      onClick={() => {
                        setNavYear(y);
                      }}
                      className={`flex h-9 snap-center cursor-pointer items-center justify-center transition-all duration-150 ${
                        isSelected
                          ? "scale-110 text-sm font-extrabold text-focus"
                          : "scale-90 text-xs font-semibold text-text-muted opacity-40 hover:opacity-80"
                      }`}
                    >
                      {thaiYearText} ({y})
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* stage — 2 มุมมองซ้อนกัน ซูมสลับ สไตล์ iOS (cubic-bezier transition) */}
          <div className="relative overflow-hidden">
        <div
          className={`transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            zoom
              ? "pointer-events-none absolute inset-0 -translate-y-2.5 scale-125 opacity-0"
              : "scale-100 opacity-100"
          }`}
        >
          <div className="grid grid-cols-7">
            {DOW.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold text-text-muted"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDOW }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[46px]" />
            ))}
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1;
              const totals = daysMap.get(d);
              const isToday = isCurrentMonth && today.day === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => openDay(d)}
                  className={`flex min-h-[46px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-0.5 transition-colors active:bg-border ${
                    isToday ? "bg-focus/10" : ""
                  }`}
                >
                  <span className="text-xs font-semibold text-text">{d}</span>
                  {totals && totals.income > 0 && (
                    <span className="text-[9px] font-bold text-income">
                      +{shortBaht(totals.income)}
                    </span>
                  )}
                  {totals && totals.expense > 0 && (
                    <span className="text-[9px] font-bold text-expense">
                      −{shortBaht(totals.expense)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* มุมมองปี — แถบเปลี่ยนปีชัดเจน */}
        <div
          className={`transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            zoom
              ? "scale-100 opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-3.5 scale-75 opacity-0"
          }`}
        >

          <div className="grid grid-cols-3 gap-2 pt-0.5">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const totals = monthsMap.get(m);
              const isCurrent = navYear === year && m === mnum;
              const isTodayMonth =
                today.year === navYear && today.month === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMonth(`${navYear}-${pad2(m)}-01`);
                    setZoom(false);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 transition-all active:opacity-70 ${
                    isCurrent
                      ? "border-focus bg-focus/10"
                      : "border-border bg-surface"
                  } ${isTodayMonth ? "shadow-[inset_0_0_0_2px_#fbbf24]" : ""}`}
                >
                  <span className="text-xs font-bold text-text">
                    {MONTHS_SHORT[m - 1]}
                  </span>
                  <span className="text-[10px] font-bold text-expense tabular-nums">
                    {totals && totals.expense > 0
                      ? "−" + shortBaht(totals.expense)
                      : "—"}
                  </span>
                  {totals && totals.income > 0 && (
                    <span className="text-[10px] font-bold text-income tabular-nums">
                      +{shortBaht(totals.income)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>
      )}
      </div>
    </div>
  );
}