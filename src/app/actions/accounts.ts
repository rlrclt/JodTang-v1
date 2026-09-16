"use server";

/**
 * Server actions สำหรับจัดการกระเป๋าเงิน (accounts)
 *
 * กติกา:
 * - ใช้ session client — RLS ป้องกันข้อมูลข้ามบัญชี
 * - archive = ตั้ง archived_at (ไม่ DELETE)
 * - ชื่อกระเป๋าซ้ำกันไม่ได้ต่อบัญชี (UNIQUE constraint ใน DB)
 * - ยอดคงเหลือ = คำนวณจาก transactions (สดจาก DB ทุกครั้งที่เปิดหน้า) ไม่เก็บ cache
 */

import { createClient } from "@/lib/supabase/server";
import { computeBalances, type AccountBalance } from "@/lib/account-balance";

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActionResult<T> = { data: T } | { error: string };

/**
 * สร้างกระเป๋าเงินใหม่
 */
export async function createAccount(input: {
  name: string;
  currency?: string;
}): Promise<ActionResult<AccountRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: input.name,
      currency: input.currency ?? "THB",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as AccountRow };
}

/**
 * แก้ไขกระเป๋าเงิน
 */
export async function updateAccount(
  id: string,
  input: { name?: string; currency?: string }
): Promise<ActionResult<AccountRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const updates: Record<string, string | number | null> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.currency !== undefined) updates.currency = input.currency;

  if (Object.keys(updates).length === 0) {
    return { error: "ไม่มีอะไรให้แก้" };
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as AccountRow };
}

/**
 * Archive กระเป๋าเงิน (soft archive — ไม่ DELETE)
 */
export async function archiveAccount(
  id: string
): Promise<ActionResult<AccountRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("accounts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as AccountRow };
}

/**
 * กู้คืนกระเป๋าเงินที่ archive แล้ว
 */
export async function restoreAccount(
  id: string
): Promise<ActionResult<AccountRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("accounts")
    .update({ archived_at: null })
    .eq("id", id)
    .not("archived_at", "is", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as AccountRow };
}

/**
 * ดึงรายการกระเป๋าเงินทั้งหมด (ไม่รวมที่ archive แล้ว)
 */
export async function listAccounts(): Promise<
  ActionResult<AccountRow[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .is("archived_at", null)
    .order("name");

  if (error) return { error: error.message };
  return { data: (data ?? []) as AccountRow[] };
}

/**
 * ดึงรายการกระเป๋าที่ archive แล้ว — ไว้ใช้แสดงกลุ่ม "ปิดใช้งานแล้ว" ในหน้า/accounts
 */
export async function listArchivedAccounts(): Promise<
  ActionResult<AccountRow[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .not("archived_at", "is", null)
    .order("name");

  if (error) return { error: error.message };
  return { data: (data ?? []) as AccountRow[] };
}

/**
 * รายการกระเป๋าที่ใช้งานอยู่ + ยอดคงเหลือต่อกระเป๋า
 *
 * ยอด = คำนวณจาก transactions (รับ − จ่าย + โอนเข้า − โอนออก)
 * hash ไม่เก็บยอดไว้ที่ row กระเป๋า (ไม่ทำแบบ cached) — คำนวณสดเพื่อให้แอปทั้งหมดเห็นตรงกัน
 * กระเป๋าที่ archive ไม่รวม
 */
export async function listAccountsWithBalances(): Promise<
  ActionResult<AccountBalance[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  // ดึงกระเป๋าที่ใช้งานอยู่ + รายการที่ไม่ได้ลบ — 2 query รวมกันคำนวณฝั่ง server
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name, currency")
    .is("archived_at", null)
    .order("name");

  if (accountsError) return { error: accountsError.message };

  const { data: txs, error: txsError } = await supabase
    .from("transactions")
    .select("kind, account_id, to_account_id, amount")
    .is("deleted_at", null);

  if (txsError) return { error: txsError.message };

  const balances = computeBalances(
    (txs ?? []).map((tx: Record<string, unknown>) => ({
      kind: tx.kind as "income" | "expense" | "transfer",
      account_id: tx.account_id as string,
      to_account_id: (tx.to_account_id as string | null) ?? null,
      amount: String(tx.amount),
    }))
  );

  return {
    data: (accounts ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      currency: a.currency as string,
      balance: balances.get(a.id as string) ?? 0,
    })),
  };
}
