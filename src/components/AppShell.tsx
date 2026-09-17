"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import TabBar from "./TabBar";
import FAB from "./FAB";
import BottomSheet from "./BottomSheet";
import ChatbotModal from "./ChatbotModal";
import DevInspector from "./DevInspector";

// เส้นทางที่ไม่ต้องมี shell (แถบแท็บ + FAB + ปุ่ม AI)
// /line/* เปิดใน LIFF webview — ต้องโล่ง ไม่มี shell ทับ
const EXCLUDED_ROUTES = ["/login", "/offline", "/line"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const showShell = !EXCLUDED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  return (
    <div className="min-h-[100dvh] bg-bg text-text">
      <main
        className={
          showShell ? "pb-[calc(env(safe-area-inset-bottom)+110px)]" : ""
        }
        style={{ minHeight: "100dvh" }}
      >
        {children}
      </main>
      {showShell && (
        <>
          {pathname === "/summary" ? (
            <FAB
              mode="ai"
              visible={!isSheetOpen && !isChatOpen}
              onClick={() => setIsChatOpen(true)}
            />
          ) : pathname === "/" || pathname.startsWith("/transactions") ? (
            <FAB
              mode="add"
              visible={!isSheetOpen && !isChatOpen}
              onClick={() => setIsSheetOpen(true)}
            />
          ) : null}
          <TabBar visible={!isSheetOpen && !isChatOpen} />
          {isChatOpen && (
            <ChatbotModal onClose={() => setIsChatOpen(false)} />
          )}
          {isSheetOpen && (
            <BottomSheet onClose={() => setIsSheetOpen(false)} />
          )}
          {/* ชี้ element เพื่อบอก agent (dev เท่านั้น ไม่ขึ้น production) */}
          {process.env.NODE_ENV === "development" && <DevInspector />}
        </>
      )}
    </div>
  );
}
