import { Hero } from "@/components/home/hero";
import { MarqueeBand } from "@/components/home/marquee-band";
import { BestsellersRail, NewArrivalsRail } from "@/components/home/home-rails";
import { PlantShowcase } from "@/components/home/plant-showcase";
import { Testimonials } from "@/components/home/testimonials";
import { PlantClubPromo, PromiseSection } from "@/components/home/promo-banner";
import { GiftCollections } from "@/components/home/gift-collections";
import { PetFriendly } from "@/components/home/pet-friendly";
import { FestiveEdit } from "@/components/home/festive-edit";
import { CareEditorial } from "@/components/home/care-editorial";
import { CollectionGallery } from "@/components/home/collection-gallery";
import { HomeNewsletter } from "@/components/home/home-newsletter";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MarqueeBand />
      <BestsellersRail />
      <PlantShowcase />
      <Testimonials />
      <PlantClubPromo />
      <NewArrivalsRail />
      <GiftCollections />
      <PetFriendly />
      <FestiveEdit />
      <CareEditorial />
      <PromiseSection />
      <CollectionGallery />
      <HomeNewsletter />
    </>
  );
}
