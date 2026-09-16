# JodTang

เว็บแอปจดบันทึกรายรับรายจ่าย (mobile-first, PWA) + AI ช่วยวิเคราะห์ว่ารายจ่ายหมดไปกับอะไร
ใช้เองและให้เพื่อนใช้ · ข้อมูลแยกกันต่อบัญชี

สถานะ: **สเปก v1 รออนุมัติ** — ยังไม่เริ่มเขียนโค้ด

- สเปก + ขอบเขต + คำถามที่ค้างอยู่: [`docs/PLAN.md`](docs/PLAN.md)
- กฎโปรเจกต์สำหรับคน/agent ที่เข้ามาแก้โค้ด: [`.hermes.md`](.hermes.md)

## Stack ที่ตกลงแล้ว

Next.js 15 (App Router) + TypeScript · Tailwind CSS v4 · **Supabase** (Postgres + Auth + RLS) · PWA · deploy บน Vercel
ล็อกอิน: Google (built-in) + LINE (custom OIDC provider — LINE เปิด discovery ที่ `https://access.line.me`)
ไม่ใช้ Docker: dev DB = โปรเจกต์ Supabase บนคลาวด์ · เทสต์อัตโนมัติใช้ PGlite (Postgres ใน WASM)

## เริ่มใช้งาน (จะปรับเมื่อ scaffold เสร็จ)

```bash
npm install
cp .env.example .env.local   # ใส่ค่า Supabase ของโปรเจกต์ dev
npm run dev
```
