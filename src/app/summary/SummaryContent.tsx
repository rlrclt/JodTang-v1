"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactionsLive } from "@/hooks/useTransactionsLive";
import { useSwipeMonth } from "@/hooks/useSwipeMonth";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";
import { SmoothLink } from "@/components/SmoothLink";
import type {
  CategorySummary,
  MonthTrend,
  BudgetProgress,
} from "@/lib/summary-helpers";
import ExpenseBarChart from "@/components/ExpenseBarChart";
import MonthTrendChart from "@/components/MonthTrend";
import BudgetProgressSection from "@/components/BudgetProgress";
import AiAnalysisCard from "@/components/AiAnalysisCard";
import MonthCalendar from "@/components/MonthCalendar";
import ChatbotModal from "@/components/ChatbotModal";

type Props = {
  expenses: CategorySummary[];
  trend: MonthTrend[];
  budgetProgress: BudgetProgress[];
  totalIncome: number;
  totalExpense: number;
  monthLabel: string;
  selectedYear: number;
  selectedMonth: number;
  prevYear: number;
  prevMonth: number;
  nextYear: number;
  nextMonth: number;
  canGoNext: boolean;
  hasData: boolean;
};

export default function SummaryContent(props: Props) {
  const {
    expenses,
    trend,
    budgetProgress,
    totalIncome,
    totalExpense,
    monthLabel,
    selectedYear,
    selectedMonth,
    prevYear,
    prevMonth,
    nextYear,
    nextMonth,
    canGoNext,
    hasData,
  } = props;

  const router = useRouter();
  const navigate = useSmoothNavigate();
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // กลับมาโฟกัสแล้วข้อมูลเก่าเกิน 60 วิ → สั่ง server รีเฟรชเงียบ
  const markFresh = useTransactionsLive(
    useCallback(() => {
      router.refresh();
    }, [router])
  );
  useEffect(() => {
    markFresh();
  }, [markFresh]);

  // อุ่นเดือนข้างๆ ล่วงหน้า
  useEffect(() => {
    router.prefetch(
      `/summary?month=${prevYear}-${String(prevMonth).padStart(2, "0")}`
    );
    if (canGoNext) {
      router.prefetch(
        `/summary?month=${nextYear}-${String(nextMonth).padStart(2, "0")}`
      );
    }
  }, [router, prevYear, prevMonth, nextYear, nextMonth, canGoNext]);

  // สไลด์นิ้วซ้าย/ขวาเพื่อเปลี่ยนเดือน
  const { swipeRef, swipeHandlers, swipeStyle } = useSwipeMonth({
    onSwipeLeft: () => {
      if (canGoNext)
        navigate(
          `/summary?month=${nextYear}-${String(nextMonth).padStart(2, "0")}`,
          { direction: "forward" }
        );
    },
    onSwipeRight: () =>
      navigate(
        `/summary?month=${prevYear}-${String(prevMonth).padStart(2, "0")}`,
        { direction: "back" }
      ),
  });

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const summaryData = useMemo(
    () => ({
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    }),
    [totalIncome, totalExpense]
  );

  const handleMonthChange = useCallback(
    (newMonthStr: string) => {
      const [y, m] = newMonthStr.split("-").map(Number);
      navigate(`/summary?month=${y}-${String(m).padStart(2, "0")}`);
    },
    [navigate]
  );

  const handleOpenChat = (prompt: string) => {
    setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-28">
      {/* 1. iOS Dynamic Island Header — สไตล์เดียวกันกับหน้าแรกและหน้ารายการ */}
      <div className="mb-4">
        <MonthCalendar
          month={monthStr}
          setMonth={handleMonthChange}
          summary={summaryData}
        />
      </div>

      {/* 2. เนื้อหาการวิเคราะห์ — สไลด์เฉพาะส่วนนี้ Header ค้างที่เดิมอย่างสมูท */}
      <div ref={swipeRef} {...swipeHandlers} style={swipeStyle} className="space-y-4">
        {/* AI Financial Health & Advisor Card */}
        <AiAnalysisCard
          year={selectedYear}
          month={selectedMonth}
          monthLabel={monthLabel}
          hasData={hasData}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          onAskChatbot={handleOpenChat}
        />

        {/* กราฟแท่งรายจ่ายตามหมวด (แตะได้เพื่อ Drill-down ไปหน้ารายการ) */}
        <section className="rounded-3xl border border-white/20 bg-surface/90 p-4 shadow-sm backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">สัดส่วนรายจ่ายตามหมวดหมู่</h3>
            <span className="text-[10px] font-semibold text-text-muted">แตะแท่งกราฟเพื่อดูรายการ</span>
          </div>
          <ExpenseBarChart categories={expenses} />
        </section>

        {/* แถบแนวโน้ม 6 เดือนย้อนหลัง */}
        <section className="rounded-3xl border border-white/20 bg-surface/90 p-4 shadow-sm backdrop-blur-xl">
          <h3 className="mb-2 text-sm font-bold text-text">แนวโน้มเปรียบเทียบ 6 เดือน</h3>
          <MonthTrendChart trend={trend} />
        </section>

        {/* แถบติดตามงบประมาณ (Budget Progress) */}
        <section className="rounded-3xl border border-white/20 bg-surface/90 p-4 shadow-sm backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">เปรียบเทียบกับงบประมาณ</h3>
            <SmoothLink
              href="/settings/budgets"
              className="text-xs font-semibold text-focus hover:underline"
            >
              ตั้งค่างบประมาณ ›
            </SmoothLink>
          </div>
          <BudgetProgressSection progress={budgetProgress} />
        </section>
      </div>

      {/* Deep-dive Chatbot Modal เมื่อกดปรึกษา AI เพิ่มจากหน้าสรุป */}
      {isChatOpen && (
        <ChatbotModal onClose={() => setIsChatOpen(false)} />
      )}
    </div>
  );
}
