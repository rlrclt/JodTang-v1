# JodTang — สเปก v1 (rebuild)

จดบันทึกรายรับรายจ่าย ใช้เองและให้เพื่อนใช้ · จุดต่างจากของเดิม: **AI ช่วยวิเคราะห์ว่ารายจ่ายหมดไปกับอะไร**

สถานะ: **สเปกฉบับร่าง รอคุณอนุมัติ** — ยังไม่เริ่มเขียนโค้ด (การ์ด scaffold รันคู่ขนานได้เพราะไม่พึ่งคำตอบที่ค้าง)
ไฟล์นี้คือแหล่งความจริงของขอบเขตงาน · คำถามที่ยังไม่ตัดสินอยู่ที่ §7

---

## 1. ใครใช้ / สำเร็จคืออะไร

- ผู้ใช้: yoru + เพื่อน (เปิดสมัครเองได้ ใครมีลิงก์ก็เข้าได้ · ข้อมูลแยกกันต่อบัญชี)
- เป้าหมายที่วัดได้: บันทึกรายการได้ใน 2 แตะบนมือถือ · เห็นยอดเดือนนี้ถูกต้องเสมอ · ขอให้ AI สรุปได้ว่าเดือนนี้เงินหมดไปกับอะไร และควรดูอะไรต่อ · เปลี่ยนหน้าแล้วไม่รู้สึกว่าแอป "โหลดใหม่"
- หลักการ: ตัวเลขการเงินต้องถูกและพิสูจน์ได้ (ไม่เชื่อคำบอกเล่า) · ข้อมูลการเงินของแต่ละคนแยกกันที่ชั้น DB ไม่ใช่แค่ชั้นแอป

## 2. ขอบเขต v1

ทำ
- ล็อกอิน Google + LINE (เปิดสมัครเอง)
- บันทึกรายรับ/รายจ่าย 2 แตะ (จำนวน → บันทึก, หมวดเดาจากรายการเดิม), โอนระหว่างกระเป๋า
- หน้าแรก: ยอดเดือนนี้ (รับ/จ่าย/คงเหลือ) + รายการล่าสุด · สลับเดือน
- รายการทั้งหมด: ค้นหา (โน้ต + ชื่อหมวด) · กรอง ประเภท/หมวด/กระเป๋า/เดือน
- สรุป: รายจ่ายตามหมวด + แนวโน้ม 6 เดือน + เทียบงบต่อหมวด
- งบรายเดือนต่อหมวด · จัดการหมวด/กระเป๋าเอง (archive/กู้คืน)
- ถังขยะ (soft delete + กู้คืน) · export CSV + JSON
- PWA ติดตั้งลงหน้าจอมือถือ + **โหมดสว่างก่อน** (มืดทีหลัง — โทเคนต้องตั้งชื่อให้เพิ่ม `.dark` ได้โดยไม่แก้ component)
- motion: เปลี่ยนหน้าแบบนุ่ม + แตะ/กด/เปิด sheet มีจังหวะ (รายละเอียด §5)
- **AI วิเคราะห์รายจ่าย (on-demand)** — โครงเดียวสำหรับอนาคต (รายสัปดาห์/ปิดเดือน เป็นเฟส 2)

ไม่ทำใน v1 (ใส่เมื่อขอ)
- **ข้อมูล realtime ข้ามอุปกรณ์** (ดู §6 — ออกแบบ hook ไว้ให้สลับได้ แต่ยังไม่ต่อ WebSocket)
- push notification · รายการประจำ (recurring) · เชื่อมธนาคาร/OCR สลิป/นำเข้า CSV
- หลายสกุลเงินจริง (เก็บ currency ได้ แต่ล็อก THB)
- ใช้ร่วมกันเป็น household/แชร์กระเป๋าระหว่างบัญชี
- แอป native (store) · export PDF

## 3. Stack — ตัดสินแล้ว

| ชั้น | เลือก | เหตุผล |
|---|---|---|
| แอป | **Next.js 16.3.5** (App Router) + TypeScript | server component = JS ฝั่ง client น้อย, PWA ง่าย, prefetch/client navigation ในตัว |
| สไตล์ | Tailwind CSS v4 (4.3.3) | utility, purge อัตโนมัติ |
| DB + Auth | **Supabase** (Postgres + Auth + RLS) | เลือกโดยคุณ: ได้ auth+DB สำเร็จรูป ลดโค้ดที่ต้องเขียนเอง |
| Query | `supabase-js` 2.116.0 + type ที่ generate จาก schema (`supabase gen types typescript`) + migration เป็น SQL (`supabase/migrations/*.sql`) | ไม่เพิ่ม ORM อีกชั้น · RLS เป็นด่านบังคับใช้จริง |
| Auth flow | Supabase Auth: Google (built-in) + LINE (custom **OIDC** provider) | ยืนยันสด: https://access.line.me/.well-known/openid-configuration → 200 · scopes openid/profile/email · PKCE S256 · free plan ใส่ custom provider ได้ 3 ตัว |
| เทสต์ | `node --test` (Node 26.8.2 strip types ได้) + `@electric-sql/pglite` 0.5.8 | เครื่องนี้ไม่มี Docker → ไม่ใช้ `supabase start` |
| Deploy | Vercel (แอป) + Supabase (DB/Auth) | ฟรีพอสำหรับ v1 |

เวอร์ชันที่ปัก (ตรวจจาก npm registry 2026-09-16): next 16.3.5 · react 19.3.0 · tailwindcss 4.3.3 · @supabase/supabase-js 2.116.0 · @supabase/ssr 0.12.7 · eslint 10.10.0 + eslint-config-next 16.3.5
TypeScript: ล่าสุดบน npm คือ **7.0.2** (คนละสายกับ 5.x) — ใช้ได้ถ้า `npx tsc --noEmit` ผ่านจริง ถ้า toolchain พังให้ปัก TypeScript สาย 5 (ดู `npm view typescript@5 version`) แล้วรายงานเหตุผลในคอมเมนต์ปิดการ์ด

**คีย์ Supabase — สำคัญ**: คีย์แบบ `anon` / `service_role` (JWT) ถูกเลิกใช้ภายในสิ้นปี 2026 และโปรเจกต์ใหม่ไม่มีให้แล้ว → ใช้ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) ฝั่ง client และ `SUPABASE_SECRET_KEY` (`sb_secret_…`) ฝั่ง server เท่านั้น (secret bypass RLS — ห้ามหลุดไป client เด็ดขาด) · ชื่อ env จริงดูที่ `.env.example`

ข้อจำกัดที่ยอมรับ (ตรวจแล้ว ไม่ใช่ทฤษฎี)
- **เครื่อง dev ไม่มี Docker** → `supabase start` ใช้ไม่ได้ · dev DB = โปรเจกต์ Supabase บนคลาวด์ · เทสต์ใช้ PGlite
- **Supabase free: โปรเจกต์หยุดเองหลังไม่มีคนใช้ 1 สัปดาห์** (ต้องกด restore) · 500MB DB · 50,000 MAU · ไม่มี backup อัตโนมัติ → ถ้าเพื่อนใช้จริงจังต้องขึ้น Pro $25/เดือน (§7 ข้อ 3)
- LINE ไม่คืนอีเมลถ้ายังไม่อนุมัติสิทธิ์ → ตั้ง provider เป็น `email_optional` และออกแบบ `email` เป็น nullable
- Supabase CLI รันผ่าน `npx supabase` (2.117.0) — ไม่ติดตั้ง global

## 4. ข้อมูล (กติกาที่ล็อกตาย)

ตาราง: `profiles` · `accounts` (กระเป๋า) · `categories` · `transactions` (kind = income/expense/transfer) · `budgets` · `ai_analyses` · (ของ Supabase Auth: `auth.users`)

- เงินเก็บเป็น **bigint หน่วยสตางค์** เสมอ — ห้าม float/numeric กับเงิน
- `occurred_at timestamptz` = เวลาเกิดรายการ · สรุปเดือนตัดตาม `Asia/Bangkok`
- ลบรายการ = soft delete (`deleted_at`) ทุก query ต้องกรอง · กระเป๋า/หมวดที่เลิกใช้ = `archived_at`
- **RLS เปิดทุกตาราง** ทุก policy อ้าง `auth.uid()` · FK composite `(account_id, user_id)` / `(category_id, user_id)` กันข้อมูลรั่วข้ามบัญชีแม้แอปมีบั๊ก
- เงินเข้า/ออกต้อง balance: โอนต้องมี `to_account_id` และยอดเท่ากัน
- `currency char(3) default 'THB'` (เก็บไว้ ไม่แปลง)

## 5. Motion + การเปลี่ยนหน้า (ตัดสินแล้ว)

**ไม่ทำเป็น SPA** — App Router ทำ client-side navigation อยู่แล้ว (กดลิงก์ไม่ reload หน้า + prefetch ล่วงหน้า) การรื้อไปเป็น SPA จริง (client ทั้งแอป) จะเสียข้อดี server component, JS ในเครื่องบวมขึ้น และทำให้ข้อมูลการเงินต้องโหลดฝั่ง client — ไม่คุ้มกับสิ่งที่ได้มา สิ่งที่ต้องทำเพื่อ "ไม่รู้สึกว่าเปลี่ยนหน้า" มี 3 ชั้น:

1. **View Transitions API** (browser-native, ไม่มี lib ใน bundle)
   - ทางหลัก (เสถียร): hook เดียว `useSmoothNavigate()` ห่อ `document.startViewTransition(() => router.push(href))` — เป็น API ของเบราว์เซอร์ ไม่พึ่ง flag experimental
   - ทางเลือก Next 16: `experimental.viewTransition: true` + `<ViewTransition>` (React 19.2+) ให้ `<Link>` ห่อ transition เอง — ยังเป็น experimental จึงไม่ใช่ทางหลักของ v1
   - รองรับ: same-document = Chrome/Edge 111+, Safari 18+ · **Firefox ยังไม่รองรับ** → ต้องได้การเปลี่ยนหน้าปกติ ไม่ใช่หน้าพัง
2. **Skeleton ที่โครงเหมือนของจริง + `<Suspense>`** — App Router stream ข้อมูล ถ้าหน้าปลายทางช้า ผู้ใช้จะเห็นภาพระหว่างรอ โครงที่ไม่ตรงของจริง = รู้สึกกระโดด
3. **Optimistic UI** ตอนเขียนข้อมูล (บันทึกแล้วยอดขยับทันที) — ให้ความรู้สึกเร็วได้มากกว่าการ animate

กติกา motion (ต่อจาก design token ของโปรเจกต์)
- แตะ/กด 120ms · bottom sheet 200–240ms · เปลี่ยนหน้า 160–240ms · ทั้งหมด compositor-only (`transform`/`opacity`) — ห้าม animate `width`/`height`
- `view-transition-name` ห้ามซ้ำใน snapshot เดียว (ซ้ำ = เบราว์เซอร์ข้าม transition ทั้งหน้า) และตั้งเฉพาะ element ที่ต้องการ morph (เช่นการ์ดยอดเงิน) ไม่ตั้งพร่ำเพรื่อ
- `prefers-reduced-motion: reduce` → 0ms ทุกอย่าง รวม view transition
- **ห้าม motion กลบความจริงของข้อมูล**: ยอดที่ยังไม่ยืนยันต้องแสดงสถานะจาง ไม่ใช่ยอดนิ่งที่ดูเหมือนจริง

## 6. Realtime (ตัดสินแล้ว)

แยก 3 ความต้องการออกจากกัน เพราะใช้คนละเทคนิค

| ความต้องการ | เทคนิค | v1 |
|---|---|---|
| กดบันทึกแล้วยอด/รายการขยับทันที | optimistic UI | **ทำ** |
| เปิดหลายอุปกรณ์/หลายแท็บแล้วตรงกัน | refetch on focus + revalidate หลัง mutation ผ่าน hook เดียว `useTransactionsLive()` | **ทำ** (ยังไม่ใช้ WebSocket) |
| AI ตอบไหลทีละคำ | HTTP streaming (SSE) จาก route handler | **ทำ** |
| sync ข้อมูลสดข้ามอุปกรณ์/ข้ามคน | Supabase Realtime | **ไม่ทำใน v1** — ข้อมูลแยกต่อบัญชี ไม่มีใคร subscribe ของใคร = ยังไม่มีกรณีใช้จริง |

ถ้าทำในอนาคต: ใช้ **Broadcast** (`realtime.broadcast_changes()` + trigger บน private channel + Realtime Authorization RLS) — **ไม่ใช้ Postgres Changes** เพราะเอกสาร Supabase ระบุว่าไม่ scale เท่า และ **RLS ไม่ถูกใช้กับ event DELETE** → เสี่ยงรับ/พลาดข้อมูลการลบของคนอื่น ซึ่งรับไม่ได้กับแอปการเงิน
ลิมิต Free ที่ยืนยันจากเอกสาร: 200 concurrent connections · 100 messages/sec · 100 channel joins/sec · broadcast payload 256KB · postgres changes payload 1024KB — พอกลุ่มเพื่อน แต่มีต้นทุนความซับซ้อน/เทสต์ จึงเลื่อนออกจาก v1

## 7. AI วิเคราะห์ (เฟสนี้ทำ on-demand)

- ผู้ใช้กด "วิเคราะห์" เลือกช่วงเวลา (เดือนนี้ / เดือนที่แล้ว / 6 เดือน / หมวด) → ได้ข้อความสรุป + สิ่งที่ควรดูต่อ · ตอบแบบไหลทีละคำ (streaming)
- โครงสร้าง: `ai_provider` adapter ตัวเดียว (เปลี่ยนเจ้าทีหลังได้โดยไม่แตะ UI) + `buildPayload()` ที่รวมศูนย์ว่า **ส่งอะไรออกไปนอกเครื่อง** (จุดเดียวที่ต้องแก้เมื่อคุณตัดสิน privacy)
- ค่าเริ่มต้นที่ผมตั้งไว้: ส่งเฉพาะยอดที่รวมแล้วตามหมวด/เดือน — ไม่ส่งโน้ตอิสระหรือชื่อกระเป๋า (ยังเปลี่ยนได้ตาม §8 ข้อ 1)
- ไม่ตั้งคีย์ AI = แอปทำงานปกติทุกอย่าง ปุ่มวิเคราะห์บอกว่า "ยังไม่ได้ตั้งค่า" (ห้ามพัง ห้ามเงียบ)
- เก็บผลที่วิเคราะห์แล้วลง `ai_analyses` (เปิดดูย้อนหลังได้ ไม่ต้องจ่ายซ้ำ)

## 8. ทีม + วิธีทำงาน

- คิวงานอยู่บน board `jodtang` (project `jodtang` → repo `/home/yoro/work/JodTang`) · 1 การ์ด = 1 deliverable = 1 worker
- pipeline: dev → **review** (การ์ดลูกของการ์ด dev) → **qa** (การ์ดลูกของการ์ด review) · งานที่แตะเงิน/สิทธิ์ต้องผ่าน review + qa เสมอ
- **ไม่มี push credential บนเครื่องนี้** (ทดสอบแล้ว: `git push` → could not read Username) → ทุกคน commit ใน worktree ของตัวเอง แล้ว **lead เป็นคน merge เข้า main หลัง qa ผ่าน** (หรือคุณเป็นคน merge ถ้าต้องการ) · ถ้าต้องการขึ้น GitHub ต้องมี PAT/token ก่อน
- one writer per file · ห้ามแตะไฟล์นอกงานของการ์ดตัวเอง
- เทสต์/คำสั่งที่ต้องรันจริงก่อนปิดการ์ด: `npm test` (node --test + PGlite) · `npm run build` · `npm run lint`

## 9. รอคุณตัดสิน (ตอบเมื่อพร้อม ผมเดินต่อทันที)

1. **AI**: ผู้ให้บริการ/model ไหน และส่งข้อมูลอะไรออกไป (ค่าเริ่มต้น = ยอดที่รวมแล้วตามหมวด/เดือน)
2. **Supabase**: ให้ผมสร้างโปรเจกต์ Supabase (ภูมิภาค Singapore) ด้วยบัญชีคุณ หรือคุณสร้างเองแล้วส่ง URL + publishable key · Google/LINE client id+secret ต้องมาจากคุณ (อย่าส่งผ่านแชต — ใส่ใน dashboard)
3. **Pro $25/เดือนไหม**: ถ้าไม่จ่าย โปรเจกต์จะหลับเมื่อไม่มีคนใช้ 1 สัปดาห์ และไม่มี backup อัตโนมัติ
4. **โดเมน**: ชื่อแอป = JodTang (ยืนยันแล้ว) · มีโดเมนจริงไหม หรือใช้ `<project>.vercel.app` ไปก่อน
5. **UX/UI**: เลือกแนวจากภาพที่คุณสร้างจาก `docs/design-prompts.md` (โหมดสว่างก่อน) → ผมเขียน `docs/DESIGN.md` ล็อกโทเคน

## 10. ความเสี่ยง

- RLS เขียนผิด = ข้อมูลการเงินคนอื่นรั่ว → ต้องมีเทสต์เชิงลบ (ผู้ใช้ A อ่านข้อมูล B ไม่ได้) ทุกครั้งที่แตะ policy
- free tier pause + ไม่มี backup → ยอมรับความเสี่ยงนี้ไปก่อน หรือขึ้น Pro
- LINE email ต้องยื่นขออนุมัติแยก · ถ้าไม่อนุมัติ ผู้ใช้ LINE จะไม่มีอีเมล (แอปต้องรับได้)
- dev DB พึ่งคลาวด์ (ไม่มี Docker) → เน็ตล่ม/โปรเจกต์หยุด = dev หยุด · PGlite ช่วยได้เฉพาะเทสต์
- AI ต้องส่งข้อมูลออกนอกเครื่อง — ต้องมีข้อความบอกผู้ใช้ตรงจุดที่กด และไม่ส่งเกินที่ตกลง
- motion: ถ้าออกแบบ transition ยาว/เยอะ จะรู้สึกหน่วงกว่าไม่มี — ต้องวัดบนมือถือจริง (390×844) ไม่ใช่บนเดสก์ท็อป
