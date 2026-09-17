// skeleton ระหว่างเปลี่ยนมาหน้า /transactions
// โครงตรงของจริง (หัว + ตัวกรอง + รายการ) เพื่อไม่ให้จอกระโดดตอนข้อมูลมาถึง
import TransactionListSkeleton from "@/components/TransactionListSkeleton";

export default function TransactionsLoading() {
  return (
    <div className="min-h-[100dvh] animate-pulse" aria-hidden="true">
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm">
        <div className="px-4 pt-4 pb-2">
          <div className="mb-3 h-7 w-36 rounded bg-surface-2" />
          <div className="h-10 rounded-xl bg-surface-2" />
        </div>
        <div className="px-4 py-2">
          <div className="h-24 rounded-2xl bg-surface" />
        </div>
        <div className="px-4 py-2">
          <div className="h-10 rounded-xl bg-surface-2" />
        </div>
      </div>
      <div className="mt-2">
        <TransactionListSkeleton />
      </div>
    </div>
  );
}
