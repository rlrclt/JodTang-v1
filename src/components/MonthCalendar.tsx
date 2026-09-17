"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCalendarData,
  type CalendarDayTotal,
  type CalendarMonthTotal,
} from "@/app/actions/get-calendar-data";
import { formatSatang } from "@/lib/format-satang";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";
import { toTimestamptz } from "@/lib/date";
import { buildTransactionParams } from "@/lib/transaction-params";

// มาตรฐานเวลาสากลผ่าน ECMAScript Internationalization API (Intl)
const BKK_TZ = "Asia/Bangkok";
const THAI_BUDDHIST_LOCALE = "th-TH-u-ca-buddhist";

const monthFormatter = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  month: "long",
  timeZone: BKK_TZ,
});

const monthShortFormatter = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  month: "short",
  timeZone: BKK_TZ,
});

const yearFormatter = new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, {
  year: "numeric",
  timeZone: BKK_TZ,
});

const weekdayShortFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "narrow",
  timeZone: BKK_TZ,
});

// ดึงชื่อวันในสัปดาห์ 7 วันจากปฏิทินสากลโลก (อา-ส)
const DOW = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
  // 2026-09-06 คือวันอาทิตย์
  const d = new Date(Date.UTC(2026, 8, 6 + dayOffset));
  return weekdayShortFormatter.format(d);
});

type Props = {
  /** month string "YYYY-MM-01" */
  month: string;
  setMonth: (m: string) => void;
  /** summary ของเดือนปัจจุบันที่กำลังดู */
  summary: { income: number; expense: number; balance: number };
};

type CalendarEntry = {
  year: number;
  month: number;
  months: CalendarMonthTotal[];
  days: CalendarDayTotal[];
  cachedAt: number;
};

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

function getTodayParts(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BKK_TZ,
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

export default function MonthCalendar({ month, setMonth, summary }: Props) {
  const navigate = useSmoothNavigate();
  const [year, mnum] = month.split("-").map(Number);

  const [isExpanded, setIsExpanded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [navYear, setNavYear] = useState(year);

  const wheelRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<CalendarEntry | null>(() => {
    const cached = calendarCache.get(`${year}-${month}`);
    return cached ? { ...cached } : null;
  });

  const effectiveYear = zoom ? navYear : year;
  const today = useMemo(() => getTodayParts(), []);

  // เมื่อเปิดตัวเลื่อนปี iOS Scroll Wheel ให้เลื่อนกลิ้งไปที่ปีปัจจุบันอัตโนมัติ
  useEffect(() => {
    if (!showYearPicker || !wheelRef.current) return;
    const targetElement = wheelRef.current.querySelector<HTMLElement>(`[data-year="${navYear}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [showYearPicker, navYear]);

  // ล็อค Scroll ของหน้าจอฉากหลังเมื่อกางปฏิทิน
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

  const key = `${effectiveYear}-${month}`;
  const displayData =
    data && data.year === effectiveYear && data.month === mnum
      ? data
      : calendarCache.get(key) ?? null;

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
      .catch(() => {});

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

  const dim = useMemo(() => new Date(year, mnum, 0).getDate(), [year, mnum]);
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

  // แปลงเดือนและปีผ่าน Intl ตามมาตรฐานโลก
  const currentMonthDate = useMemo(() => new Date(year, mnum - 1, 1), [year, mnum]);
  const navYearDate = useMemo(() => new Date(navYear, 0, 1), [navYear]);
  const monthNameText = monthFormatter.format(currentMonthDate);
  const yearText = yearFormatter.format(currentMonthDate);
  const navYearText = yearFormatter.format(navYearDate);

  return (
    <div className={`relative ${isExpanded ? "z-[60]" : "z-30"}`}>
      {/* Backdrop เบลอทั่วจอ สไตล์ iOS Sheet */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={() => {
            setIsExpanded(false);
            setZoom(false);
            setShowYearPicker(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Dynamic Island Capsule Container */}
      <div
        className={`relative z-[70] overflow-hidden bg-surface/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 transition-all duration-350 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isExpanded
            ? "absolute top-0 left-0 right-0 rounded-3xl p-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-black/5 dark:ring-white/10"
            : "rounded-[26px] p-2.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)]"
        }`}
      >
        {/* แถบหัวแคปซูล Dynamic Island */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={prev}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2/80 text-sm font-semibold text-text shadow-sm transition-transform active:scale-85 hover:bg-surface-2"
            aria-label={zoom ? "ปีก่อนหน้า" : "เดือนก่อนหน้า"}
          >
            ‹
          </button>

          {/* ปุ่มกลางรูปทรงแคปซูลเกาะไดนามิก */}
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
                  {isExpanded && zoom ? navYearText : monthNameText}
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
                  ? `${yearText} · แตะเปิดปฏิทิน`
                  : zoom
                  ? "แตะเพื่อดูรายวัน"
                  : `${yearText} · ซูมดูทั้งปี`}
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

        {/* ชิปแสดงสถิติ 3 ช่อง (รายรับ/รายจ่าย/คงเหลือ) */}
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

        {/* ส่วนปฏิทินเมื่อขยาย (Expanded Content) */}
        {isExpanded && (
          <div className="mt-3 border-t border-border/40 pt-2.5 animate-in fade-in zoom-in-95 duration-250">
            {/* แถบควบคุม: สลับ 12 เดือน | ปุ่มหมุนปีแบบ iOS ตรงกลาง | พับเก็บ */}
            <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="flex items-center gap-1 rounded-full bg-focus/10 px-2.5 py-1 text-[11px] font-bold text-focus transition-all active:scale-95 hover:bg-focus/20"
              >
                <span>{zoom ? "📅 ปฏิทินวัน" : "🔍 12 เดือน"}</span>
              </button>

              {/* ปุ่มเลือกล้อปี iOS Wheel กลางแถบ */}
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
                <span>{navYearText}</span>
                <span className="text-[9px] opacity-70">▾</span>
              </button>

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

            {/* iOS Drum Wheel Picker Dropdown Card */}
            {showYearPicker && (
              <div className="mb-3 rounded-2xl border border-focus/20 bg-surface-2/90 p-2.5 shadow-lg backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-semibold text-text-muted">
                    หมุนเลื่อนขึ้น-ลงเพื่อเลือกปี (Intl Wheel)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowYearPicker(false)}
                    className="text-[10px] font-bold text-focus hover:underline"
                  >
                    เสร็จสิ้น ✓
                  </button>
                </div>

                <div
                  ref={wheelRef}
                  className="relative h-28 overflow-y-auto snap-y snap-mandatory scroll-smooth py-9 text-center scrollbar-hide"
                  tabIndex={0}
                  aria-label="ตัวเลื่อนเลือกปีแบบ iOS"
                >
                  <div className="pointer-events-none sticky top-1/2 -translate-y-1/2 h-9 -mx-2 rounded-xl bg-focus/15 border-y border-focus/30" />
                  {Array.from({ length: 41 }, (_, i) => {
                    const y = today.year - 20 + i;
                    const isSelected = y === navYear;
                    const thaiYear = yearFormatter.format(new Date(y, 0, 1));

                    return (
                      <div
                        key={y}
                        data-year={y}
                        onClick={() => setNavYear(y)}
                        className={`flex h-9 snap-center cursor-pointer items-center justify-center transition-all duration-150 ${
                          isSelected
                            ? "scale-110 text-sm font-extrabold text-focus"
                            : "scale-90 text-xs font-semibold text-text-muted opacity-40 hover:opacity-80"
                        }`}
                      >
                        {thaiYear} ({y})
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* stage — สลับมุมมองเดือน/ปี สไตล์ iOS (cubic-bezier) */}
            <div className="relative overflow-hidden">
              {/* มุมมองเดือน */}
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

              {/* มุมมองปี */}
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
                    const isTodayMonth = today.year === navYear && today.month === m;
                    const shortName = monthShortFormatter.format(new Date(navYear, m - 1, 1));

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
                        <span className="text-xs font-bold text-text">{shortName}</span>
                        <span className="text-[10px] font-bold text-expense tabular-nums">
                          {totals && totals.expense > 0 ? "−" + shortBaht(totals.expense) : "—"}
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
