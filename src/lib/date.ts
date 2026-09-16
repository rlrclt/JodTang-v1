/**
 * helpers สำหรับตัดเดือนตาม timezone Asia/Bangkok
 *
 * กติกาจาก PLAN.md §4:
 * - occurred_at = timestamptz (เก็บเป็น UTC ใน DB)
 * - ตัดเดือนตาม Asia/Bangkok → start/end ของเดือน
 * - start = วันแรกของเดือน 00:00:00 Asia/Bangkok
 * - end = วันแรกของเดือนถัดไป 00:00:00 Asia/Bangkok (exclusive)
 * - ค่า default = เดือนปัจจุบัน ตามนาฬิกา Asia/Bangkok
 * - คืนค่าเป็น ISO string ที่ฝั่ง Supabase query ใช้ได้เลย
 */

const TIMEZONE = "Asia/Bangkok";

/**
 * สร้าง Date object ที่ represents เวลา "ตอนต้นวัน" ของวันที่กำหนดใน timezone Asia/Bangkok
 * คืนค่าเป็น UTC Date ที่ตรงกับเวลา 00:00:00 ของวันนั้นใน Asia/Bangkok
 */
function startOfDayInBangkok(year: number, month: number, day: number): Date {
  // สร้าง string ที่ parse ได้ใน local time ของ timezone ที่ต้องการ
  // ใช้วิธีหา offset ของ Asia/Bangkok แล้วคำนวณ UTC
  const localStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00`;
  // ใช้ Intl หา offset ของ timezone
  const bangkokTime = new Date(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(`${localStr}+07:00`))
  );

  // วิธีที่แม่นกว่า: คำนวณ offset จาก UTC
  const utcDate = new Date(`${localStr}Z`);
  // หา offset ของ UTC moment ใน Asia/Bangkok
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // สร้าง UTC date จาก string แล้วปรับ offset
  const testDate = new Date(`${localStr}Z`);
  const parts = formatter.formatToParts(testDate);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value);

  const bangkokHour = get("hour");
  const bangkokMin = get("minute");
  const bangkokSec = get("second");
  const bangkokDay = get("day");
  const bangkokMonth = get("month");
  const bangkokYear = get("year");

  // offset = bangkok time - UTC time (in ms)
  const bangkokAsUTC = Date.UTC(
    bangkokYear,
    bangkokMonth - 1,
    bangkokDay,
    bangkokHour === 24 ? 0 : bangkokHour,
    bangkokMin,
    bangkokSec
  );
  const offsetMs = bangkokAsUTC - testDate.getTime();
  // offsetHours = offsetMs / 3600000 → สำหรับ Bangkok คือ +7

  // สร้าง UTC date ที่ represents 00:00:00 Asia/Bangkok
  return new Date(utcDate.getTime() - offsetMs);
}

/**
 * คืนค่า start (inclusive) และ end (exclusive) ของเดือนที่กำหนด ในรูป ISO string
 * @param year - ปี (เช่น 2026)
 * @param month - เดือน 1-12
 */
export function getMonthRange(
  year: number,
  month: number
): { start: string; end: string } {
  const startDate = startOfDayInBangkok(year, month, 1);

  // end = วันแรกของเดือนถัดไป
  let endYear = year;
  let endMonth = month + 1;
  if (endMonth > 12) {
    endMonth = 1;
    endYear += 1;
  }
  const endDate = startOfDayInBangkok(endYear, endMonth, 1);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  };
}

/**
 * คืนค่า start/end ของเดือนปัจจุบัน ตาม timezone Asia/Bangkok
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parseInt(parts.find((p) => p.type === "year")!.value);
  const month = parseInt(parts.find((p) => p.type === "month")!.value);

  return getMonthRange(year, month);
}

/**
 * คืนค่าปีและเดือนปัจจุบันใน timezone Asia/Bangkok
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value),
    month: parseInt(parts.find((p) => p.type === "month")!.value),
  };
}

/**
 * สร้าง occurred_at timestamptz จากวันที่/เวลาใน Asia/Bangkok
 * ใช้ตอนสร้าง transaction จาก client ที่ส่ง datetime string มา
 * @param bangkokDateTime - "2026-09-30T23:30:00" (เวลาใน Asia/Bangkok, ไม่รวม offset)
 */
export function toTimestamptz(bangkokDateTime: string): string {
  const date = new Date(`${bangkokDateTime}+07:00`);
  return date.toISOString();
}
