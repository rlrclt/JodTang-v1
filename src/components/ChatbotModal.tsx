"use client";

import { useState, useRef, useEffect } from "react";
import { askAiAdvisor, type ChatMessage } from "@/app/actions/chat";

type Props = {
  onClose: () => void;
};

const SUGGESTIONS = [
  "ตอนนี้เงินฉันเหลือเท่าไหร่?",
  "เดือนนี้มีรายจ่ายอะไรเด่นๆ บ้าง?",
  "แนะนำวิธีประหยัดเงินหน่อย",
  "ช่วยวางแผนงบประมาณเดือนนี้ที",
];

export default function ChatbotModal({ onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "สวัสดีครับ! ผมคือ JodTang AI Advisor 🤖 ผู้ช่วยวางแผนการเงินของคุณ สามารถถามเรื่องรายรับ-รายจ่าย ยอดเงินคงเหลือ หรือขอคำแนะนำเรื่องการเงินได้เลยครับ!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Lock background scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMsgs: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await askAiAdvisor(newMsgs);
      if (res.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${res.error}` },
        ]);
      } else if (res.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply! },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Container */}
      <div
        className="relative z-10 flex h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-white/20 bg-surface/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-250"
      >
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-focus to-sky-400 text-white shadow-md shadow-focus/25">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-text">JodTang AI Advisor</h3>
                <span className="h-1.5 w-1.5 rounded-full bg-income animate-pulse" />
              </div>
              <p className="text-[10px] text-text-muted">ที่ปรึกษาการเงินส่วนบุคคลอัจฉริยะ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text active:scale-95 transition-all"
          >
            ✕
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-focus text-white rounded-br-xs"
                    : "bg-surface-2/90 text-text border border-border/40 rounded-bl-xs whitespace-pre-wrap"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-xs bg-surface-2/90 px-4 py-3 text-xs text-text-muted border border-border/40 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-focus animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-focus animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-focus animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-1 font-medium">กำลังคิดคำตอบ...</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length <= 3 && (
          <div className="px-3 py-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s)}
                className="shrink-0 rounded-full border border-focus/30 bg-focus/5 px-3 py-1 text-xs font-medium text-focus hover:bg-focus/15 active:scale-95 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 border-t border-border/50 p-3 bg-surface"
        >
          <input
            type="text"
            placeholder="ถามคำถามหรือขอคำแนะนำ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/20 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-focus text-white shadow-md shadow-focus/25 disabled:opacity-40 disabled:shadow-none active:scale-90 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
