import { connection } from "next/server";
import { Suspense } from "react";
import { CategoryManager } from "@/components/admin/category-manager";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/auth";
import { getFreshCatalog } from "@/lib/server/catalog";

export const metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={6} />}>
      <Categories />
    </Suspense>
  );
}

async function Categories() {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const { categories, products } = await getFreshCatalog(true);
  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    short: c.short,
    description: c.description,
    image: c.image,
    imageAlt: c.imageAlt,
    productCount: products.filter((p) => p.categories.includes(c.id)).length,
  }));
  return (
    <>
      <AdminPageHeader title="Categories" description="Collections shown in the shop menu and filters." />
      <CategoryManager categories={rows} />
    </>
  );
}
