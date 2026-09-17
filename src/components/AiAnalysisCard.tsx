"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getSavedAnalysis,
  requestAiAnalysis,
  type AiAnalysisRow,
} from "@/app/actions/ai";
import type { AnalysisResult } from "@/lib/ai/analyze";
import { getMonthRange } from "@/lib/date";

type Props = {
  year: number;
  month: number;
  monthLabel: string;
  hasData: boolean;
};

export default function AiAnalysisCard({
  year,
  month,
  monthLabel,
  hasData,
}: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSaved, setCheckedSaved] = useState(false);

  const { start, end } = getMonthRange(year, month);
  const periodFrom = start.slice(0, 10);
  const periodTo = end.slice(0, 10);

  // ดึงผลวิเคราะห์เดิมที่เคยบันทึกไว้
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
      className="mb-4 rounded-[var(--radius-card)] border border-focus/20 bg-surface p-4 shadow-sm"
      aria-label="AI วิเคราะห์การเงิน"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h2 className="text-sm font-semibold text-text">AI วิเคราะห์รายจ่าย</h2>
            <p className="text-[11px] text-text-muted">
              สรุปพฤติกรรม & คำแนะนำวางแผนการเงิน
            </p>
          </div>
        </div>

        {analysis && (
          <span className="rounded-full bg-focus/10 px-2.5 py-0.5 text-[10px] font-medium text-focus">
            {analysis.model.includes("gemini") ? "✨ Gemini AI" : "⚡ Heuristic AI"}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-expense/10 p-3 text-xs text-expense">
          {error}
        </div>
      )}

      {analysis ? (
        <div className="space-y-3">
          {/* Summary Text */}
          <div className="rounded-xl bg-bg p-3 text-sm leading-relaxed text-text">
            {analysis.summary}
          </div>

          {/* Key Insights */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-muted">
                คำแนะนำและข้อสังเกต:
              </p>
              <ul className="space-y-2">
                {analysis.insights.map((insight, i) => {
                  const isWarn = insight.type === "warning";
                  const isPos = insight.type === "positive";
                  return (
                    <li
                      key={i}
                      className={`rounded-xl p-3 text-xs ${
                        isWarn
                          ? "bg-warn/10 border border-warn/20 text-text"
                          : isPos
                            ? "bg-income/10 border border-income/20 text-text"
                            : "bg-surface-2/60 text-text"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold mb-0.5">
                        <span>{isWarn ? "⚠️" : isPos ? "🌟" : "💡"}</span>
                        <span>{insight.title}</span>
                      </div>
                      <p className="text-text-muted leading-normal pl-5">
                        {insight.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Re-analyze Button */}
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={handleAnalyze}
              className="text-xs font-medium text-focus hover:underline active:opacity-80"
            >
              {loading ? "กำลังวิเคราะห์ใหม่..." : "🔄 วิเคราะห์ใหม่อีกครั้ง"}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-2 text-center">
          <p className="mb-3 text-xs text-text-muted">
            ให้ AI สรุปว่าเงินหมดไปกับอะไร พร้อมคำแนะนำปรับลดรายจ่ายประจำเดือนนี้
          </p>
          <button
            type="button"
            disabled={loading || !checkedSaved}
            onClick={handleAnalyze}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-focus px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-focus/90 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>กำลังวิเคราะห์ข้อมูล...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>วิเคราะห์รายจ่ายเดือนนี้ด้วย AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
