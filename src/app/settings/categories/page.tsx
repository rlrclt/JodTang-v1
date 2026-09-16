import { listCategories } from "@/app/actions/categories";
import CategoriesScreen from "./CategoriesScreen";

export const dynamic = "force-dynamic";

export default async function SettingsCategoriesPage() {
  // โหลดครั้งแรกฝั่ง server — หลังจากนี้ client ทำงานต่อโดยไม่ reload หน้า
  // listCategories คืน { data } | { error } เท่านั้น (ไม่ throw)
  const result = await listCategories();

  if ("error" in result) {
    return <CategoriesScreen initialError={result.error} />;
  }
  return <CategoriesScreen initialCategories={result.data} />;
}
