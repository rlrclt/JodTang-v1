import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Script from "next/script";
import AppShell from "@/components/AppShell";
import { TransactionsProvider } from "@/components/TransactionsProvider";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  style: ["normal"],
});

export const metadata: Metadata = {
  title: "JodTang",
  description: "จดบันทึกรายรับรายจ่าย + AI วิเคราะห์",
  // บอกเบราว์เซอร์ว่ามีไอคอนแล้ว — กันมันวิ่งไปขอ /favicon.ico ที่ไม่มี (404 ใน console)
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${ibmPlexSansThai.className} tabular-nums`}>
        {/* ตั้งธีมก่อน hydrate — กันจอกระพริบขาวตอนเปิดด้วยโหมดมืด
            โค้ดซ้ำกับ src/lib/theme.ts เพราะสคริปต์นี้รันก่อน JS แอปโหลด */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var m=localStorage.getItem("jodtang-theme")||"light";var d=m==="dark"||(m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})();`}</Script>
        <TransactionsProvider>
          <AppShell>{children}</AppShell>
        </TransactionsProvider>
      </body>
    </html>
  );
}
