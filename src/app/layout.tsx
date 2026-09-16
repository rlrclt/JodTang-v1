import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import AppShell from "@/components/AppShell";
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
    <html lang="th">
      <body className={`${ibmPlexSansThai.className} tabular-nums`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
