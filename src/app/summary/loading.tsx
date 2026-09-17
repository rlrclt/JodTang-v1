// skeleton ระหว่างเปลี่ยนมาหน้า /summary
// โครงตรงของจริง (เดือน + ยอด 3 ช่อง + การ์ด AI + กราฟ + เทรนด์ + งบ) เพื่อไม่ให้จอกระโดด
export default function SummaryLoading() {
  return (
    <div className="animate-pulse p-4" aria-hidden="true">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-11 w-11 rounded-full bg-surface-2" />
        <div className="h-7 w-40 rounded bg-surface-2" />
        <div className="h-11 w-11 rounded-full bg-surface-2" />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl bg-surface p-3 text-center"
          >
            <div className="mx-auto mb-2 h-3 w-12 rounded bg-surface-2" />
            <div className="mx-auto h-5 w-16 rounded bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="mb-4 h-32 rounded-2xl bg-surface" />
      <div className="mb-4 h-56 rounded-2xl bg-surface" />
      <div className="mb-4 h-32 rounded-2xl bg-surface" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
