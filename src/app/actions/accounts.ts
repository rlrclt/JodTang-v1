"use server";

/**
 * Server actions สำหรับจัดการกระเป๋าเงิน (accounts)
 *
 * กติกา:
 * - ใช้ session client — RLS ป้องกันข้อมูลข้ามบัญชี
 * - archive = ตั้ง archived_at (ไม่ DELETE)
 * - ชื่อกระเป๋าซ้ำกันไม่ได้ต่อบัญชี (UNIQUE constraint ใน DB)
 */

import { createClient } from "@/lib/supabase/server";

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
