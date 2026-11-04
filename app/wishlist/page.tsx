import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Your saved plants.",
};

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        eyebrow="Wishlist"
        title={
          <>
            Plants you&apos;ve <em className="text-forest-600">fallen for</em>
          </>
        }
        description="Saved on this device so you can come back to them any time."
      />
      <div className="container-page py-14 sm:py-20">
        <WishlistView />
      </div>
    </>
  );
}
