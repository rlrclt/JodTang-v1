"use client";

import { useState, useRef, useEffect } from "react";
import {
  askAiAdvisor,
  listChatSessions,
  saveChatSession,
  deleteChatSession,
  type ChatMessage,
  type ChatSessionRow,
} from "@/app/actions/chat";
import { renderMarkdown } from "./MarkdownChat";

type Props = {
  onClose: () => void;
};

const INITIAL_GREETING: ChatMessage = {
  role: "assistant",
  content:
    "สวัสดีครับ! ผมคือ JodTang AI Advisor 🤖 ผู้ช่วยวางแผนการเงินของคุณ สามารถถามเรื่องรายรับ-รายจ่าย ยอดเงินคงเหลือ หรือขอคำแนะนำเรื่องการเงินได้เลยครับ!",
};

const SUGGESTIONS = [
  "ตอนนี้เงินฉันเหลือเท่าไหร่?",
  "เดือนนี้มีรายจ่ายอะไรเด่นๆ บ้าง?",
  "แนะนำวิธีประหยัดเงินหน่อย",
  "ช่วยวางแผนงบประมาณเดือนนี้ที",
];

export default function ChatbotModal({ onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionList, setSessionList] = useState<ChatSessionRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // โหลดประวัติ Sessions ทั้งหมด
  const loadSessions = async () => {
    const res = await listChatSessions();
    if (res.sessions) {
      setSessionList(res.sessions);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showHistory]);

  // Lock background scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // เริ่มบทสนทนาใหม่ (New Chat)
  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([INITIAL_GREETING]);
    setShowHistory(false);
  };

  // เลือก Session เก่ามาคุยต่อ
  const handleSelectSession = (session: ChatSessionRow) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setShowHistory(false);
  };

  // ลบ Session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteChatSession(id);
    if (currentSessionId === id) {
      handleNewChat();
    }
    loadSessions();
  };

  // ส่งข้อความ
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMsgs: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await askAiAdvisor(newMsgs);
      let updatedMsgs = newMsgs;

      if (res.error) {
        updatedMsgs = [
          ...newMsgs,
          { role: "assistant", content: `⚠️ ${res.error}` },
        ];
      } else if (res.reply) {
        updatedMsgs = [
          ...newMsgs,
          { role: "assistant", content: res.reply! },
        ];
      }

      setMessages(updatedMsgs);

      // บันทึกลง Session ใน Supabase อัตโนมัติ เพื่อให้ผู้ใช้กลับมาคุยต่อได้
      const saveRes = await saveChatSession(currentSessionId, updatedMsgs);
      if (saveRes.session) {
        setCurrentSessionId(saveRes.session.id);
        loadSessions();
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
      <div className="relative z-10 flex h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-white/20 bg-surface/95 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-250 overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-surface">
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

          <div className="flex items-center gap-1.5">
            {/* ปุ่มเปิดประวัติ Session */}
            <button
              type="button"
              onClick={() => setShowHistory((h) => !h)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-all active:scale-95 ${
                showHistory
                  ? "bg-focus text-white"
                  : "bg-surface-2 text-text hover:bg-surface-2/80"
              }`}
              title="ดูประวัติการสนทนา"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l4 2" />
              </svg>
              <span>ประวัติ</span>
            </button>

            {/* ปุ่มสร้างบทสนทนาใหม่ */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text hover:bg-surface-2/80 active:scale-95 transition-all"
              title="เริ่มแชทใหม่"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* ปุ่มปิด */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text active:scale-95 transition-all ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* View 1: History Session Drawer / Panel */}
        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
              <span className="text-xs font-bold text-text">ประวัติการสนทนาทั้งหมด ({sessionList.length})</span>
              <button
                type="button"
                onClick={handleNewChat}
                className="text-xs font-semibold text-focus hover:underline"
              >
                + เริ่มแชทใหม่
              </button>
            </div>

            {sessionList.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                ยังไม่มีประวัติการสนทนา บันทึกแชทแรกของคุณได้เลย!
              </div>
            ) : (
              sessionList.map((s) => {
                const isActive = s.id === currentSessionId;
                const dateStr = new Date(s.updated_at).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`flex items-center justify-between rounded-2xl p-3 cursor-pointer transition-all border ${
                      isActive
                        ? "border-focus bg-focus/10 shadow-xs"
                        : "border-border/40 bg-surface-2/60 hover:bg-surface-2"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-text truncate">{s.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {s.messages.length} ข้อความ · {dateStr}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:text-expense hover:bg-expense/10 active:scale-90 transition-all"
                      title="ลบแชทนี้"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* View 2: Active Messages List */
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
                  {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
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
        )}

        {/* Suggestion Chips */}
        {!showHistory && messages.length <= 3 && (
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
        {!showHistory && (
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
        )}
      </div>
    </div>
  );
}
