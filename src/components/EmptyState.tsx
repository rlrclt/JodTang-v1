/**
 * แสดงเมื่อไม่มีรายการธุรกรรม
 */
export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 text-4xl">📝</div>
      <h3 className="mb-2 text-lg font-semibold text-text">
        ยังไม่มีรายการ
      </h3>
      <p className="text-sm text-text-muted">
        เพิ่มรายการแรกของคุณด้วยปุ่ม + ด้านล่าง
      </p>
    </div>
  );
}
