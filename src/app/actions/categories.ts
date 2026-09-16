"use server";

/**
 * Server actions สำหรับจัดการหมวดหมู่ (categories)
 *
 * กติกา:
 * - ใช้ session client — RLS ป้องกันข้อมูลข้ามบัญชี
 * - archive = ตั้ง archived_at (ไม่ DELETE)
 * - ชื่อหมวดซ้ำกันไม่ได้ต่อบัญชี ต่อ kind (UNIQUE constraint ใน DB)
 * - kind = 'income' | 'expense' เท่านั้น
 */

import { createClient } from "@/lib/supabase/server";

type CategoryRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  kind: "income" | "expense";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type ActionResult<T> = { data: T } | { error: string };

/**
 * สร้างหมวดหมู่ใหม่
 */
export async function createCategory(input: {
  name: string;
  kind: "income" | "expense";
  icon?: string | null;
}): Promise<ActionResult<CategoryRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name: input.name,
      kind: input.kind,
      icon: input.icon ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CategoryRow };
}

/**
 * แก้ไขหมวดหมู่
 */
export async function updateCategory(
  id: string,
  input: { name?: string; icon?: string | null }
): Promise<ActionResult<CategoryRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const updates: Record<string, string | number | null> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.icon !== undefined) updates.icon = input.icon;

  if (Object.keys(updates).length === 0) {
    return { error: "ไม่มีอะไรให้แก้" };
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CategoryRow };
}

/**
 * Archive หมวดหมู่ (soft archive — ไม่ DELETE)
 */
export async function archiveCategory(
  id: string
): Promise<ActionResult<CategoryRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("categories")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CategoryRow };
}

/**
 * กู้คืนหมวดหมู่ที่ archive แล้ว
 */
export async function restoreCategory(
  id: string
): Promise<ActionResult<CategoryRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("categories")
    .update({ archived_at: null })
    .eq("id", id)
    .not("archived_at", "is", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CategoryRow };
}

/**
 * ดึงรายการหมวดหมู่ทั้งหมด (ไม่รวมที่ archive แล้ว)
 * @param kind - กรองตามชนิด (ถ้าไม่ระบุ ดึงทั้งหมด)
 */
export async function listCategories(
  kind?: "income" | "expense"
): Promise<ActionResult<CategoryRow[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  let query = supabase
    .from("categories")
    .select("*")
    .is("archived_at", null)
    .order("name");

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };
  return { data: (data ?? []) as CategoryRow[] };
}
