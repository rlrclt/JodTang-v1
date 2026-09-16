import AccountsList from "./AccountsList";
import { listAccountsWithBalances, listArchivedAccounts } from "@/app/actions/accounts";

// หน้าจัดการกระเป๋าเงิน (#9 จาก SCREENS.md)
// - รายการกระเป๋า + ยอดคงเหลือต่อกระเป๋า (จากชั้นข้อมูล ไม่บวกในไฟล์นี้)
// - กลุ่ม "ปิดใช้งานแล้ว" แยก อ่านจาก listArchivedAccounts
// - สถานะ error มี refresh ปุ่ม (refresh เดียวทั้งหน้า) — ไม่มี fallback ล็อกอินปลอม
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [active, archived] = await Promise.all([
    listAccountsWithBalances(),
    listArchivedAccounts(),
  ]);

  const activeError = "error" in active ? active.error : null;
  const archivedError = "error" in archived ? archived.error : null;

  if (activeError || archivedError) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
          <p className="mb-4 text-warn">โหลดกระเป๋าเงินไม่สำเร็จ</p>
          <p className="mb-6 text-sm text-text-muted">
            {activeError ?? archivedError}
          </p>
          <a
            href="/settings/accounts"
            className="min-h-[44px] rounded-btn border border-border bg-surface px-6 py-3 text-base"
          >
            ลองใหม่
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <AccountsList
        active={"data" in active ? active.data : []}
        archived={"data" in archived ? archived.data : []}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-2 p-4 pb-2">
      <a href="/settings" className="p-2 -m-2" aria-label="กลับไปหน้าตั้งค่า">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </a>
      <h1 className="text-2xl font-bold">กระเป๋าเงิน</h1>
    </header>
  );
}
