import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // จำหน้าที่ย้อนกลับไปดูภายใน 60 วิ ไม่ต้องโหลดใหม่ (แท็บสลับไปมา = เห็นของเดิมทันที)
    // ความถูกต้องของยอดคุมด้วย router.refresh() หลังทุก mutation แทน
    staleTimes: {
      dynamic: 60,
      static: 180,
    },
  },
};

export default nextConfig;
