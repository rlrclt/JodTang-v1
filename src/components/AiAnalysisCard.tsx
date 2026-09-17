"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getSavedAnalysis,
  requestAiAnalysis,
  type AiAnalysisRow,
} from "@/app/actions/ai";
import type { AnalysisResult } from "@/lib/ai/analyze";
import { getMonthRange } from "@/lib/date";
import { SmoothLink } from "@/components/SmoothLink";

type Props = {
  year: number;
  month: number;
  monthLabel: string;
  hasData: boolean;
  totalIncome: number;
  totalExpense: number;
  onAskChatbot?: (initialPrompt: string) => void;
};

export default function AiAnalysisCard({
  year,
  month,
  monthLabel,
  hasData,
  totalIncome,
  totalExpense,
  onAskChatbot,
}: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSaved, setCheckedSaved] = useState(false);

  const { start, end } = getMonthRange(year, month);
  const periodFrom = start.slice(0, 10);
  const periodTo = end.slice(0, 10);

  // คำนวณคะแนนสุขภาพการเงิน (Financial Health Score 0-100)
  const healthMetrics = useMemo(() => {
    if (!hasData || totalIncome <= 0) {
      return { score: 50, rate: 0, label: "เริ่มต้นบันทึก", color: "text-text-muted" };
    }
    const savings = totalIncome - totalExpense;
    const savingsRate = Math.round((savings / totalIncome) * 100);

    let score = 50;
    if (savingsRate >= 30) score = 95;
    else if (savingsRate >= 20) score = 85;
    else if (savingsRate >= 10) score = 70;
    else if (savingsRate >= 0) score = 60;
    else score = Math.max(20, 50 + savingsRate); // ติดลบ

    let label = "สมดุลดี";
    let color = "text-balance";
    if (score >= 85) {
      label = "ยอดเยี่ยม";
      color = "text-income";
    } else if (score <= 40) {
      label = "ควรระวัง";
      color = "text-expense";
    }

    return { score, rate: savingsRate, label, color };
  }, [hasData, totalIncome, totalExpense]);

  // ดึงผลวิเคราะห์เดิมที่เคยบันทึกไว้ใน Supabase
  useEffect(() => {
    let cancelled = false;
    const fetchSaved = async () => {
      setCheckedSaved(false);
      setAnalysis(null);
      setError(null);
      try {
        const res = await getSavedAnalysis(periodFrom, periodTo);
        if (cancelled) return;
        if ("data" in res && res.data) {
          const row = res.data as AiAnalysisRow;
          if (row.raw_response) {
            setAnalysis(row.raw_response);
          } else if (row.summary) {
            setAnalysis({
              summary: row.summary,
              model: row.model || "AI",
              insights: [],
            });
          }
        }
      } catch (err) {
        console.error("Failed to load saved AI analysis:", err);
      } finally {
        if (!cancelled) setCheckedSaved(true);
      }
    };

    fetchSaved();
    return () => {
      cancelled = true;
    };
  }, [periodFrom, periodTo]);

  const handleAnalyze = useCallback(async () => {
    if (!hasData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await requestAiAnalysis(year, month, monthLabel);
      if ("error" in res) {
        setError(res.error);
      } else {
        setAnalysis(res.data);
      }
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการวิเคราะห์");
    } finally {
      setLoading(false);
    }
  }, [hasData, year, month, monthLabel]);

  if (!hasData) return null;

  return (
    <section
      className="mb-5 overflow-hidden rounded-3xl border border-white/20 bg-surface/95 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-all"
      aria-label="ศูนย์วิเคราะห์การเงิน AI"
    >
      {/* Header with Health Gauge */}
      <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-focus via-blue-500 to-sky-400 text-white shadow-md shadow-focus/25">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-text">AI Financial Health & Insights</h2>
            <p className="text-[11px] text-text-muted">
              วิเคราะห์พฤติกรรม & คำแนะนำเจาะลึก
            </p>
          </div>
        </div>

        {/* คะแนนสุขภาพกระเป๋า */}
        <div className="flex flex-col items-end rounded-2xl bg-surface-2/80 px-3 py-1.5 border border-border/30">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-medium text-text-muted">คะแนนสุขภาพ:</span>
            <span className={`text-xs font-black ${healthMetrics.color}`}>
              {healthMetrics.score}/100
            </span>
          </div>
          <span className="text-[9px] font-semibold text-text-muted">
            {healthMetrics.label} (ออม {healthMetrics.rate}%)
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-2xl bg-expense/10 p-3 text-xs text-expense border border-expense/20">
          {error}
        </div>
      )}

      {analysis ? (
        <div className="space-y-3.5">
          {/* Executive Summary */}
          <div className="rounded-2xl border border-focus/15 bg-focus/5 p-3.5 text-sm leading-relaxed text-text shadow-inner">
            <div className="flex items-center gap-1.5 text-xs font-bold text-focus mb-1">
              <span>✨</span>
              <span>บทวิเคราะห์ภาพรวมประจำเดือน</span>
            </div>
            {analysis.summary}
          </div>

          {/* Actionable Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-text-muted px-1">
                ข้อสังเกตและโอกาสปรับปรุง:
              </p>
              <ul className="space-y-2">
                {analysis.insights.map((insight, i) => {
                  const isWarn = insight.type === "warning";
                  const isPos = insight.type === "positive";
                  return (
                    <li
                      key={i}
                      className={`group rounded-2xl p-3 text-xs transition-all border ${
                        isWarn
                          ? "bg-warn/10 border-warn/25 text-text"
                          : isPos
                            ? "bg-income/10 border-income/25 text-text"
                            : "bg-surface-2/70 border-border/40 text-text"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{isWarn ? "⚠️" : isPos ? "🌟" : "💡"}</span>
                          <span>{insight.title}</span>
                        </div>
                        {onAskChatbot && (
                          <button
                            type="button"
                            onClick={() =>
                              onAskChatbot(
                                `จากข้อสังเกตเรื่อง "${insight.title}" ในเดือน${monthLabel} อยากขอคำแนะนำเพิ่มเติมว่าควรทำอย่างไรดี?`
                              )
                            }
                            className="shrink-0 text-[10px] font-bold text-focus hover:underline active:scale-95 transition-all flex items-center gap-1"
                          >
                            <span>ปรึกษา AI เพิ่ม</span>
                            <span>›</span>
                          </button>
                        )}
                      </div>
                      <p className="text-text-muted leading-relaxed pl-5">
                        {insight.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              disabled={loading}
              onClick={handleAnalyze}
              className="text-xs font-semibold text-text-muted hover:text-focus transition-colors"
            >
              {loading ? "กำลังอัปเดต..." : "🔄 วิเคราะห์ใหม่อีกครั้ง"}
            </button>

            {onAskChatbot && (
              <button
                type="button"
                onClick={() =>
                  onAskChatbot(
                    `ช่วยสรุปและวิเคราะห์แนวทางปรับลดค่าใช้จ่ายของเดือน ${monthLabel} ให้เห็นเป็นแผนปฏิบัติการ 3 ข้อหน่อย`
                  )
                }
                className="flex items-center gap-1.5 rounded-full bg-focus px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-focus/25 hover:bg-focus/90 active:scale-95 transition-all"
              >
                <span>💬 พูดคุยวางแผนกับบอท</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State before Analysis */
        <div className="py-4 text-center">
          <p className="mb-3 text-xs text-text-muted max-w-xs mx-auto">
            ให้ AI วิเคราะห์สัดส่วนรายรับ-รายจ่าย ประเมินความเสี่ยง และแนะนำวิธีประหยัดเงินที่ตรงกับพฤติกรรมของคุณ
          </p>
          <button
            type="button"
            disabled={loading || !checkedSaved}
            onClick={handleAnalyze}
            className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-focus to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-focus/25 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>กำลังประมวลผลข้อมูลการเงิน...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>วิเคราะห์สุขภาพการเงินเดือนนี้ด้วย AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
