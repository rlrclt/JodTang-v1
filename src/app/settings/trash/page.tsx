/**
 * หน้าถังขยะ (/settings/trash) — server component
 *
 * โหลดหน้าแรก of ถังขยะฝั่ง server ให้ UI มีข้อมูลทันที โต้ตอบต่อใน TrashClient
 * สถานะ: ว่าง / error + ปุ่มลองใหม่ — ครบตาม SCREENS.md หลักการข้อ 3
 */
import { listTrash } from "@/app/actions/trash-list";
import TrashClient from "./trash-client";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const result = await listTrash({ limit: 50 });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">ถังขยะ</h1>
      <p className="mb-6 text-sm text-text-muted">
        รายการที่ลบแล้วจะอยู่ที่นี่ กู้คืนได้จนกว่าจะลบถาวร (ลบถาวรแล้วกลับไม่ได้)
      </p>

      {"error" in result ? (
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="mb-4 text-expense">{result.error}</p>
          <a
            href="/settings/trash"
            className="inline-block rounded-btn border border-border bg-surface px-4 py-2 text-sm hover:bg-surface-2"
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
