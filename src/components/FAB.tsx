"use client";

type Props = {
  onClick: () => void;
};

export default function FAB({ onClick }: Props) {
  return (
    <button
      type="button"
      aria-label="เพิ่มรายการใหม่"
      onClick={onClick}
      className="fixed z-50 flex items-center justify-center rounded-full bg-balance text-white shadow-lg transition-transform duration-120 active:scale-95"
      style={{
        width: "56px",
        height: "56px",
        right: "16px",
        bottom: "calc(env(safe-area-inset-bottom) + 16px + 56px)",
      }}
    >
      <svg
        width="24"
        height="24"
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
