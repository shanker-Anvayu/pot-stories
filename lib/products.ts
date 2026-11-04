/**
 * DEMONSTRATION CATALOGUE
 * Product names, prices and descriptions below are sample content for the
 * Pot Stories frontend demo. They are not live inventory or real offers.
 * Photography: Unsplash (https://unsplash.com/license) — replace with brand
 * photography before launch.
 */

export const unsplash = (id: string) => `https://images.unsplash.com/${id}`;

export type CategoryId =
  | "indoor"
  | "outdoor"
  | "succulents"
  | "hanging"
  | "bonsai"
  | "herbs"
  | "kits";

export type Light = "low" | "medium" | "bright";
export type CareLevel = "easy" | "moderate" | "expert";
export type Size = "small" | "medium" | "large";
export type Tag =
  | "bestseller"
  | "new"
  | "pet-friendly"
  | "low-light"
  | "beginner"
  | "flowering"
  | "statement"
  | "gift"
  | "festive";

export interface SizeOption {
  id: string;
  label: string;
  detail: string;
  /** Added to the base price. */
  priceDelta: number;
}

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface Product {
  slug: string;
  name: string;
  botanical: string;
  categories: CategoryId[];
  tags: Tag[];
  price: number;
  compareAtPrice?: number;
  image: string;
  imageAlt: string;
  gallery: { src: string; alt: string }[];
  light: Light;
  care: CareLevel;
  size: Size;
  height: string;
  water: string;
  petFriendly: boolean;
  /** Plants can be paired with a decorative pot; kits cannot. */
  potOptions: boolean;
  /** Optional plant sizes; the first option is the default. */
  sizeOptions?: SizeOption[];
  shortDescription: string;
  description: string;
  careNotes: string[];
}

export const categories: Category[] = [
  {
    id: "indoor",
    name: "Indoor Plants",
    short: "Indoor",
    description: "Leafy companions for living rooms, desks and bright corners.",
    image: unsplash("photo-1530968464165-7a1861cbaf9f"),
    imageAlt: "Shelves of potted houseplants and trailing vines in a sunny room",
  },
  {
    id: "outdoor",
    name: "Outdoor Plants",
    short: "Outdoor",
    description: "Hardy greens for balconies, terraces and garden beds.",
    image: unsplash("photo-1557429287-b2e26467fc2b"),
    imageAlt: "A cottage garden overflowing with flowering shrubs",
  },
  {
    id: "succulents",
    name: "Succulents & Cacti",
    short: "Succulents",
    description: "Sculptural, sun-loving and wonderfully forgiving.",
    image: unsplash("photo-1446071103084-c257b5f70672"),
    imageAlt: "A dense carpet of blue-green echeveria rosettes",
  },
  {
    id: "hanging",
    name: "Hanging & Trailing",
    short: "Trailing",
    description: "Cascading vines for shelves, ledges and hanging planters.",
    image: unsplash("photo-1595524147656-eb5d0a63e9a9"),
    imageAlt: "Close-up of glossy heart-shaped pothos leaves",
  },
  {
    id: "bonsai",
    name: "Bonsai",
    short: "Bonsai",
    description: "Living miniatures, shaped slowly and patiently.",
    image: unsplash("photo-1512428813834-c702c7702b78"),
    imageAlt: "A ficus ginseng bonsai in a small white pot",
  },
  {
    id: "herbs",
    name: "Herbs & Edibles",
    short: "Herbs",
    description: "Fragrant, useful plants for the kitchen windowsill.",
    image: unsplash("photo-1618375569909-3c8616cf7733"),
    imageAlt: "A young sweet basil plant with bright green leaves",
  },
  {
    id: "kits",
    name: "Seeds & Kits",
    short: "Kits",
    description: "Everything you need to sow, pot and grow.",
    image: unsplash("photo-1523348837708-15d4a09cfac2"),
    imageAlt: "Seedlings sprouting in small black nursery pots",
  },
];

export const potOptions = [
  { id: "grower", label: "Grower pot", note: "Recyclable nursery pot", price: 0, swatch: "#2b2b2b" },
  { id: "terracotta", label: "Terracotta", note: "Hand-thrown, breathable clay", price: 249, swatch: "#b4693f" },
  { id: "ceramic", label: "Ivory ceramic", note: "Matte glaze with saucer", price: 449, swatch: "#efe9dc" },
] as const;

export type PotOptionId = (typeof potOptions)[number]["id"];

export const products: Product[] = [
  {
    slug: "monstera-deliciosa",
    name: "Monstera Deliciosa",
    botanical: "Monstera deliciosa",
    categories: ["indoor"],
    tags: ["bestseller", "statement", "beginner", "gift"],
    price: 1499,
    compareAtPrice: 1799,
    image: unsplash("photo-1614594975525-e45190c55d0b"),
    imageAlt: "A Monstera deliciosa with split leaves in a white pot",
    gallery: [
      { src: unsplash("photo-1545241047-6083a3684587"), alt: "Monstera on a wooden stool beside a white chair" },
      { src: unsplash("photo-1545165375-1b744b9ed444"), alt: "Close-up of a fenestrated monstera leaf" },
    ],
    light: "bright",
    care: "easy",
    size: "large",
    height: "70–90 cm with pot",
    water: "When the top 5 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "medium", label: "Medium", detail: "6″ pot · 60–70 cm", priceDelta: 0 },
      { id: "large", label: "Large", detail: "8″ pot · 90–110 cm", priceDelta: 1200 },
    ],
    shortDescription: "The iconic split-leaf statement plant.",
    description:
      "Few plants change a room like a Monstera. Its glossy, deeply split leaves unfurl one by one, each a little larger than the last. Give it bright, indirect light and something to climb, and it will happily grow alongside you for years.",
    careNotes: [
      "Bright, indirect light; avoid harsh afternoon sun",
      "Wipe leaves monthly to keep them glossy",
      "Add a moss pole as it matures for larger leaves",
    ],
  },
  {
    slug: "snake-plant-laurentii",
    name: "Snake Plant ‘Laurentii’",
    botanical: "Dracaena trifasciata",
    categories: ["indoor"],
    tags: ["bestseller", "low-light", "beginner", "gift", "festive"],
    price: 899,
    image: unsplash("photo-1611211232932-da3113c5b960"),
    imageAlt: "A snake plant with yellow-edged upright leaves in a white pot",
    gallery: [
      { src: unsplash("photo-1604762524889-3e2fcc145683"), alt: "Houseplants lined up on a white sideboard" },
    ],
    light: "low",
    care: "easy",
    size: "medium",
    height: "45–55 cm with pot",
    water: "Every 2–3 weeks; let soil dry fully",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "small", label: "Small", detail: "4″ pot · 30–35 cm", priceDelta: 0 },
      { id: "medium", label: "Medium", detail: "6″ pot · 45–55 cm", priceDelta: 400 },
      { id: "large", label: "Large", detail: "8″ pot · 70–80 cm", priceDelta: 1100 },
    ],
    shortDescription: "Architectural, upright and almost unflappable.",
    description:
      "Upright, sword-like leaves edged in buttery yellow make the Laurentii a crisp, graphic presence. It tolerates lower light and infrequent watering, which makes it a natural first plant and a reliable choice for bedrooms and hallways.",
    careNotes: [
      "Tolerates low light; grows faster in bright, indirect light",
      "Overwatering is the main risk — err on the dry side",
      "Repot only when roots crowd the pot",
    ],
  },
  {
    slug: "snake-plant-zeylanica",
    name: "Snake Plant ‘Zeylanica’",
    botanical: "Dracaena zeylanica",
    categories: ["indoor"],
    tags: ["new", "low-light", "beginner"],
    price: 1099,
    image: unsplash("photo-1620127252536-03bdfcf6d5c3"),
    imageAlt: "A snake plant with banded leaves in a blush pink pot",
    gallery: [],
    light: "low",
    care: "easy",
    size: "medium",
    height: "40–50 cm with pot",
    water: "Every 2–3 weeks; let soil dry fully",
    petFriendly: false,
    potOptions: true,
    shortDescription: "Silver-banded leaves with a softer silhouette.",
    description:
      "Zeylanica has darker, silver-banded foliage that reads almost like brushwork. It shares the snake plant's easy-going nature, thriving on a little neglect in spots most plants would find too dim.",
    careNotes: [
      "Happy in low to bright, indirect light",
      "Water sparingly, especially in winter",
      "Use a free-draining, gritty potting mix",
    ],
  },
  {
    slug: "zz-plant",
    name: "ZZ Plant",
    botanical: "Zamioculcas zamiifolia",
    categories: ["indoor"],
    tags: ["bestseller", "low-light", "beginner", "gift"],
    price: 1199,
    image: unsplash("photo-1632207691143-643e2a9a9361"),
    imageAlt: "A ZZ plant with glossy dark leaves held in a white pot",
    gallery: [],
    light: "low",
    care: "easy",
    size: "medium",
    height: "45–60 cm with pot",
    water: "Every 2–3 weeks; let soil dry",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "medium", label: "Medium", detail: "6″ pot · 45–60 cm", priceDelta: 0 },
      { id: "large", label: "Large", detail: "8″ pot · 70–80 cm", priceDelta: 900 },
    ],
    shortDescription: "Waxy, glossy stems that shrug off low light.",
    description:
      "The ZZ stores water in thick underground rhizomes, so it copes with irregular watering and low light better than most. Its waxy, almost lacquered leaves bring a polished, sculptural feel to offices and darker corners.",
    careNotes: [
      "Tolerates low light; avoid direct midday sun",
      "Water only when the soil has dried completely",
      "Slow-growing — repot every two to three years",
    ],
  },
  {
    slug: "fiddle-leaf-fig",
    name: "Fiddle Leaf Fig",
    botanical: "Ficus lyrata",
    categories: ["indoor"],
    tags: ["statement"],
    price: 2299,
    image: unsplash("photo-1453904300235-0f2f60b15b5d"),
    imageAlt: "A young fiddle leaf fig with large violin-shaped leaves",
    gallery: [],
    light: "bright",
    care: "moderate",
    size: "large",
    height: "90–110 cm with pot",
    water: "When the top 5 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "medium", label: "Medium", detail: "8″ pot · 90–110 cm", priceDelta: 0 },
      { id: "tall", label: "Tall", detail: "10″ pot · 140–160 cm", priceDelta: 1500 },
    ],
    shortDescription: "Broad, violin-shaped leaves on a slender trunk.",
    description:
      "The Fiddle Leaf Fig is the designer's favourite for good reason: big, veined leaves held on an elegant stem. It rewards a consistent routine — a bright spot near a window, steady watering and as few moves as possible.",
    careNotes: [
      "Bright light near a window; rotate quarterly",
      "Keep away from draughts and air-conditioning vents",
      "Dislikes being moved — pick its spot and let it settle",
    ],
  },
  {
    slug: "rubber-plant-robusta",
    name: "Rubber Plant ‘Robusta’",
    botanical: "Ficus elastica",
    categories: ["indoor"],
    tags: ["beginner", "festive"],
    price: 999,
    image: unsplash("photo-1501004318641-b39e6451bec6"),
    imageAlt: "A rubber plant stem with glossy oval leaves against a white wall",
    gallery: [
      { src: unsplash("photo-1477554193778-9562c28588c0"), alt: "Soft green ficus leaves in diffused light" },
    ],
    light: "medium",
    care: "easy",
    size: "medium",
    height: "50–60 cm with pot",
    water: "When the top 3–5 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "medium", label: "Medium", detail: "6″ pot · 50–60 cm", priceDelta: 0 },
      { id: "large", label: "Large", detail: "8″ pot · 80–90 cm", priceDelta: 800 },
    ],
    shortDescription: "Glossy, deep-green leaves with an easy temperament.",
    description:
      "Robusta grows broad, leathery leaves that catch the light beautifully. It is forgiving, quick to establish and easy to shape — pinch the top to encourage a fuller, bushier plant.",
    careNotes: [
      "Medium to bright, indirect light",
      "Wipe leaves to keep them dust-free",
      "Prune in spring to encourage branching",
    ],
  },
  {
    slug: "peace-lily",
    name: "Peace Lily",
    botanical: "Spathiphyllum wallisii",
    categories: ["indoor"],
    tags: ["bestseller", "flowering", "low-light", "gift", "festive"],
    price: 799,
    image: unsplash("photo-1593691509543-c55fb32d8de5"),
    imageAlt: "White peace lily flowers among dark green leaves",
    gallery: [],
    light: "low",
    care: "easy",
    size: "medium",
    height: "40–50 cm with pot",
    water: "Weekly; it droops when thirsty",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "medium", label: "Medium", detail: "6″ pot · 40–50 cm", priceDelta: 0 },
      { id: "large", label: "Large", detail: "8″ pot · 60–70 cm", priceDelta: 600 },
    ],
    shortDescription: "Elegant white blooms that tell you when they're thirsty.",
    description:
      "The Peace Lily pairs lush, arching leaves with pure white spathes that appear through much of the year. It visibly droops when it needs water and perks up within hours — a gentle teacher for new plant parents.",
    careNotes: [
      "Low to medium, indirect light",
      "Keep soil lightly moist; water when leaves begin to droop",
      "Trim spent flowers at the base",
    ],
  },
  {
    slug: "golden-pothos",
    name: "Golden Pothos",
    botanical: "Epipremnum aureum",
    categories: ["indoor", "hanging"],
    tags: ["bestseller", "low-light", "beginner", "gift"],
    price: 649,
    image: unsplash("photo-1598880940080-ff9a29891b85"),
    imageAlt: "Golden pothos trailing from a white pot on a hanging shelf",
    gallery: [
      { src: unsplash("photo-1595524147656-eb5d0a63e9a9"), alt: "Close-up of marbled pothos leaves" },
    ],
    light: "low",
    care: "easy",
    size: "small",
    height: "Trails 30–40 cm",
    water: "When the top 3 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    sizeOptions: [
      { id: "small", label: "Small", detail: "4″ pot · trails 30 cm", priceDelta: 0 },
      { id: "medium", label: "Medium", detail: "6″ pot · trails 50 cm", priceDelta: 300 },
    ],
    shortDescription: "Gold-marbled vines that trail with abandon.",
    description:
      "Pothos is the definition of easy-going. Its heart-shaped, gold-splashed leaves trail from shelves or climb a trellis, and cuttings root readily in a glass of water — perfect for sharing.",
    careNotes: [
      "Low to bright, indirect light; variegation is richer in brighter spots",
      "Trim long vines to keep it full",
      "Propagate cuttings in water",
    ],
  },
  {
    slug: "heartleaf-philodendron",
    name: "Heartleaf Philodendron",
    botanical: "Philodendron hederaceum",
    categories: ["indoor", "hanging"],
    tags: ["beginner", "low-light"],
    price: 749,
    image: unsplash("photo-1600411833196-7c1f6b1a8b90"),
    imageAlt: "A heartleaf philodendron spilling out of a white hanging planter",
    gallery: [],
    light: "medium",
    care: "easy",
    size: "small",
    height: "Trails 30–45 cm",
    water: "When the top 3 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    shortDescription: "Soft, heart-shaped leaves on cascading stems.",
    description:
      "A classic trailing plant with velvety, heart-shaped leaves. It grows quickly in medium light and looks especially lovely tumbling from a high shelf or hanging planter.",
    careNotes: [
      "Medium, indirect light; tolerates lower light",
      "Keep soil evenly moist but never soggy",
      "Pinch tips to encourage bushier growth",
    ],
  },
  {
    slug: "neon-pothos-starter",
    name: "Neon Pothos Starter",
    botanical: "Epipremnum aureum ‘Neon’",
    categories: ["indoor", "hanging"],
    tags: ["new", "beginner"],
    price: 349,
    image: unsplash("photo-1591958911259-bee2173bdccc"),
    imageAlt: "A young neon pothos with chartreuse leaves in a dark nursery pot",
    gallery: [],
    light: "medium",
    care: "easy",
    size: "small",
    height: "15–20 cm",
    water: "When the top 3 cm of soil is dry",
    petFriendly: false,
    potOptions: true,
    shortDescription: "A young plant in electric chartreuse.",
    description:
      "Neon Pothos glows with bright lime-green leaves that light up shelves and desks. This starter-size plant is an affordable way to begin a trailing collection.",
    careNotes: [
      "Medium to bright, indirect light keeps the colour vivid",
      "Water when the top of the soil dries out",
      "Feed monthly in the growing season",
    ],
  },
  {
    slug: "calathea-lancifolia",
    name: "Calathea Lancifolia",
    botanical: "Goeppertia insignis",
    categories: ["indoor"],
    tags: ["pet-friendly", "festive"],
    price: 1149,
    image: unsplash("photo-1602923668104-8f9e03e77e62"),
    imageAlt: "A calathea lancifolia with patterned wavy leaves, roots exposed",
    gallery: [],
    light: "medium",
    care: "moderate",
    size: "medium",
    height: "40–50 cm with pot",
    water: "Keep soil lightly moist",
    petFriendly: true,
    potOptions: true,
    shortDescription: "Wavy, patterned leaves with a burgundy underside.",
    description:
      "Sometimes called the rattlesnake plant, this calathea has long, rippled leaves painted with dark green ovals. Its leaves lift and fold with the light through the day — a quiet, living rhythm in your room.",
    careNotes: [
      "Medium, indirect light; direct sun fades the pattern",
      "Prefers humidity — group with other plants",
      "Use filtered or rested tap water if tips brown",
    ],
  },
  {
    slug: "red-prayer-plant",
    name: "Red Prayer Plant",
    botanical: "Maranta leuconeura ‘Erythroneura’",
    categories: ["indoor", "hanging"],
    tags: ["pet-friendly", "new", "gift"],
    price: 849,
    image: unsplash("photo-1637967886160-fd78dc3ce3f5"),
    imageAlt: "A prayer plant leaf with red herringbone veins",
    gallery: [],
    light: "medium",
    care: "moderate",
    size: "small",
    height: "25–30 cm with pot",
    water: "Keep soil lightly moist",
    petFriendly: true,
    potOptions: true,
    shortDescription: "Red herringbone veins on velvet-green leaves.",
    description:
      "The Red Prayer Plant folds its leaves upward each evening, like hands in prayer. Striking red veins over layered greens make it one of the most graphic foliage plants you can grow indoors.",
    careNotes: [
      "Medium, indirect light",
      "Enjoys humidity and evenly moist soil",
      "Trim leggy stems to keep it compact",
    ],
  },
  {
    slug: "spider-plant",
    name: "Spider Plant",
    botanical: "Chlorophytum comosum",
    categories: ["indoor", "hanging"],
    tags: ["pet-friendly", "beginner", "bestseller", "gift"],
    price: 549,
    image: unsplash("photo-1572688484438-313a6e50c333"),
    imageAlt: "A variegated spider plant on a slim grey console table",
    gallery: [],
    light: "medium",
    care: "easy",
    size: "small",
    height: "25–35 cm with pot",
    water: "When the top 3 cm of soil is dry",
    petFriendly: true,
    potOptions: true,
    sizeOptions: [
      { id: "small", label: "Small", detail: "4″ pot", priceDelta: 0 },
      { id: "medium", label: "Medium", detail: "6″ pot", priceDelta: 250 },
    ],
    shortDescription: "Arching striped leaves and easy little plantlets.",
    description:
      "A cheerful, fountain-shaped plant with cream-striped leaves. Mature plants send out baby plantlets on long stems that you can pot up and pass on to friends.",
    careNotes: [
      "Bright to medium, indirect light",
      "Tolerates the occasional missed watering",
      "Pot up plantlets once they show roots",
    ],
  },
  {
    slug: "lucky-bamboo",
    name: "Lucky Bamboo",
    botanical: "Dracaena sanderiana",
    categories: ["indoor"],
    tags: ["beginner", "low-light", "gift", "festive"],
    price: 449,
    image: unsplash("photo-1567331711402-509c12c41959"),
    imageAlt: "Tall lucky bamboo stems with ribbon-like leaves",
    gallery: [],
    light: "low",
    care: "easy",
    size: "medium",
    height: "40–60 cm",
    water: "Top up water weekly; refresh monthly",
    petFriendly: false,
    potOptions: false,
    shortDescription: "Slender, segmented stems grown in water.",
    description:
      "Lucky Bamboo grows happily in a vessel of water and pebbles, making it one of the simplest plants to keep. Its tall, segmented stems bring a calm vertical line to desks and shelves.",
    careNotes: [
      "Low to medium, indirect light",
      "Keep roots covered with clean water",
      "Use filtered water if leaf tips yellow",
    ],
  },
  {
    slug: "ficus-ginseng-bonsai",
    name: "Ficus Ginseng Bonsai",
    botanical: "Ficus microcarpa",
    categories: ["indoor", "bonsai"],
    tags: ["beginner", "bestseller", "gift", "festive"],
    price: 1349,
    image: unsplash("photo-1512428813834-c702c7702b78"),
    imageAlt: "A ficus ginseng bonsai with a sculpted root trunk in a white pot",
    gallery: [],
    light: "bright",
    care: "moderate",
    size: "small",
    height: "25–30 cm",
    water: "When the soil surface feels dry",
    petFriendly: false,
    potOptions: false,
    shortDescription: "A sculptural root trunk under a tidy canopy.",
    description:
      "With its swollen, sculptural roots and compact canopy, the Ficus Ginseng is a wonderful introduction to bonsai. It is more forgiving than most and grows well indoors in a bright spot.",
    careNotes: [
      "Bright, indirect light; morning sun is welcome",
      "Water thoroughly, then let the surface dry",
      "Trim new shoots back to two leaves to keep its shape",
    ],
  },
  {
    slug: "juniper-bonsai",
    name: "Juniper Bonsai",
    botanical: "Juniperus procumbens ‘Nana’",
    categories: ["outdoor", "bonsai"],
    tags: ["statement"],
    price: 3499,
    image: unsplash("photo-1526397751294-331021109fbd"),
    imageAlt: "A juniper bonsai with layered foliage pads in a stone pot",
    gallery: [],
    light: "bright",
    care: "expert",
    size: "medium",
    height: "30–40 cm",
    water: "Daily in summer; check soil each morning",
    petFriendly: false,
    potOptions: false,
    shortDescription: "Layered foliage pads with an aged, windswept form.",
    description:
      "The Juniper is the classic outdoor bonsai, with dense, needle-like foliage that can be shaped over years into graceful layered pads. It needs sunshine, fresh air and a seasonal rhythm — this is a plant for the patient grower.",
    careNotes: [
      "Keep outdoors in full sun to partial shade",
      "Never let the root ball dry out completely",
      "Pinch and prune during the growing season",
    ],
  },
  {
    slug: "zebra-haworthia",
    name: "Zebra Haworthia",
    botanical: "Haworthiopsis attenuata",
    categories: ["indoor", "succulents"],
    tags: ["pet-friendly", "beginner", "bestseller", "gift"],
    price: 399,
    image: unsplash("photo-1485955900006-10f4d324d411"),
    imageAlt: "A striped zebra haworthia succulent in a mint green pot",
    gallery: [],
    light: "medium",
    care: "easy",
    size: "small",
    height: "10–15 cm with pot",
    water: "Every 2–3 weeks; less in winter",
    petFriendly: true,
    potOptions: true,
    shortDescription: "A pocket-sized succulent with white striped leaves.",
    description:
      "Compact, striped and endlessly charming, the Zebra Haworthia suits desks and windowsills where space is tight. Unlike many succulents, it is content with bright, indirect light.",
    careNotes: [
      "Bright, indirect light; avoid harsh afternoon sun",
      "Water deeply, then allow soil to dry completely",
      "Use a gritty cactus and succulent mix",
    ],
  },
  {
    slug: "aloe-vera",
    name: "Aloe Vera",
    botanical: "Aloe barbadensis miller",
    categories: ["indoor", "outdoor", "succulents"],
    tags: ["beginner"],
    price: 449,
    image: unsplash("photo-1509423350716-97f9360b4e09"),
    imageAlt: "A spiky, speckled aloe in a concrete pot",
    gallery: [],
    light: "bright",
    care: "easy",
    size: "small",
    height: "25–30 cm with pot",
    water: "Every 2–3 weeks; let soil dry fully",
    petFriendly: false,
    potOptions: true,
    shortDescription: "Plump, architectural leaves for a sunny sill.",
    description:
      "A sun-loving succulent with fleshy, upright leaves. Aloe thrives on a bright windowsill or a sheltered balcony and asks for very little beyond good drainage.",
    careNotes: [
      "Bright light with some direct sun",
      "Water deeply but infrequently",
      "Protect from heavy monsoon rain outdoors",
    ],
  },
  {
    slug: "blue-columnar-cactus",
    name: "Blue Columnar Cactus",
    botanical: "Pilosocereus azureus",
    categories: ["outdoor", "succulents"],
    tags: ["new"],
    price: 599,
    image: unsplash("photo-1459411552884-841db9b3cc2a"),
    imageAlt: "A blue-green columnar cactus in an orange pot against a pink wall",
    gallery: [],
    light: "bright",
    care: "easy",
    size: "small",
    height: "20–25 cm with pot",
    water: "Every 3–4 weeks; dry between waterings",
    petFriendly: false,
    potOptions: true,
    shortDescription: "Powder-blue ribs with golden spines.",
    description:
      "A cactus with a beautiful frosted blue skin that deepens in strong light. Give it your sunniest spot — a south-facing sill or balcony — and water sparingly.",
    careNotes: [
      "Full sun is ideal",
      "Water sparingly; never let it sit in water",
      "Handle with care — wear gloves when repotting",
    ],
  },
  {
    slug: "flowering-ball-cactus",
    name: "Flowering Ball Cactus",
    botanical: "Cactaceae, assorted",
    categories: ["indoor", "succulents"],
    tags: ["flowering"],
    price: 499,
    image: unsplash("photo-1509937528035-ad76254b0356"),
    imageAlt: "A round cactus topped with a magenta flower in a white pot",
    gallery: [],
    light: "bright",
    care: "easy",
    size: "small",
    height: "12–15 cm with pot",
    water: "Every 2–3 weeks; dry between waterings",
    petFriendly: false,
    potOptions: true,
    shortDescription: "A compact globe crowned with seasonal blooms.",
    description:
      "A neat, globe-shaped cactus that can produce vivid blooms in the right conditions. Bright light and a cool, dry rest in winter give it the best chance of flowering.",
    careNotes: [
      "Bright light with a few hours of sun",
      "Reduce watering in winter",
      "Use a fast-draining cactus mix",
    ],
  },
  {
    slug: "boxwood-topiary",
    name: "Boxwood Ball Topiary",
    botanical: "Buxus sempervirens",
    categories: ["outdoor"],
    tags: ["statement", "festive"],
    price: 2799,
    image: unsplash("photo-1520412099551-62b6bafeb5bb"),
    imageAlt: "A boxwood topiary standard with a rounded crown in a green pot",
    gallery: [],
    light: "bright",
    care: "moderate",
    size: "large",
    height: "70–80 cm with pot",
    water: "Two to three times a week in warm weather",
    petFriendly: false,
    potOptions: false,
    shortDescription: "A clipped, formal crown for entrances and terraces.",
    description:
      "A crisp, clipped standard that brings structure to doorways, balconies and terraces. Pair two either side of an entrance for a timeless, symmetrical welcome.",
    careNotes: [
      "Full sun to partial shade",
      "Keep soil consistently moist in summer",
      "Trim lightly two or three times a year",
    ],
  },
  {
    slug: "sweet-basil",
    name: "Sweet Basil",
    botanical: "Ocimum basilicum",
    categories: ["outdoor", "herbs"],
    tags: ["pet-friendly", "beginner", "new"],
    price: 249,
    image: unsplash("photo-1618375569909-3c8616cf7733"),
    imageAlt: "A young sweet basil plant in a terracotta pot",
    gallery: [],
    light: "bright",
    care: "easy",
    size: "small",
    height: "20–25 cm with pot",
    water: "Keep soil evenly moist",
    petFriendly: true,
    potOptions: true,
    shortDescription: "Fragrant leaves for pesto, salads and more.",
    description:
      "A sunny-windowsill essential. Pinch off the top leaves regularly and your basil will grow bushier and more productive — the more you harvest, the more it gives.",
    careNotes: [
      "At least 5–6 hours of sun",
      "Pinch out flower buds to prolong leaf growth",
      "Harvest from the top, just above a leaf pair",
    ],
  },
  {
    slug: "succulent-trio",
    name: "Succulent Trio",
    botanical: "Echeveria & Haworthia, assorted",
    categories: ["indoor", "succulents"],
    tags: ["beginner", "gift", "festive"],
    price: 749,
    image: unsplash("photo-1459156212016-c812468e2115"),
    imageAlt: "Three small succulents in terracotta pots seen from above",
    gallery: [],
    light: "bright",
    care: "easy",
    size: "small",
    height: "8–12 cm each",
    water: "Every 2–3 weeks",
    petFriendly: false,
    potOptions: false,
    shortDescription: "Three sculptural minis, ready to gift.",
    description:
      "A hand-picked trio of compact succulents in terracotta pots. Varieties change with the season, so every trio is a little different.",
    careNotes: [
      "Bright light with some direct sun",
      "Water deeply, then let soil dry completely",
      "Group together on a sunny sill",
    ],
  },
  {
    slug: "heirloom-seed-starter-kit",
    name: "Heirloom Seed Starter Kit",
    botanical: "Kit · seeds, mix & pots",
    categories: ["kits", "herbs"],
    tags: ["new", "beginner", "gift"],
    price: 699,
    image: unsplash("photo-1523348837708-15d4a09cfac2"),
    imageAlt: "Seedlings sprouting in a tray of small black pots",
    gallery: [
      { src: unsplash("photo-1530836369250-ef72a3f5cda8"), alt: "Hands pressing seedlings into a seed tray" },
    ],
    light: "bright",
    care: "easy",
    size: "small",
    height: "Kit",
    water: "Mist daily until seedlings emerge",
    petFriendly: false,
    potOptions: false,
    shortDescription: "Sow your own herbs from seed.",
    description:
      "Everything you need to start a small herb garden from seed: biodegradable pots, a light seed-starting mix and a selection of easy herbs, with a step-by-step sowing guide.",
    careNotes: [
      "Sow on a warm, bright windowsill",
      "Keep the mix moist, not wet, until germination",
      "Thin seedlings once true leaves appear",
    ],
  },
  {
    slug: "essential-repotting-kit",
    name: "Essential Repotting Kit",
    botanical: "Kit · trowel, mix & shears",
    categories: ["kits"],
    tags: [],
    price: 899,
    image: unsplash("photo-1416879595882-3373a0480b5b"),
    imageAlt: "A sage green trowel scooping rich potting mix",
    gallery: [],
    light: "medium",
    care: "easy",
    size: "small",
    height: "Kit",
    water: "—",
    petFriendly: false,
    potOptions: false,
    shortDescription: "The tools for a calm, mess-free repot.",
    description:
      "A compact trowel, precision shears and a bag of airy aroid-friendly potting mix — the essentials for giving a root-bound plant a new home.",
    careNotes: [
      "Repot in spring or early summer",
      "Go up only one pot size at a time",
      "Water thoroughly after repotting",
    ],
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

export const categoryById = (id: CategoryId) => categories.find((c) => c.id === id);

export const productsInCategory = (id: CategoryId) =>
  products.filter((p) => p.categories.includes(id));

export const lightLabel: Record<Light, string> = {
  low: "Low light",
  medium: "Medium light",
  bright: "Bright light",
};

export const careLabel: Record<CareLevel, string> = {
  easy: "Easy care",
  moderate: "Some attention",
  expert: "Experienced",
};

export const sizeLabel: Record<Size, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const tagLabel: Record<Tag, string> = {
  bestseller: "Bestseller",
  new: "New",
  "pet-friendly": "Pet friendly",
  "low-light": "Low-light tolerant",
  beginner: "Beginner friendly",
  flowering: "Flowering",
  statement: "Statement plant",
  gift: "Giftable",
  festive: "Festive edit",
};

export function relatedProducts<T extends Product>(product: T, count = 4, pool: T[]): T[] {
  const scored = pool
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({
      p,
      score:
        p.categories.filter((c) => product.categories.includes(c)).length * 2 +
        p.tags.filter((t) => product.tags.includes(t)).length +
        (p.light === product.light ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.p);
}

export const sizeOptionFor = (product: Product, sizeId: string | null | undefined) =>
  product.sizeOptions?.find((s) => s.id === sizeId) ?? null;

export const defaultSizeId = (product: Product) => product.sizeOptions?.[0]?.id ?? null;

/** True when the product has more than one purchasable price point. */
export const hasPriceRange = (product: Product) =>
  (product.sizeOptions?.some((s) => s.priceDelta > 0) ?? false) || product.potOptions;

export const hasVariants = (product: Product) => (product.sizeOptions?.length ?? 0) > 1 || product.potOptions;

export const productsByTag = (tag: Tag) => products.filter((p) => p.tags.includes(tag));

export const productsBySlugs = (slugs: string[]) =>
  slugs.flatMap((slug) => {
    const p = productBySlug(slug);
    return p ? [p] : [];
  });
