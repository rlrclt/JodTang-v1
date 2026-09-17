"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import TabBar from "./TabBar";
import FAB from "./FAB";
import BottomSheet from "./BottomSheet";

// เส้นทางที่ไม่ต้องมี shell (แถบแท็บ + FAB)
const EXCLUDED_ROUTES = ["/login", "/offline"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
          <FAB onClick={() => setIsSheetOpen(true)} />
          <TabBar />
          {isSheetOpen && (
            <BottomSheet onClose={() => setIsSheetOpen(false)} />
          )}
        </>
      )}
    </div>
  );
}
