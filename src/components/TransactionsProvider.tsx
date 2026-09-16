"use client";

import { createContext, useContext } from "react";
import {
  useTransactionsHook,
  type TransactionsHook,
} from "@/hooks/useTransactionsHook";

const TransactionsContext = createContext<TransactionsHook | null>(null);

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useTransactionsHook();
  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsHook {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error("useTransactions ต้องใช้ภายใต้ TransactionsProvider");
  }
  return ctx;
}
