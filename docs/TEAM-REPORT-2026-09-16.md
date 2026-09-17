# รายงานความคืบหน้า — โปรเจกต์ JodTang (ทีม AI บน kanban)

- สร้างเมื่อ: 16/09/2026 18:18 (เวลาไทย) โดย lead
- สถานะระบบ: **หยุดงานของ worker ทุกตัวชั่วคราวตามคำสั่งเจ้าของโปรเจกต์** (dispatcher ปิดอยู่ จึงไม่มีงานใหม่เริ่ม)
- บอร์ด: `jodtang` · repo: `/home/yoro/work/JodTang` · main HEAD: `0d8dfb9 merge: summary (t_e381f5f2)` · commits ทั้งหมด 48

## 1. สรุปผู้บริหาร (ตัวเลขจริงจากบอร์ด/repo)

- **ปิดงานแล้ว 23 การ์ด** · พักไว้ 4 · รอคิว 5 · เก็บถาวร(ซ้ำ) 1
- **แอปใช้งานได้จริง**: ล็อกอิน Google ผ่านแล้วบน Supabase จริง (มี session จริง, ดึงข้อมูลรายเดือนได้)
- **ฐานข้อมูลจริง**: 6 ตาราง (`profiles, accounts, categories, transactions, budgets, ai_analyses`) + **RLS 21 policy** · พิสูจน์บน Postgres จริงแล้วว่า user A อ่านของ user B ไม่ได้
- **โค้ด main**: 11 เส้นทาง · `240 เทสต์ผ่าน / 0 ล้มเหลว` · build ผ่าน · lint 0 error
- **งานที่ยังไม่รวมเข้า main แต่เขียนเสร็จใน branch แล้ว 2 งาน** (รายละเอียดข้อ 4)
- **บั๊กที่พบจากการใช้งานจริงของคุณ 1 ตัว** (บันทึกรายการไม่ได้) — ซ่อมเสร็จใน branch แล้ว, ยังไม่ merge

## 2. สิ่งที่สร้างเสร็จและอยู่ใน main แล้ว

**สแต็ก**: Next.js 16.3.5 · React 19.3 · Tailwind 4.3 · Supabase (Auth + Postgres + RLS) · เทสต์ด้วย `node --test` + PGlite (ไม่มี Docker บนเครื่อง)

**หน้าเว็บ (11 เส้นทาง)**:
```
  /                        หน้าแรก (ยอดเดือนนี้ + รายการล่าสุด + สลับเดือน + bottom sheet กรอกเร็ว)
  /login                   ล็อกอิน (Google ใช้งานได้, LINE ปุ่ม disabled = เฟส 2)
  /auth/callback, /auth/signin   ท่อ OAuth ผ่าน Supabase (PKCE)
  /transactions            ค้นหา + ตัวกรอง (เดือน/ประเภท/หมวด/กระเป๋า) + keyset paging
  /summary                 กราฟรายจ่ายตามหมวด + แนวโน้ม 6 เดือน + เทียบงบ
  /settings                hub ตั้งค่า
  /settings/accounts       กระเป๋าเงิน + ยอดคงเหลือ
  /settings/categories     หมวดหมู่ (ชื่อ/ไอคอน/สี + archive/กู้คืน)
  /settings/budgets        งบต่อเดือนต่อหมวด + % ที่ใช้ (เตือนที่ 80%)
  /settings/trash          ถังขยะ (กู้คืน/ลบถาวร)
  /settings/export         ส่งออก CSV/JSON
  /offline                 หน้าออฟไลน์
  /api/*, /export/*        API/ดาวน์โหลด (keyset next page, backup, transactions)
```

**ฐานข้อมูล** (`supabase/migrations/`):
- `00001_create_tables.sql` — 6 ตาราง, เงินเป็น `bigint` หน่วยสตางค์ทุกที่, ลบ = soft delete (`deleted_at`)
- `00002_rls.sql` — เปิด RLS ทุกตาราง + 21 policy ที่อ้าง `auth.uid()` + trigger `handle_new_user`
- apply ขึ้นโปรเจกต์จริง `rivufpvxrfjfhsyamiet` แล้วผ่าน Supabase MCP และพิสูจน์ RLS เชิงลบด้วยผู้ใช้ทดสอบ 2 คน

**โครงสร้างโค้ดหลัก**: `src/app/` (หน้า + server actions) · `src/components/` (BalanceCard, BottomSheet, TransactionItem, CategoryIcon, AppShell, TabBar, FAB…) · `src/lib/` (format-satang, date, account-balance, export, motion, supabase client/server/middleware) · `src/hooks/` · `supabase/migrations/`

## 3. งานทุกการ์ด (จากบอร์ดจริง)

_ชื่อการ์ดในตารางคัดมาตรง ๆ ตามที่สร้างไว้ (แก้ทีหลังไม่ได้) — บางชื่อเก่ากว่าความจริง เช่นการ์ด scaffold เขียนว่า "Next.js 15" แต่สแต็กจริงที่ใช้คือ Next.js 16.3.5 (ตรวจจาก `package.json` และ registry ตอนเริ่มงาน)_

| การ์ด | ผู้ทำ | สถานะ | งาน | หลักฐาน/ผลลัพธ์ |
|---|---|---|---|---|
| `t_cda78134` | dev | ปิดแล้ว | dev: scaffold Next.js 15 + TS + Tailwind v4 + Supabase client + ชุดเทสต์ (PGli… | Scaffold Next.js 16.3.5 + TS strict + Tailwind v4 + Supabase client (@supabase/ssr + supabase-js) + … |
| `t_7aed69c2` | review | ปิดแล้ว | review: scaffold JodTang v1 — Next.js+Supabase client+PGlite harness+commit (p… | Review scaffold JodTang v1 ผ่านทั้งหมด: รัน npm ci / build / lint / test เองทั้ง 4 อย่างล้วนผ่าน (3/… |
| `t_ef8f2a16` | dev | ปิดแล้ว | dev: motion layer — cross-fade เปลี่ยนหน้า + morph การ์ดยอดเงิน (view transiti… | Motion layer สำเร็จ: cross-fade page transitions + morph balance card ด้วย View Transitions API (ไม่… |
| `t_e2afeef1` | dev | ปิดแล้ว | dev: schema v1 + RLS ทุกตาราง + migration SQL + เทสต์ PGlite (รวม RLS เชิงลบ) | Schema v1: 2 SQL migrations (tables + RLS) + PGlite auth shim + 14 tests all pass. 6 tables (profile… |
| `t_2177c022` | review | ปิดแล้ว | review: schema v1 + RLS (พยายามทำข้อมูลรั่วเอง + mutation test ของเทสต์) — par… | ผลตรวจ schema v1 + RLS ของการ์ด dev t_e2afeef1 (SHA 3571234) = ผ่านทุกข้ออิสระ: bigint money (ไม่มี … |
| `t_6f0e3379` | dev | ปิดแล้ว | fix(lint): eslint ต้อง ignore .next/.worktrees — ตอนนี้ lint ล้ม 550 errors หล… | แก้ defect: eslint flat config ไม่มี global ignores → `npm run lint` fail 550 errors จาก bundled out… |
| `t_33833c8e` | dev | ปิดแล้ว | dev: auth — Supabase Auth (Google + LINE custom OIDC) + session/guard + /login | ทำ auth layer เสร็จ: middleware guard (redirect → /login เมื่อไม่มี session), /login page (Google ac… |
| `t_017f06f2` | dev | ปิดแล้ว | dev: app shell — แถบแท็บ 4 แท็บ + FAB + safe-area + โทเคนธีม (สว่างก่อน) | สร้าง app shell เสร็จสมบูรณ์: แถบแท็บล่าง 4 แท็บ (หน้าแรก/รายการ/สรุป/ตั้งค่า) + FAB 56x56 + safe-ar… |
| `t_5ab714de` | dev | ปิดแล้ว | dev: ชั้นข้อมูล + helper เงิน (formatSatang/สตางค์/Asia-Bangkok/keyset/server … | สร้าง helper layer ครบ: formatSatang() (แสดงยอดสตางค์เป็นบาشتไทย), date helpers (ตัดเดือน Asia/Bangk… |
| `t_110b9fc9` | qa | ปิดแล้ว | qa: ยืนยันล็อกอินจริง Google + LINE บนโปรเจกต์จริง (หลังเปิด provider ใน dashb… | QA เสร็จ: ข้อที่ worker พิสูจน์เองได้ผ่านทั้งหมด (GET /login 200 + LINE disabled, หน้าที่ต้องมีผู้ใช… |
| `t_08df3de3` | dev | ปิดแล้ว | fix(middleware): /offline ต้องเข้าได้โดยไม่ต้องล็อกอิน (ตอนนี้ 307 ไป /login) | แก้ defect `/offline` redirect 307 → `/login`: เพิ่ม `/offline` + `/manifest.webmanifest` ใน PUBLIC_… |
| `t_c96fc5dc` | dev | ปิดแล้ว | dev: ยิง migration ขึ้นโปรเจกต์จริงผ่าน Supabase MCP + พิสูจน์ RLS บน Postgres… | Applied both SQL migrations to Supabase dev project (rivufpvxrfjfhsyamiet) via MCP apply_migration, … |
| `t_2ddef92f` | review | ปิดแล้ว | review: ชั้นข้อมูล + helper เงิน (หาที่ตัวเลขเพี้ยน + mutation test) — parent … | ตรวจชั้นข้อมูล + helper เงิน commit 233cd3a ใน worktree ผ่านทุกเกณฑ์: รัน npm ci/test/build/lint เอง… |
| `t_b84293dc` | dev | ปิดแล้ว | dev: หน้าแรก (ยอดเดือนนี้ + รายการล่าสุด + สลับเดือน) + bottom sheet กรอกเร็ว | หน้าแรก (balance card + month navigator + recent transactions) + bottom sheet กรอกเร็ว — สร้างครบตาม… |
| `t_725ac167` | dev | ปิดแล้ว | dev: หน้า /transactions — ค้นหา + ตัวกรอง (เดือน/ประเภท/หมวด/กระเป๋า) + keyset… | สร้างหน้า /transactions สำเร็จ — 14 ไฟล์ใหม่, 132 เทสต์ผ่าน, TypeScript compile clean, committed ใน … |
| `t_e381f5f2` | dev | ปิดแล้ว | dev: หน้า /summary — กราฟรายจ่ายตามหมวด + แนวโน้ม 6 เดือน + เทียบงบ (CSS ล้วน) | สร้างหน้า /summary สำหรับ JodTang — กราฟแท่งรายจ่ายตามหมวด (CSS/div เท่านั้น), แนวโน้ม 6 เดือน, เทีย… |
| `t_67be5cfe` | dev2 | ปิดแล้ว | dev2: หน้าตั้งค่า (hub) + /settings/accounts (กระเป๋าเงิน + ยอดคงเหลือ) | ทำหน้าตั้งค่า (hub) + /settings/accounts เสร็จ: hub มีลิงก์ 6 หน้า + ปุ่มออกจากระบบ (signOut เดิม) ·… |
| `t_e59eee4d` | dev2 | ปิดแล้ว | dev2: /settings/categories — หมวดหมู่ (ชื่อ/ไอคอน/สี + archive/กู้คืน) | หน้า /settings/categories ครบ: แยกกลุ่มรายรับ/รายจ่าย, เพิ่ม/แก้ชื่อ-ไอคอน-สี (bottom sheet, ไม่มี m… |
| `t_24dc3b7a` | dev2 | ปิดแล้ว | dev2: /settings/budgets — งบต่อเดือนต่อหมวด + % ที่ใช้ไป (เตือนที่ 80%) | Reviewed and approved (round 2, execution lens): ทั้ง 2 จุดจาก review round 1 แก้ถูกต้อง (ลบ prop fo… |
| `t_18dfbf73` | dev2 | ปิดแล้ว | dev2: /settings/trash (กู้คืน/ลบถาวร) + /settings/export (CSV/JSON) | Reviewed and approved. ตรวจ diff 12 ไฟล์เย็น ๆ + รัน verification จริงทั้งหมด: npm test 81/81 pass (… |
| `t_ec323846` | ops | ปิดแล้ว | ops: dashboard plugin "team-status" — หน้า /team โชว์ว่าใครกำลังทำอะไร + สถานะ… | สร้าง dashboard plugin "team-status" สำเร็จ — หน้า /team โชว์สถานะ agent แบบ real-time พร้อม heartbe… |
| `t_959396ab` | dev2 | ปิดแล้ว | dev2: rebase motion layer บน main ปัจจุบัน (cross-fade + morph balance-card) +… | Rebase motion layer บน main ปัจจุบันสำเร็จ — cherry-pick ff775c9 แก้ conflict 4 ไฟล์ (ทุกหน้าคงเป็น … |
| `t_fb5da66b` | review | ปิดแล้ว | review: ตรวจ integration บน main หลัง merge 6 branch (การ์ดรวมงาน) | Integration review ของ merge 6 branch เสร็จ: verification ผ่าน (test/build/lint/tsc จาก run 39) และไ… |
| `t_1dc6db05` | qa | พักไว้(triage) | qa: ตรวจ motion layer บนเบราว์เซอร์จริง (transition จริง/reduced-motion/fallba… | พักงานชั่วคราวตามคำสั่งเจ้าของโปรเจกต์ (yoru) — lead จะปลดให้ทำงานต่อเมื่อสั่ง |
| `t_c2ff7b65` | dev | พักไว้ | dev: auth hardening — guard ต้องตรวจ session ให้จริง (getSession → getUser/get… | พักงานชั่วคราวตามคำสั่งเจ้าของโปรเจกต์ (yoru) — lead จะปลดให้ทำงานต่อเมื่อสั่ง |
| `t_95f69bab` | dev | พักไว้ | dev: profiles.email (nullable) หายไป — PLAN/SCREENS ออกแบบให้มี แต่ DB จริงไม่… | พักงานชั่วคราวตามคำสั่งเจ้าของโปรเจกต์ (yoru) — lead จะปลดให้ทำงานต่อเมื่อสั่ง |
| `t_35bda8fa` | dev | เก็บถาวร | fix: BottomSheet ส่ง account_id "default" ที่ไม่มีอยู่จริง — บันทึกรายการ fail… | task archived with run still active |
| `t_2ad939ee` | dev | รอคิว | fix: ลิงก์ /settings/profile ใน settings hub ชี้ไป route ที่ไม่มีอยู่ (404) | - |
| `t_713efe5e` | dev | รอคิว | fix: category icon แตก 2 ชุด — settings เก็บ "utensils#tomato" แต่ /summary แม… | - |
| `t_aa742ca9` | dev2 | พักไว้ | dev: บันทึกรายการจาก quick-entry ล้มเหลว — BottomSheet ส่ง account_id "default… | พักงานชั่วคราวตามคำสั่งเจ้าของโปรเจกต์ (yoru) — lead จะปลดให้ทำงานต่อเมื่อสั่ง |
| `t_9f7adcc8` | dev2 | รอคิว | dev2: ต่อ motion layer ที่ค้างอยู่เข้ากับการนำทางจริง (ตอนนี้ SmoothLink ไม่มี… | - |
| `t_cc15c5c6` | dev2 | รอคิว | (ทดสอบ workspace) ตรวจว่า project slug ผูก worktree ถูกต้องหรือไม่ | - |
| `t_8be3d055` | dev2 | รอคิว | dev2: ต่อ motion layer ที่ค้างอยู่เข้ากับการนำทางจริง (ตอนนี้ SmoothLink ไม่มี… | - |

## 4. งานที่พักไว้ — ทำถึงไหนแล้ว (สำคัญ: บางใบเขียนเสร็จแล้ว รอ merge)

**1) `t_aa742ca9` (dev2) — บั๊กที่คุณเจอ: บันทึกรายการไม่ผ่าน**
- อาการจริง: กดบันทึกจาก bottom sheet → `invalid input syntax for type uuid: "default"`
- ต้นเหตุ: `src/components/BottomSheet.tsx` บรรทัด 120/140 hardcode `account_id: "default"` แทน UUID จริง
- **สถานะ: แก้เสร็จใน branch แล้ว** — commit `42eeae8` *"แก้ quick-entry ส่ง account_id จริง — เลิก hardcode 'default' ที่ Postgres ปฏิเสธ (invalid uuid)"* (`BottomSheet.tsx` +50/-5)
- ยังไม่ได้ทำ: รัน build/test/lint + ทดสอบกดบันทึกจริงแล้วแนบหลักฐาน → ยังไม่ merge

**2) `t_c2ff7b65` (dev) — auth hardening (จากที่ qa ตรวจพบ)**
- **แก้เสร็จใน branch แล้ว** — commit `aec285d` *"auth hardening: D1 getUser, D3 signOut try/catch, D4 provider allow-list"*: 6 ไฟล์ +195 บรรทัด รวมเทสต์ใหม่ `src/lib/auth-hardening.test.ts` (148 บรรทัด)
- ประเด็นที่แก้: (D1) guard เชื่อคุกกี้ session ที่ไม่ตรวจลายเซ็น → เปลี่ยนเป็นตรวจฝั่ง server จริง; (D3) `signOut` ด้วย session เสีย → 500 ต้อง redirect `/login`; (D4) `/auth/signin` ไม่ตรวจชื่อ provider → ใส่ allow-list
- ยังไม่ได้ทำ: รันเทสต์/build/lint ยืนยัน + merge

**3) `t_95f69bab` (dev) — เพิ่มคอลัมน์ `profiles.email`**
- ปัญหา: `docs/PLAN.md` ออกแบบให้มีอีเมล (nullable) แต่ DB จริงไม่มีคอลัมน์ → อีเมลจาก Google ไม่ถูกเก็บ (`GET /rest/v1/profiles?select=email` = 400 code 42703)
- lead ตัดสินใจแล้ว: **เพิ่มคอลัมน์ nullable ตาม PLAN** ไม่แก้เอกสาร
- สถานะ: ยังไม่ได้เริ่มเขียน migration (worker เพิ่งเริ่มก็ถูกพัก)

**4) `t_1dc6db05` (qa) — ตรวจ motion layer ด้วยเบราว์เซอร์จริง**
- ถูกพักกลางการตรวจ (และระบบย้ายไป triage เพราะ block ซ้ำ) — งานตรวจ motion บน main ยังไม่จบ
- หมายเหตุ: qa ค้นพบว่าเดิมทีตรวจไม่ได้เพราะเปิดผ่าน `127.0.0.1` (Next บล็อก dev resource ข้าม origin) ต้องใช้ `localhost` — องค์ความรู้นี้บันทึกไว้แล้ว

## 5. งานรอคิว (ยังไม่เริ่ม) + ความซ้ำซ้อนที่ควรเก็บ

- `t_2ad939ee` (dev) — fix: ลิงก์ /settings/profile ใน settings hub ชี้ไป route ที่ไม่มีอยู่ (404)
- `t_713efe5e` (dev) — fix: category icon แตก 2 ชุด — settings เก็บ "utensils#tomato" แต่ /summary แมปจากชื่อ
- `t_9f7adcc8` (dev2) — dev2: ต่อ motion layer ที่ค้างอยู่เข้ากับการนำทางจริง (ตอนนี้ SmoothLink ไม่มีใครเรียก = ไ…
- `t_cc15c5c6` (dev2) — (ทดสอบ workspace) ตรวจว่า project slug ผูก worktree ถูกต้องหรือไม่
- `t_8be3d055` (dev2) — dev2: ต่อ motion layer ที่ค้างอยู่เข้ากับการนำทางจริง (ตอนนี้ SmoothLink ไม่มีใครเรียก = ไ…

**ความซ้ำซ้อนที่ต้องเก็บก่อนทำงานต่อ**:
- `t_8be3d055` กับ `t_9f7adcc8` — ชื่องานเหมือนกันเป๊ะ (ต่อ motion layer เข้ากับการนำทางจริง) ควรเหลือใบเดียว
- `t_cc15c5c6` — การ์ดทดสอบ workspace ของ worker ควรลบออก
- `t_35bda8fa` — เก็บถาวรแล้ว (ซ้ำกับ `t_aa742ca9`; worker 2 ตัวเคยแก้ไฟล์เดียวกัน = ผิดกติกา one writer per file)

## 6. ปัญหาที่เจอจริงรอบนี้ และวิธีแก้ (บทเรียนของทีม)

| ปัญหา | หลักฐาน | แก้อย่างไร |
|---|---|---|
| การ์ดซ้ำทำให้ 2 worker แก้ไฟล์เดียวกัน | `t_35bda8fa` (review ตั้ง) ชนกับ `t_aa742ca9` (lead ตั้ง) บน `BottomSheet.tsx` | เก็บถาวรใบซ้ำ + kill worker + กำหนดเจ้าของไฟล์เดียวชัดเจน |
| worker เขียนไฟล์ลง main ตรง ๆ | ไฟล์ของการ์ดหน้าแรกโผล่ใน main (`get-month-data.ts`, `BalanceCard.tsx`…) | เขียนกฎใน `.hermes.md`: ห้ามเขียนนอก `$HERMES_KANBAN_WORKSPACE` |
| เครื่อง RAM หมด (OOM) ฆ่า worker กลางงาน | `dmesg`: OOM kill `next-server` ใน `hermes-worker-kanban-t_ef8f2a16-run-4.scope`, `node-MainThread` ใน scope `t_725ac167-run-23` | ลดเพดาน worker พร้อมกัน + เพิ่ม RAM ให้ WSL (ข้อ 7) |
| dev server ล่ม ทำให้หน้าเว็บ `Failed to fetch` | รัน `npm run build` ทับ `.next` ขณะ `next dev` ทำงาน + Next เฝ้าดู `.worktrees/` แล้ว worker ลบ `.next` ของตัวเอง | ห้าม build ใน main ตอน server รัน + สตาร์ท server ใหม่เมื่อจำเป็น |
| worker ทั้ง role ตายพร้อมกัน | โมเดล `deepseek-v4.1-flash` ถูกผู้ให้บริการปฏิเสธ HTTP 403 → CLI exit ใน 1 วินาที (protocol violation ซ้ำ 4 รอบ) | เปลี่ยนโมเดลของ qa/default แล้ว probe ผ่าน |
| ตรวจเบราว์เซอร์ไม่ผ่านเพราะเปิดผิด host | `Blocked cross-origin request to Next.js dev resource` เมื่อใช้ `127.0.0.1` | ใช้ `localhost` (หรือตั้ง `allowedDevOrigins`) |
| การ์ดที่ worker สร้างได้ workspace เป็น `scratch` (ไม่มี repo) | `t_c2ff7b65`, `t_95f69bab` → `project_id: null` | worker สร้าง worktree เอง (มีวิธีในคอมเมนต์การ์ด) — แต่ละงานมี branch แยกแล้ว |

## 7. สิ่งที่รอคุณ (ทำได้เฉพาะมนุษย์)

1. **เพิ่ม RAM ให้ WSL** — สร้างไฟล์ให้แล้วที่ `C:\Users\Administrator\.wslconfig` (`memory=12GB`, `swap=4GB`) แต่ยังไม่มีผลเพราะยังไม่ได้ restart: ต้องสั่ง `wsl --shutdown` จาก PowerShell/CMD บน Windows แล้วเปิดใหม่ (ตอนนี้ WSL ได้ 7.7GB จากเครื่อง 15.9GB → เป็นคอขวดความเร็วหลัก)
2. **ทดสอบหลังซ่อมบั๊กบันทึกรายการ** — เมื่อ merge แล้วให้ลองกดบันทึกจริงอีกครั้ง
3. **ทดสอบที่ต้องใช้บัญชี Google ของคุณ** (qa ตรวจแทนไม่ได้): session อยู่รอดหลัง refresh/signOut · มีแถวใหม่ใน `profiles` หลังล็อกอินครั้งแรก
4. **ดีไซน์** — `docs/DESIGN.md` ยังไม่เริ่ม เพราะยังไม่ได้เลือกทิศทาง (คุณต้องการดูจากภาพที่คุณเจนเองก่อน)
5. **ตัดสินใจอนาคต**: AI วิเคราะห์รายจ่ายจะใช้ผู้ให้บริการไหน · LINE login (เฟส 2)

## 8. ขั้นถัดไป (เมื่อคุณสั่งให้ทำงานต่อ)

```
# 1) ปลดงานที่พัก + เปิด dispatcher
systemctl --user start hermes-gateway.service
hermes kanban --board jodtang unblock t_aa742ca9 t_c2ff7b65 t_95f69bab

# 2) งานที่รอ merge: ตรวจ (build/test/lint + รันจริง) แล้ว lead merge เข้า main
#    - t_aa742ca9  branch jodtang/t_aa742ca9-…  (ซ่อมบันทึกรายการ)   commit 42eeae8
#    - t_c2ff7b65  branch jodtang/t_c2ff7b65-auth-hardening         commit aec285d
```

**ลำดับที่ผมเสนอเมื่อกลับมาทำงาน**: (1) merge งานที่พัก 2 ใบหลังตรวจหลักฐาน (2) `profiles.email` (3) งาน fix จาก review 2 ใบ (`/settings/profile` 404 · ไอคอนหมวด 2 ชุด) (4) ตรวจ motion บน main ให้จบ (5) เก็บการ์ดซ้ำ/ทดสอบออกจากบอร์ด

---
_ไฟล์นี้สร้างอัตโนมัติจากฐานข้อมูลบอร์ด kanban + git ของ repo — ตัวเลขทุกตัวดึงจากของจริงที่รันแล้ว ไม่ได้ประมาณ_
