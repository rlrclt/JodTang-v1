import AccountsList from "./AccountsList";
import { SmoothLink } from "@/components/SmoothLink";
import { listAccountsWithBalances, listArchivedAccounts } from "@/app/actions/accounts";

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
      <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28">
        <Header />
        <main className="mt-8 flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-rose-500/30 bg-rose-500/10 backdrop-blur-xl">
          <p className="font-bold text-rose-500">โหลดกระเป๋าเงินไม่สำเร็จ</p>
          <p className="mt-1 text-xs text-text-muted">
            {activeError ?? archivedError}
          </p>
          <a
            href="/settings/accounts"
            className="mt-4 min-h-[44px] rounded-2xl bg-surface px-6 py-2.5 text-sm font-semibold border border-border shadow-sm active:scale-95 transition-all"
          >
            ลองใหม่
          </a>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
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
        <h1 className="text-2xl font-extrabold tracking-tight text-text">กระเป๋าเงิน</h1>
        <p className="text-xs text-text-muted">จัดการบัญชีธนาคาร บัตร และเงินสด</p>
      </div>
    </header>
  );
}
