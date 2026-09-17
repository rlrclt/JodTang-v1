import { listCategories } from "@/app/actions/categories";
import CategoriesScreen from "./CategoriesScreen";

export const dynamic = "force-dynamic";

export default async function SettingsCategoriesPage() {
  const result = await listCategories();

  if ("error" in result) {
    return <CategoriesScreen initialError={result.error} />;
  }
  return <CategoriesScreen initialCategories={result.data} />;
}
