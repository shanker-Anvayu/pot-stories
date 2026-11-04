import { connection } from "next/server";
import { Suspense } from "react";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { AdminPageHeader, AdminSkeleton } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/server/auth";
import { getFreshCatalog } from "@/lib/server/catalog";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<AdminSkeleton rows={12} />}>
      <NewProduct />
    </Suspense>
  );
}

async function NewProduct() {
  // Admin data is always per-request; opt out of prerendering before the session read.
  await connection();
  await requireAdminPage();
  const { categories } = await getFreshCatalog(true);
  return (
    <>
      <AdminPageHeader
        title="New product"
        description="New products start hidden. Switch on “Active” when it’s ready for the store."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm initial={EMPTY_PRODUCT} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
