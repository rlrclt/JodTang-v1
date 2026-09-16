import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JodTang",
  description: "จดบันทึกรายรับรายจ่าย + AI วิเคราะห์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
