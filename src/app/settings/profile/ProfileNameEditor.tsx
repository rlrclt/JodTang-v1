"use client";

import { useState, useTransition } from "react";
import { updateProfileName } from "@/app/actions/profile";
import { useRouter } from "next/navigation";

type Props = {
  currentName: string;
};

export default function ProfileNameEditor({ currentName }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("ชื่อต้องไม่ว่างเปล่า");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateProfileName(trimmed);
      if (res.error) {
        setError(res.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSave} className="mt-2 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            className="rounded-xl border border-focus/60 bg-surface-2 px-3 py-1.5 text-base font-bold text-text outline-none ring-2 ring-focus/20 transition-all text-center"
            placeholder="ใส่ชื่อที่ต้องการแสดง"
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex size-8 items-center justify-center rounded-xl bg-focus text-white shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
            title="บันทึก"
          >
            {isPending ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setName(currentName);
              setIsEditing(false);
              setError(null);
            }}
            className="flex size-8 items-center justify-center rounded-xl border border-border/60 bg-surface-2 text-text-muted hover:text-text active:scale-95 transition-all"
            title="ยกเลิก"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {error && (
          <p className="text-[11px] font-bold text-rose-500">{error}</p>
        )}
      </form>
    );
  }

  return (
    <div className="group mt-3 flex items-center justify-center gap-2">
      <h2 className="text-xl font-bold tracking-tight text-text">
        {currentName}
      </h2>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex size-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-focus active:scale-90 transition-all"
        title="แก้ไขชื่อที่แสดง (Display Name)"
        aria-label="แก้ไขชื่อที่แสดง"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}
