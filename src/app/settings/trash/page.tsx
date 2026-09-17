import { listTrash } from "@/app/actions/trash-list";
import TrashClient from "./trash-client";
import { SmoothLink } from "@/components/SmoothLink";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const result = await listTrash({ limit: 50 });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <SmoothLink
          href="/settings"
          direction="back"
          className="flex size-10 items-center justify-center rounded-full border border-white/20 dark:border-white/10 bg-surface/80 text-text shadow-sm backdrop-blur-xl transition-all active:scale-95 hover:bg-surface-2"
          aria-label="กลับไปหน้าตั้งค่า"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </SmoothLink>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">ถังขยะ</h1>
          <p className="text-xs text-text-muted">กู้คืนรายการหรือลบออกจากระบบถาวร</p>
        </div>
      </header>

      {"error" in result ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center backdrop-blur-xl">
          <p className="font-bold text-rose-500 text-sm">{result.error}</p>
          <a
            href="/settings/trash"
            className="mt-3 inline-block rounded-xl border border-border/60 bg-surface px-5 py-2 text-xs font-bold text-text shadow-sm active:scale-95 transition-all"
          >
            ลองใหม่
          </a>
        </div>
      ) : (
        <TrashClient
          initialItems={result.data.items}
          initialCursor={result.data.next_cursor}
        />
      )}
    </div>
  );
}
