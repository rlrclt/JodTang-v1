"use client";

type Props = {
  message: string;
  on_retry?: () => void;
};

/**
 * Error state — แสดงข้อความ + ปุ่มลองใหม่ (ถ้า load ไม่สำเร็จจะไม่ retry อัตโนมัติ)
 */
export default function ErrorState({ message, on_retry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h3 className="mb-2 text-lg font-semibold text-text">
        เกิดข้อผิดพลาด
      </h3>
      <p className="mb-4 text-sm text-text-muted">{message}</p>
      {on_retry && (
        <button
          type="button"
          onClick={on_retry}
          className="rounded-[var(--radius-btn)] bg-balance px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 active:opacity-80"
        >
          ลองใหม่
        </button>
      )}
    </div>
  );
}
