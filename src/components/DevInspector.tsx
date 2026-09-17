/**
 * DevInspector — คลิก element แล้วบอกว่าคือตัวไหน (เฉพาะตอน dev เท่านั้น)
 *
 * วิธีใช้: กดปุ่ม ⌖ มุมซ้ายล่าง → คลิก element บนจอ → แผงจะโชว์ selector/คลาส/ข้อความ
 * แล้วกดคัดลอกส่งมาให้ agent พร้อมบอกว่าอยากเปลี่ยนอะไร
 * production ไม่มีปุ่มนี้ (ไม่ถูก bundle หลุดขึ้น server จริง)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PickInfo = {
  selector: string;
  tag: string;
  id: string;
  classes: string;
  text: string;
  href: string;
};

// สร้าง CSS path แบบ tag + nth-of-type (อ่านง่าย ไม่พึ่งคลาส Tailwind ที่ยาว)
function buildSelector(el: HTMLElement): string {
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body && parts.length < 6) {
    const node: HTMLElement = cur;
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    let part = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(
        (c) => c instanceof HTMLElement && c.tagName === node.tagName
      );
      if (same.length > 1) {
        part += `:nth-of-type(${same.indexOf(node) + 1})`;
      }
    }
    parts.unshift(part);
    cur = parent;
  }
  return parts.join(" > ");
}

function pickElement(el: HTMLElement): PickInfo {
  const text = (el.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const anchor = el.closest("a");
  return {
    selector: buildSelector(el),
    tag: el.tagName.toLowerCase(),
    id: el.id || "-",
    classes: Array.from(el.classList).slice(0, 8).join(" ") || "-",
    text: text || "-",
    href: anchor ? anchor.getAttribute("href") ?? "-" : "-",
  };
}

export default function DevInspector() {
  const [armed, setArmed] = useState(false);
  const [pick, setPick] = useState<PickInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const hoverRef = useRef<HTMLElement | null>(null);

  // arme แล้วดัก click ก่อนใคร (capture) — กันลิงก์พาเปลี่ยนหน้า
  useEffect(() => {
    if (!armed) return;
    document.body.style.cursor = "crosshair";

    const clearHover = () => {
      hoverRef.current?.removeAttribute("data-dev-hover");
      hoverRef.current = null;
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-dev-inspector]")) return;
      clearHover();
      t.setAttribute("data-dev-hover", "1");
      hoverRef.current = t;
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-dev-inspector]")) return;
      e.preventDefault();
      e.stopPropagation();
      setPick(pickElement(t));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArmed(false);
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.cursor = "";
      clearHover();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed ]);

  const copyPick = useCallback(async () => {
    if (!pick) return;
    const text = [
      `selector: ${pick.selector}`,
      `tag: ${pick.tag}`,
      `id: ${pick.id}`,
      `classes: ${pick.classes}`,
      `text: ${pick.text}`,
      `href: ${pick.href}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard โดนบล็อก (เช่น http ไม่ใช่ localhost) — ให้ user ลากเลือกในกล่องแทน
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [pick]);

  return (
    <>
      <style>{`[data-dev-hover]{outline:2px dashed #ef4444 !important;outline-offset:2px;}`}</style>

      {/* ปุ่มเปิดโหมด (ซ้ายล่าง เหนือ dock) */}
      <button
        type="button"
        data-dev-inspector
        aria-label="เปิดโหมดชี้ element"
        aria-pressed={armed}
        onClick={() => {
          setPick(null);
          setArmed((v) => !v);
        }}
        className={`fixed left-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-lg transition-colors ${
          armed
            ? "border-expense bg-expense text-white"
            : "border-border bg-surface text-text-muted"
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 104px)" }}
      >
        ⌖
      </button>

      {/* แผงผล */}
      {pick && (
        <div
          data-dev-inspector
          className="fixed left-4 right-4 z-[70] mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-xl"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 152px)" }}
        >
          <p className="mb-2 font-mono text-xs break-all text-text">
            {pick.selector}
          </p>
          <dl className="mb-3 space-y-1 text-xs text-text-muted">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0">tag/id</dt>
              <dd className="break-all">
                {pick.tag} · {pick.id}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0">text</dt>
              <dd className="break-all">{pick.text}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0">href</dt>
              <dd className="break-all">{pick.href}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyPick}
              className="min-h-[44px] flex-1 rounded-btn bg-balance px-4 py-2 text-sm font-medium text-white"
            >
              {copied ? "คัดลอกแล้ว ✓" : "คัดลอก"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPick(null);
                setArmed(false);
              }}
              className="min-h-[44px] rounded-btn border border-border px-4 py-2 text-sm text-text"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </>
  );
}
