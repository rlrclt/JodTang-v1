/**
 * formatSatang — แสดงยอดเงินสตางค์เป็นรูปแบบบาشتไทย
 *
 * - รับค่าเป็น bigint (หน่วยสตางค์) หรือ number
 * - ใช้ Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
 * - ตัดทศนิยมทิ้ง (ไม่แสดงสตางค์ เพราะ input คือสตางค์อยู่แล้ว)
 * - ใช้ tabular-nums สำหรับ monospace number display
 */

const thbFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const thbDecimalFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatSatang(
  satang: bigint | number,
  showDecimals = false
): string {
  const baht = typeof satang === "bigint" ? Number(satang) / 100 : satang / 100;
  // ถ้าระบุ showDecimals = true หรือยอดมีเศษสตางค์ ให้แสดงทศนิยม 2 ตำแหน่งเต็มเสมอ
  if (showDecimals || baht % 1 !== 0) {
    return thbDecimalFormatter.format(baht);
  }
  return thbFormatter.format(baht);
}
