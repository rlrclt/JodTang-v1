"use client";

import { useCallback, useId, useState } from "react";
import {
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  listCategories,
} from "@/app/actions/categories";
import { SmoothLink } from "@/components/SmoothLink";
import CategoryIcon, {
  CATEGORY_ICONS,
  isCategoryIconName,
  type CategoryIconName,
} from "@/components/CategoryIcon";

type Kind = "income" | "expense";

type Row = {
  id: string;
  name: string;
  /** ค่าตาม DB: "utensils#tomato" = ไอคอน # สี (null = ไม่ได้เลือก) */
  icon: string | null;
  kind: Kind;
  archived_at: string | null;
};

type ActionResult<T> = { data: T } | { error: string };

// ─── สีกราฟ 8 สี — อ้างโทเคนใน globals.css เสมอ ห้ามใส่ค่าดิบใน component ───
const COLOR_TOKENS = [
  "tomato",
  "amber",
  "lime",
  "teal",
  "sky",
  "indigo",
  "fuchsia",
  "graphite",
] as const;

type ColorSuffix = (typeof COLOR_TOKENS)[number];

const COLOR_LABELS: Record<ColorSuffix, string> = {
  tomato: "แดง",
  amber: "ส้ม",
  lime: "เขียวมะนาว",
  teal: "เขียวขี้ม้า",
  sky: "ฟ้า",
  indigo: "คราม",
  fuchsia: "ชมพู",
  graphite: "เทาเข้ม",
};

const colorVar = (s: ColorSuffix) => `var(--color-cat-${s})`;

// ─── validation (server กันซ้ำอีกชั้นด้วย UNIQUE(user_id, name, kind) ใน DB) ───
function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "ชื่อหมวดหมู่ห้ามว่าง";
  if (trimmed.length > 50) return "ชื่อต้องไม่เกิน 50 อักขระ";
  return null;
}

function isDuplicateError(msg: string): boolean {
  return msg.includes("duplicate") || msg.includes("unique");
}

/** แยก icon ออกจาก suffix สี — "utensils#tomato" -> "utensils" */
function iconPart(value: string | null): CategoryIconName | null {
  if (!value) return null;
  const sep = value.indexOf("#");
  const base = sep >= 0 ? value.slice(0, sep) : value;
  return isCategoryIconName(base) ? base : null;
}

function colorSuffixPart(value: string | null): ColorSuffix | null {
  if (!value) return null;
  const sep = value.indexOf("#");
  if (sep < 0) return null;
  const s = value.slice(sep + 1);
  return (COLOR_TOKENS as readonly string[]).includes(s)
    ? (s as ColorSuffix)
    : null;
}

function toRow(d: {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
  archived_at: string | null;
}): Row {
  return {
    id: d.id,
    name: d.name,
    icon: d.icon,
    kind: d.kind === "income" ? "income" : "expense",
    archived_at: d.archived_at,
  };
}

function byThaiName(a: Row, b: Row): number {
  return a.name.localeCompare(b.name, "th");
}

export default function CategoriesScreen(props: {
  initialCategories?: Row[];
  initialError?: string;
}) {
  const [items, setItems] = useState<Row[]>(props.initialCategories ?? []);
  const [loaded, setLoaded] = useState(!props.initialError);
  const [loadError, setLoadError] = useState<string | null>(
    props.initialError ?? null
  );
  const [reloading, setReloading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // bottom sheet เดียวใช้ทั้งเพิ่ม/แก้ — ไม่มี modal กลางจอ, ไม่ reload หน้า
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKind, setSheetKind] = useState<Kind>("expense");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIconName | null>(null);
  const [color, setColor] = useState<ColorSuffix>("tomato");

  const editing = editingId
    ? (items.find((r) => r.id === editingId) ?? null)
    : null;

  const reload = useCallback(async () => {
    setReloading(true);
    setLoadError(null);
    const result = await listCategories();
    setReloading(false);
    if ("error" in result) {
      setLoaded(false);
      setLoadError(result.error);
      return;
    }
    setItems(result.data);
    setLoaded(true);
  }, []);

  const openAdd = (kind: Kind) => {
    setEditingId(null);
    setSheetKind(kind);
    setName("");
    setIcon(null);
    setColor("tomato");
    setFormError(null);
    setSheetOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setSheetKind(row.kind);
    setName(row.name);
    setIcon(iconPart(row.icon));
    setColor(colorSuffixPart(row.icon) ?? "tomato");
    setFormError(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    const err = validateName(trimmed);
    if (err) {
      setFormError(err);
      return;
    }
    setSaving(true);
    setBannerError(null);

    // ส่งเป็นสตริงเดียว "ชื่อไอคอน#สี" ตามรูปแบบที่ page.tsx อ่านกลับได้
    const iconToSend = icon ? `${icon}#${color}` : null;

    if (editing) {
      const result = await updateCategory(editing.id, {
        name: trimmed,
        icon: iconToSend,
      });
      setSaving(false);
      if ("error" in result) {
        if (isDuplicateError(result.error)) {
          setFormError("มีหมวดชื่อนี้อยู่แล้วในกลุ่มเดียวกัน");
        } else {
          setFormError(result.error);
        }
        return;
      }
      const updated = toRow(result.data);
      setItems((prev) =>
        prev
          .map((r) => (r.id === updated.id ? updated : r))
          .sort(byThaiName)
      );
      closeSheet();
      return;
    }

    const result = await createCategory({
      name: trimmed,
      kind: sheetKind,
      icon: iconToSend,
    });
    setSaving(false);
    if ("error" in result) {
      if (isDuplicateError(result.error)) {
        setFormError("มีหมวดชื่อนี้อยู่แล้วในกลุ่มเดียวกัน");
      } else {
        setFormError(result.error);
      }
      return;
    }
    setItems((prev) => [...prev, toRow(result.data)].sort(byThaiName));
    closeSheet();
  };

  // archive → ลบจากตัวเลือกของหน้าบันทึกรายการ (แสดงผลในรายการนี้ทันที)
  const handleArchive = async (row: Row) => {
    setBannerError(null);
    const result = await archiveCategory(row.id);
    if ("error" in result) {
      setBannerError(result.error);
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== row.id));
  };

  // กู้คืน = ตั้ง archived_at เป็น null (ทำได้จาก sheet แก้หมวดที่ถูกซ่อน)
  const handleRestore = async (row: Row) => {
    setBannerError(null);
    const result = await restoreCategory(row.id);
    if ("error" in result) {
      setBannerError(result.error);
      return;
    }
    setItems((prev) => [...prev, toRow(result.data)].sort(byThaiName));
  };

  const income = items.filter((r) => r.kind === "income").sort(byThaiName);
  const expense = items.filter((r) => r.kind === "expense").sort(byThaiName);

  return (
    <div className="min-h-[100dvh] bg-bg pb-6">
      <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">หมวดหมู่</h1>
          <SmoothLink
            href="/settings"
            className="flex min-h-[44px] items-center text-sm text-text-muted"
          >
            กลับ
          </SmoothLink>
        </div>
      </header>

      {/* banner error ของการ archive/กู้คืน */}
      {bannerError && (
        <div className="px-4 pt-3" aria-live="polite">
          <div
            role="alert"
            className="rounded-[var(--radius-btn)] border border-expense px-4 py-2 text-sm text-expense"
          >
            {bannerError}
          </div>
        </div>
      )}

      {/* ─── สถานะ: error โหลดครั้งแรก ─── */}
      {!loaded && loadError ? (
        <div className="px-4 pt-10 text-center">
          <p className="text-text-muted">โหลดหมวดหมู่ไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-expense">{loadError}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 min-h-[44px] rounded-[var(--radius-btn)] border border-border bg-surface px-6 py-2 text-base"
          >
            ลองใหม่
          </button>
        </div>
      ) : reloading ? (
        /* ─── สถานะ: กำลังโหลด (skeleton) ─── */
        <div className="px-4 pt-4" aria-label="กำลังโหลด">
          <div className="mb-2 h-4 w-16 rounded bg-surface-2" />
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3 border-b border-border bg-surface px-3 py-3 last:border-b-0"
              >
                <span className="block size-10 rounded-full bg-surface-2" />
                <span className="block h-4 w-32 rounded bg-surface-2" />
              </li>
            ))}
          </ul>
        </div>
      ) : items.length === 0 ? (
        /* ─── สถานะ: ว่าง ─── */
        <div className="px-4 pt-8 text-center">
          <p className="mb-4 text-text-muted">
            ยังไม่มีหมวดหมู่ — เริ่มจากเพิ่มหมวดแรก
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => openAdd("expense")}
              className="min-h-[44px] rounded-[var(--radius-btn)] border border-border bg-surface px-5 py-2"
            >
              เพิ่มหมวดรายจ่าย
            </button>
            <button
              type="button"
              onClick={() => openAdd("income")}
              className="min-h-[44px] rounded-[var(--radius-btn)] border border-border bg-surface px-5 py-2"
            >
              เพิ่มหมวดรายรับ
            </button>
          </div>
        </div>
      ) : (
        /* ─── สถานะ: มีข้อมูล ─── */
        <>
          <KindSection
            title="รายรับ"
            rows={income}
            onEdit={openEdit}
            onArchive={handleArchive}
          />
          <KindSection
            title="รายจ่าย"
            rows={expense}
            onEdit={openEdit}
            onArchive={handleArchive}
          />
          <div className="flex gap-3 px-4 pt-4">
            <button
              type="button"
              onClick={() => openAdd("expense")}
              className="min-h-[44px] flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-4 py-2.5 text-base transition-colors hover:bg-surface-2"
            >
              + เพิ่มหมวดรายจ่าย
            </button>
            <button
              type="button"
              onClick={() => openAdd("income")}
              className="min-h-[44px] flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-4 py-2.5 text-base transition-colors hover:bg-surface-2"
            >
              + เพิ่มหมวดรายรับ
            </button>
          </div>
        </>
      )}

      {sheetOpen && (
        <CategorySheet
          kind={sheetKind}
          editing={editing}
          name={name}
          icon={icon}
          color={color}
          saving={saving}
          formError={formError}
          onKindChange={setSheetKind}
          onNameChange={setName}
          onIconChange={setIcon}
          onColorChange={setColor}
          onSave={handleSave}
          onClose={closeSheet}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}

// ─────────────────────── component ย่อย ───────────────────────

function KindSection({
  title,
  rows,
  onEdit,
  onArchive,
}: {
  title: string;
  rows: Row[];
  onEdit: (row: Row) => void;
  onArchive: (row: Row) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="px-4 pt-4">
      <h2 className="mb-2 text-sm font-medium text-text-muted">{title}</h2>
      <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 last:border-b-0"
          >
            <CategoryAvatar icon={row.icon} />
            <button
              type="button"
              onClick={() => onEdit(row)}
              className="min-h-[44px] min-w-0 flex-1 truncate text-left text-base"
            >
              {row.name}
            </button>
            <button
              type="button"
              onClick={() => onArchive(row)}
              aria-label={`ซ่อนหมวด ${row.name}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-text-muted"
            >
              <ArchiveGlyph />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** จุดสี/ไอคอนของหมวด — สีมาจาก suffix ที่เก็บในช่อง icon, ไม่มี icon = จุดเทา */
function CategoryAvatar({ icon }: { icon: string | null }) {
  const name = iconPart(icon);
  const suffix = colorSuffixPart(icon) ?? "graphite";

  if (name) {
    return (
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: colorVar(suffix), color: "#ffffff" }}
      >
        <CategoryIcon icon={name} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="block size-4 shrink-0 rounded-full"
      style={{ backgroundColor: colorVar(suffix) }}
    />
  );
}

function ArchiveGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

// ─── Bottom sheet: เพิ่ม/แก้หมวดหมู่ ───
function CategorySheet(props: {
  kind: Kind;
  editing: Row | null;
  name: string;
  icon: CategoryIconName | null;
  color: ColorSuffix;
  saving: boolean;
  formError: string | null;
  onKindChange: (k: Kind) => void;
  onNameChange: (v: string) => void;
  onIconChange: (i: CategoryIconName | null) => void;
  onColorChange: (c: ColorSuffix) => void;
  onSave: () => void;
  onClose: () => void;
  onRestore: (row: Row) => void;
}) {
  const nameId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={props.editing ? "แก้หมวดหมู่" : "เพิ่มหมวดหมู่"}
    >
      <button
        type="button"
        aria-label="ปิด"
        onClick={props.onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-[var(--radius-sheet)] bg-bg px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-2" />
        <h2 className="mb-4 text-lg font-semibold">
          {props.editing ? "แก้หมวดหมู่" : "เพิ่มหมวดหมู่"}
        </h2>

        {/* ชนิด — แสดงเฉพาะตอนเพิ่ม (แก้แล้วเปลี่ยน kind ไม่ได้ เพราะชื่อซ้ำผูกกับ kind) */}
        {!props.editing && (
          <div
            className="mb-4 flex gap-2"
            role="radiogroup"
            aria-label="ชนิดหมวดหมู่"
          >
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={props.kind === k}
                onClick={() => props.onKindChange(k)}
                className={`min-h-[44px] flex-1 rounded-[var(--radius-btn)] border px-4 py-2 ${
                  props.kind === k
                    ? "border-focus bg-focus/10"
                    : "border-border bg-surface"
                }`}
              >
                {k === "income" ? "รายรับ" : "รายจ่าย"}
              </button>
            ))}
          </div>
        )}

        {/* ชื่อ + error ใต้ช่อง (ห้าม alert) */}
        <label htmlFor={nameId} className="mb-1 block text-sm">
          ชื่อหมวดหมู่
        </label>
        <input
          id={nameId}
          autoFocus
          type="text"
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          maxLength={50}
          className="w-full rounded-[var(--radius-input)] border border-border bg-surface px-3 py-2.5"
        />
        {props.formError && (
          <p role="alert" className="mt-1 text-sm text-expense">
            {props.formError}
          </p>
        )}

        {/* ไอคอน */}
        <p className="mb-1 mt-4 text-sm">ไอคอน</p>
        <div
          className="grid grid-cols-5 gap-2"
          role="radiogroup"
          aria-label="ไอคอน"
        >
          {CATEGORY_ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              role="radio"
              aria-checked={props.icon === ic}
              onClick={() => props.onIconChange(props.icon === ic ? null : ic)}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-btn)] border px-2 py-2 ${
                props.icon === ic
                  ? "border-focus bg-focus/10"
                  : "border-border bg-surface"
              }`}
            >
              <CategoryIcon icon={ic} />
            </button>
          ))}
        </div>

        {/* สี — 8 สีกราฟจากโทเคน */}
        <p className="mb-1 mt-4 text-sm">สี</p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="สีจุดหมวดหมู่"
        >
          {COLOR_TOKENS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={props.color === c}
              aria-label={`สี${COLOR_LABELS[c]}`}
              onClick={() => props.onColorChange(c)}
              className={`flex h-[44px] w-[44px] items-center justify-center rounded-full border-2 ${
                props.color === c ? "border-focus" : "border-transparent"
              }`}
            >
              <span
                className="block size-6 rounded-full"
                style={{ backgroundColor: colorVar(c) }}
              />
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={props.onClose}
            className="min-h-[44px] rounded-[var(--radius-btn)] border border-border bg-surface px-4 py-2"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={props.onSave}
            disabled={props.saving}
            className="min-h-[44px] flex-1 rounded-[var(--radius-btn)] bg-balance px-4 py-2 text-white disabled:opacity-50"
          >
            {props.saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
