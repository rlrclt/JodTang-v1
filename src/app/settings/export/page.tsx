import { SmoothLink } from "@/components/SmoothLink";

export const dynamic = "force-dynamic";

export default function ExportPage() {
  const exportItems = [
    {
      href: "/export/transactions?format=csv",
      title: "รายการทั้งหมด (CSV)",
      desc: "เปิดใน Excel/Google Sheets ได้ทันที (UTF-8 พร้อมหัวตารางภาษาไทย)",
      icon: "📊",
      badge: "Excel / Sheets",
      gradient: "from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      href: "/export/transactions?format=json",
      title: "รายการทั้งหมด (JSON)",
      desc: "โครงสร้างข้อมูลดิบแบบละเอียด เหมาะสำหรับนำไปประมวลผลต่อ",
      icon: "📄",
      badge: "Raw Data",
      gradient: "from-blue-500/20 to-cyan-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      href: "/export/backup",
      title: "สำรองข้อมูลทั้งระบบ (Full Backup JSON)",
      desc: "รวมข้อมูลรายการ กระเป๋าเงิน หมวดหมู่ และงบประมาณครบทั้งหมดในไฟล์เดียว",
      icon: "💾",
      badge: "Full System",
      gradient: "from-purple-500/20 to-pink-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
        <SmoothLink
          href="/settings"
          direction="back"
          className="flex size-10 items-center justify-center rounded-full border border-white/20 dark:border-white/10 bg-surface/80 text-text shadow-sm backdrop-blur-xl transition-all active:scale-95 hover:bg-surface-2"
          aria-label="กลับไปหน้าตั้งค่า"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </SmoothLink>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">ส่งออกข้อมูล</h1>
          <p className="text-xs text-text-muted">ดาวน์โหลดและสำรองข้อมูลทั้งหมดของคุณ</p>
        </div>
      </header>

      {/* Export Cards */}
      <div className="space-y-3">
        {exportItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl border border-white/25 dark:border-white/10 bg-surface/80 p-4 shadow-sm backdrop-blur-xl transition-all hover:border-focus/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5">
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr ${item.gradient} text-xl shadow-inner`}>
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-text tracking-tight group-hover:text-focus transition-colors">
                    {item.title}
                  </h3>
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-muted">
                    {item.badge}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>

            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2/70 text-text-muted group-hover:bg-focus group-hover:text-white transition-all shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
          </a>
        ))}
      </div>

      {/* Info Notice Card */}
      <div className="mt-6 rounded-3xl border border-border/40 bg-surface-2/40 p-5 backdrop-blur-xl text-xs space-y-2 text-text-muted leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-text">
          <span>💡</span>
          <span>ข้อควรรู้เกี่ยวกับไฟล์ส่งออก</span>
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>ไฟล์ส่งออกจะไม่รวมรายการที่อยู่ในถังขยะ</li>
          <li>คอลัมน์ <strong>สตางค์</strong> เป็นจำนวนเต็ม เหมาะสำหรับการประมวลผลหรือ Import เข้าระบบอื่น</li>
          <li>คอลัมน์ <strong>บาท</strong> ถูกจัดรูปแบบสวยงามพร้อมสัญลักษณ์ ฿ สำหรับอ่านตรวจสอบ</li>
          <li>จำกัดการส่งออกสูงสุด 20,000 แถวต่อครั้ง</li>
        </ul>
      </div>
    </div>
  );
}
