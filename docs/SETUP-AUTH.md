# ตั้งค่าล็อกอิน (Google + LINE) — คู่มือของเจ้าของโปรเจกต์

โปรเจกต์ Supabase (dev): `rivufpvxrfjfhsyamiet.supabase.co`
ไฟล์นี้ไม่มีค่า secret ใด ๆ และ **ห้ามใส่ค่า secret ลงไฟล์นี้หรือไฟล์ที่ commit ใด ๆ**

## กฎความลับ (ผมและ worker ทุกคนยึด)

- **ค่า Client ID / Client Secret ของ Google และ LINE เก็บใน Supabase Dashboard เท่านั้น** — ไม่ต้องใส่ในไฟล์ในเครื่องเลย แอปของเราอ่านไม่ถึงค่านั้น
- `.env.local` ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ใส่แล้ว) · คีย์ `sb_secret_…` ยังไม่ต้องใช้ใน v1
- ห้ามใส่ค่า secret ใน `.env.example` (ไฟล์ที่ commit ขึ้น git)
- **ห้ามส่งค่าให้ผมในแชตหรือคอมเมนต์การ์ด** — ไม่มีงานไหนของทีมต้องใช้ค่านั้น

## 1) Google

1. Google Cloud Console → สร้างโปรเจกต์ (หรือใช้โปรเจกต์ที่มี)
2. **Google Auth Platform → Audience**: เลือก External (ถ้ายังไม่ verify ให้ใส่ตัวเองเป็น Test user)
   **Branding**: ชื่อแอป + อีเมลผู้ดูแล (ผู้ใช้จะเห็นชื่อนี้ในหน้าขออนุญาต)
3. **Data Access (Scopes)**: เพิ่ม `openid` (ต้องเพิ่มเอง) · `.../auth/userinfo.email` และ `.../auth/userinfo.profile` มีให้อยู่แล้ว
4. **Clients → Create client** → Application type: **Web application** → Authorized redirect URIs ใส่
   `https://rivufpvxrfjfhsyamiet.supabase.co/auth/v1/callback`
5. กด Create → คัดลอก **Client ID** และ **Client Secret** (เก็บไว้ที่ปลอดภัย — ไม่ต้องส่งให้ผม)
6. Supabase Dashboard → **Authentication → Providers → Google** → เปิด provider → วาง Client ID + Client Secret → Save

## 2) LINE (ใช้เป็น Custom OIDC provider) — ⏸ เลื่อนเป็นเฟส 2 (ยังไม่ต้องทำตอนนี้ · เก็บคู่มือไว้ใช้เมื่อพร้อม)

1. LINE Developers Console → Provider → **Create a LINE Login channel** (channel type: Web app)
2. แท็บ **LINE Login** → **Callback URL** = `https://rivufpvxrfjfhsyamiet.supabase.co/auth/v1/callback`
   (ค่าเดียวกับ Google ใส่ได้หลายบรรทัด)
3. สิทธิ์อีเมล (ต้องยื่นขอ ไม่งั้นผู้ใช้ LINE จะไม่มีอีเมลในระบบ):
   แท็บ **Basic settings** → หัวข้อ **OpenID Connect** → **Apply** → ยอมรับเงื่อนไข + อัปโหลดภาพหน้าจอที่อธิบายว่าเก็บอีเมลไปใช้ทำอะไร → รออนุมัติ (สถานะจะขึ้น "Applied")
   แอปเรารองรับผู้ใช้ที่ไม่มีอีเมลอยู่แล้ว (คอลัมน์อีเมล nullable) จึงเริ่มใช้ได้ก่อนอนุมัติ
4. คัดลอก **Channel ID** และ **Channel secret** จากแท็บ Basic settings
5. Supabase Dashboard → **Authentication → Providers → Custom OAuth Providers** → Create provider
   - Provider type: **OIDC**
   - Identifier: **`custom:line`** ← ต้องตรงเป๊ะ โค้ดแอปจะเรียก `provider: 'custom:line'`
   - Issuer URL: `https://access.line.me`
   - Client ID = LINE **Channel ID** · Client Secret = LINE **Channel secret**
   - Scopes: `openid profile email` (ถ้ายังไม่อนุมัติอีเมล ใช้ `openid profile` ไปก่อน)
   - **Email optional: เปิด (ON)**
   - Save + เปิดใช้งาน (enabled)
   (free plan ใส่ custom provider ได้สูงสุด 3 ตัว)

## 3) URL Configuration (ลืมบ่อย และทำให้ล็อกอินพังทันทีที่ deploy)

Supabase → **Authentication → URL Configuration**

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/**` (เพิ่ม `https://<โดเมน-vercel>/**` ตอน deploy จริง)

## 4) ตรวจว่าเสร็จหรือยัง — โดยไม่เปิดเผยค่า

รันคำสั่งนี้ (อ่านแค่ URL + publishable key จาก `.env.local` และพิมพ์แค่ผลการเชื่อมต่อ/provider):

```bash
cd /home/yoro/work/JodTang && node --env-file=.env.local /tmp/check-supabase2.mjs
```

ต้องเห็น `external_google_enabled: true` และมี custom provider ของ LINE
บอกผมเมื่อครบ → ผมปลดบล็อกการ์ด qa `t_110b9fc9` เพื่อทดสอบล็อกอินจริง (Google + LINE) และบันทึกหลักฐาน

## 5) ห้ามทำ

- ห้ามใส่ OAuth secret / `sb_secret_…` ลงไฟล์ที่ commit หรือส่งในแชต
- ห้ามใช้คีย์ `sb_secret_…` ฝั่ง client (ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_`)
- ห้ามชี้ provider ไปโปรเจกต์ production — เมื่อมีโปรเจกต์ prod ให้ตั้ง OAuth client แยกชุด
