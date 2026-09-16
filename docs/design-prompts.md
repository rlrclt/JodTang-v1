# ชุด prompt สำหรับสร้างภาพตัวอย่าง UX/UI (JodTang)

ใช้สำหรับ "ลองสร้างเป็นภาพดูก่อน" — เอาไปวางในเครื่องมือสร้างภาพ (Midjourney, GPT image / ChatGPT, Gemini, Ideogram, Flux ฯลฯ)
จุดประสงค์: เลือก **โทนสี + บรรยากาศ + องค์ประกอบ** ก่อนลงมือทำ UI จริง · ทุกแนวเป็นข้อเสนอใหม่สำหรับ JodTang — **ไม่ยึดธีมหรือหน้าตาของโปรเจกต์ใดก่อนหน้า**

## วิธีใช้ (อ่าน 30 วินาที)

1. คัดลอก "ก้อนกลาง" (§BLOCK) แล้วต่อด้วย palette ที่ต้องการ (§A / §B / §C)
2. วางในเครื่องมือสร้างภาพ · อัตราส่วนมือถือ **9:19.5** (หรือ 390×844)
   - Midjourney: ต่อท้ายด้วย `--ar 9:19.5 --style raw --v 6`
   - ChatGPT / GPT image, Gemini: พิมพ์ prompt ได้ตรง ๆ · แนบภาพอ้างอิงที่คุณชอบ (หรือภาพที่สร้างรอบก่อน) จะคุมโทนให้ต่อเนื่องได้แม่นขึ้น
   - Ideogram: เก่งเรื่องตัวอักษรในภาพที่สุดในกลุ่มนี้ (ถ้าอยากให้ตัวหนังสือไทยอ่านออก ให้ใช้เจ้านี้)
3. **อย่าคาดหวังตัวอักษรไทยจะถูกต้อง 100%** — โมเดลสร้างภาพเกือบทุกตัวเรนเดอร์ไทยเพี้ยน (สระ/วรรณยุกต์หาย, สลับตัว)
   ให้ดูที่ **โครงหน้า, สี, ระยะห่าง, น้ำหนักตัวเลข, เงา/เส้นขอบ** ไม่ต้องอ่านตัวอักษร
   ถ้าตัวอักษรเพี้ยนจนดูไม่ออกว่าเป็นหน้าไหน → ใช้ §SWAP เพื่อขอหน้าเดิมในสไตล์เดิม แล้วเทียบกัน
4. ภาพที่ได้เป็น "แนวทาง" ไม่ใช่สเปก — สเปกจริงคือ `docs/DESIGN.md` (โทเคน/กติกา) ที่จะเขียนหลังคุณเลือกแนว

## BLOCK — ก้อนกลาง (ใช้ร่วมทุกแนว)

```
High-fidelity mobile app UI design mockup, single phone screen, portrait 390x844, Thai personal
finance / expense tracker app. Flat clean vector style, 8pt spacing grid, 16px page padding,
cards with 16px corner radius, hairline dividers, subtle soft shadow, crisp 2px stroke line icons,
Thai sans-serif typeface (IBM Plex Sans Thai look), tabular figures for numbers, generous white
space, no 3D, no glossy gradients, no photo textures, no device frame, no bezel, no hands.

Layout top to bottom:
- Month stepper header: small chevron-left, centered Thai month title "กันยายน 2569", chevron-right
- One summary card: tiny muted label "คงเหลือเดือนนี้", huge bold right-aligned balance "฿11,660.00",
  two ledger rows: "รับ" with green "+฿24,500.00" and "จ่าย" with red "−฿12,840.00"
- Section header: "รายการล่าสุด" on the left, small accent-colored text button "ดูทั้งหมด" on the right
- Transaction list, 6 rows, each row: 10px colored category dot, Thai category name (อาหาร, เงินเดือน,
  เดินทาง, ค่าห้อง, ของใช้, ค่าน้ำค่าไฟ), small muted subtitle like "13 ก.ย. · จ่าย", right-aligned
  bold amount in green with "+" or red with "−" (e.g. "−฿185.00", "+฿22,500.00"), 1px divider between rows
- Bottom tab bar, 4 equal tabs with 24px line icons + tiny Thai labels: หน้าแรก (house, active),
  รายการ (list), สรุป (bar chart), ตั้งค่า (gear)
- Rounded-square floating action button, 56x56, bottom right above the tab bar, white "+" icon
- iOS status bar and home indicator present, no browser chrome

Numbers always show "฿" prefix, comma separators and two decimals, right-aligned in a column.
Income and expense are distinguished by BOTH sign and color, never color alone.
```

## §A — Teal & Calm (โทนเย็น นิ่ง มาตรฐานแอปการเงิน)

```
Palette: canvas very light cool gray #EAEFF4, cards pure white #FFFFFF, secondary surface #F1F3F6,
hairline border #E3E7ED, primary text near-black navy #101828, muted text #616B7A,
single action accent dark teal #0E7490 used ONLY for FAB, active tab, links and primary button,
income green #157A3B, expense red #BE123C. Calm, trustworthy, readable, low saturation,
reminiscent of a well-made banking utility app.
```

มู้ด: นิ่ง ไว้วางใจ อ่านง่าย · เป็นโทนมาตรฐานของแอปการเงิน (ค่าคอนทราสต์จริงต้องวัดซ้ำตอนเขียน DESIGN.md)

## §B — Clean Fintech (ขาวสะอาด ตัวเลขเป็นพระเอก)

```
Palette: canvas near-white #F7F8FA, cards pure white with 1px hairline border #ECEEF2 and no shadow,
primary text #0F1115, muted text #6B7280, single graphite-black accent #111827 for FAB, active tab and
primary button, income #067A46, expense #C81E4A, one optional indigo #4F46E5 for links only.
Extremely minimal: monochrome thin-stroke icons, no colored category dots (use tiny monochrome glyphs
inside a light circle), very large bold balance number, wide letter-spacing on small caps labels,
feels like a premium fintech app (Wise / Revolut / Stripe dashboard energy).
```

มู้ด: พรีเมียม สะอาด เป็นทางการ · ข้อควรระวัง: สีน้อยลง = แยกหมวดด้วยสีไม่ได้ → พึ่งไอคอน/ตัวอักษร และความคอนทราสต์ของข้อความรองต้องวัดใหม่

## §C — Warm Friendly (อบอุ่น เป็นมิตร ใช้กับเพื่อน)

```
Palette: canvas warm cream #FBF7F1, cards pure white, secondary surface #F4EEE4, border #EBE1D3,
primary text #1F1B16, muted text #7A6A57, warm terracotta accent #E4572E for FAB, active tab and
primary button, income #0E8A5F, expense #C0392B, plus soft secondary hues for category dots
(#E4572E #0E8A5F #2C7DA0 #8E6BBF #C99700). Larger 20px card radius, chunky rounded icons,
friendly slightly bouncy feel, still clean and uncluttered.
```

มู้ด: อบอุ่น ไม่เป็นทางการ เหมาะกับแอปที่ใช้กันในกลุ่มเพื่อน · ข้อควรระวัง: terracotta กับ expense red อยู่ใกล้กัน — ต้องวัดคอนทราสต์และแยกบทบาทให้ชัด

## §SWAP — เปลี่ยนหน้าจอ (ต่อท้ายก้อนกลางแทนรายการ Layout เดิม)

- **หน้ากรอกเร็ว (bottom sheet)**: `Instead of the list, show a bottom sheet covering the lower 60% of the screen: drag handle, chips "จ่าย / รับ / โอน" (จ่าย active), huge centered amount "฿1,250.00" with a blinking-style caret, category chips with colored dots (อาหาร active), row "วันนี้ · กระเป๋าเงินสด", and a 56px full-width primary button labeled "บันทึก" pinned at the bottom of the sheet, above a custom numeric keypad (digits 0-9, ".", backspace) in 4 columns of ≥56px keys, with quick-amount shortcuts 20 / 50 / 100 / 500 on the top row of the keypad.`
- **หน้าสรุป**: `Instead of the list, show: a donut chart on the left with a legend of Thai category names and percentages, a horizontal bar list of top 5 categories with amounts, a 6-month bar trend strip with Thai month abbreviations, and a "งบประมาณ" progress bar per category with a warning state at 80% usage.`
- **หน้าเข้าสู่ระบบ**: `Instead of the list, show an almost empty screen: app wordmark "JodTang", one short Thai subtitle, two full-width 56px buttons stacked with provider logos — "ดำเนินการต่อด้วย Google" and "ดำเนินการต่อด้วย LINE" — and a small muted footnote line. Very airy, no illustrations.`

## NEGATIVE — ใส่ท้าย prompt เสมอ (หรือใส่ในช่อง negative ของเครื่องมือ)

```
english text, lorem ipsum, garbled fake text, watermark, signature, logo of another brand,
photorealistic photo, 3D render, glossy glass, heavy gradient mesh, drop shadow overload,
cluttered layout, browser address bar, app store frame, hands, people, laptop, multiple screens side by side,
bright saturated rainbow palette, red used as decoration, green used as decoration
```

## หมายเหตุสำหรับคนที่เอาไปทำ UI จริง (dev)

- ภาพที่สร้างจาก prompt นี้ใช้ **เลือกแนว** เท่านั้น — ค่าจริงต้องมาจาก `docs/DESIGN.md` และวัดคอนทราสต์ก่อนใช้ (ข้อความ ≥ 4.5:1, ขอบช่องกรอก ≥ 3:1)
- กติกาที่ไม่เปลี่ยนตามแนว: เงินเป็น bigint สตางค์ · `formatSatang()` ตัวเดียว · `tabular-nums` · แยกความหมายด้วย `+`/`−` ไม่ใช่สีเดียว · tap target ≥ 44px · ไม่มี modal กลางจอ · ไม่มี page reload
- โหมดมืดยังไม่ทำใน v1 (เลือกไว้: สว่างก่อน) แต่โทเคนต้องตั้งชื่อให้เพิ่ม `.dark` ทีหลังได้โดยไม่ต้องแก้ component
