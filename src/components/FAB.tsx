"use client";

type Props = {
  mode: "ai" | "add";
  visible?: boolean;
  onClick: () => void;
};

export default function FAB({ mode, visible = true, onClick }: Props) {
  // เมื่อ visible = false ให้หายไปทันที (ไม่เลื่อน slide ลง)
  if (!visible) return null;

  const commonClasses =
    "fixed z-50 flex items-center justify-center rounded-full text-white transition-transform duration-120 hover:scale-105 active:scale-95 animate-in fade-in zoom-in-90 duration-150";

  if (mode === "ai") {
    return (
      <button
        type="button"
        aria-label="ปรึกษา AI Chatbot"
        onClick={onClick}
        className={`${commonClasses} bg-gradient-to-tr from-focus via-blue-500 to-sky-400 shadow-[0_8px_24px_rgba(59,130,246,0.38)] group`}
        style={{
          width: "56px",
          height: "56px",
          right: "16px",
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
        }}
      >
        {/* Bot Icon with Antennas & Sparkles */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:rotate-6"
        >
          <path d="M12 8V4H8" />
          <rect width="16" height="12" x="4" y="8" rx="2" />
          <path d="M2 14h2" />
          <path d="M20 14h2" />
          <path d="M15 13v2" />
          <path d="M9 13v2" />
        </svg>
        {/* Small live indicator dot */}
        <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-surface shadow-xs" />
      </button>
    );
  }

  // mode === "add" (ปุ่มเพิ่มรายรับ-รายจ่าย)
  return (
    <button
      type="button"
      aria-label="เพิ่มรายการใหม่"
      onClick={onClick}
      className={`${commonClasses} bg-focus shadow-[0_8px_24px_rgba(59,130,246,0.4)]`}
      style={{
        width: "56px",
        height: "56px",
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom) + 88px)",
      }}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
