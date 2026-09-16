/**
 * URL params สำหรับ /transactions page
 * - filters = ค่า filter ที่เก็บใน URL (shareable/bookmarkable)
 * - month/year = เดือนที่กำลังดู (default = เดือนปัจจุบัน)
 */

export type TransactionFilters = {
  date_from?: string;
  date_to?: string;
  kind?: "income" | "expense" | "transfer";
  category_id?: string;
  account_id?: string;
  search?: string;
};

export type TransactionParams = {
  month: number | null;
  year: number | null;
  filters: TransactionFilters;
};

const VALID_KINDS = new Set(["income", "expense", "transfer"]);

/**
 * แปลง URL searchParams → TransactionParams
 */
export function parseTransactionParams(
  searchParams: URLSearchParams
): TransactionParams {
  const month = parseMonth(searchParams.get("month"));
  const year = parseYear(searchParams.get("year"));
  const filters = parseFilters(searchParams);
  return { month, year, filters };
}

/**
 * แปลง TransactionParams → URL searchParams
 */
export function buildTransactionParams(opts: {
  month?: number;
  year?: number;
  filters?: TransactionFilters;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (opts.month != null) params.set("month", String(opts.month));
  if (opts.year != null) params.set("year", String(opts.year));
  if (opts.filters) {
    const f = opts.filters;
    if (f.kind) params.set("kind", f.kind);
    if (f.category_id) params.set("category_id", f.category_id);
    if (f.account_id) params.set("account_id", f.account_id);
    if (f.search) params.set("search", f.search);
    if (f.date_from) params.set("date_from", f.date_from);
    if (f.date_to) params.set("date_to", f.date_to);
  }
  return params;
}

function parseMonth(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return n;
}

function parseYear(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
  return n;
}

function parseFilters(sp: URLSearchParams): TransactionFilters {
  const filters: TransactionFilters = {};

  const kind = sp.get("kind");
  if (kind && VALID_KINDS.has(kind)) {
    filters.kind = kind as TransactionFilters["kind"];
  }

  const category_id = sp.get("category_id");
  if (category_id) filters.category_id = category_id;

  const account_id = sp.get("account_id");
  if (account_id) filters.account_id = account_id;

  const search = sp.get("search")?.trim();
  if (search) filters.search = search;

  const date_from = sp.get("date_from");
  if (date_from) filters.date_from = date_from;

  const date_to = sp.get("date_to");
  if (date_to) filters.date_to = date_to;

  return filters;
}
