/**
 * Skeleton สำหรับ transaction list — 8 แถว + แถบสูงเท่าแถวตอนโหลดเพิ่ม (bottom skeleton)
 */
export default function TransactionListSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[56px] items-center gap-3 px-4 py-3"
        >
          {/* icon placeholder */}
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surface-2" />
          {/* text placeholder */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-surface-2" />
            <div className="h-3 w-1/2 rounded bg-surface-2" />
          </div>
          {/* amount placeholder */}
          <div className="h-4 w-16 flex-shrink-0 rounded bg-surface-2" />
        </div>
      ))}
      {/* bottom skeleton — สูงเท่าแถวธุรกรรมจริง แสดงตอนกำลังโหลดเพิ่ม */}
      <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded bg-surface-2" />
          <div className="h-3 w-1/3 rounded bg-surface-2" />
        </div>
        <div className="h-4 w-12 flex-shrink-0 rounded bg-surface-2" />
      </div>
    </div>
  );
}
