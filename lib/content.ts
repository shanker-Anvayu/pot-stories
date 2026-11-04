import { unsplash } from "./products";

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  image: string;
  imageAlt: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  relatedProducts: string[];
}

/** General plant-care guidance written for the demo journal. */
export const articles: Article[] = [
  {
    slug: "low-light-guide",
    title: "The honest guide to low-light plants",
    excerpt: "No plant thrives in the dark — but some are remarkably good at making the most of a dim corner.",
    category: "Light",
    readTime: "5 min read",
    image: unsplash("photo-1513694203232-719a280e022f"),
    imageAlt: "A calm, softly lit living room with a potted tree beside a sofa",
    intro:
      "“Low light” is one of the most misunderstood phrases in plant care. It doesn't mean no light — it means a spot where a plant can see the sky, but not the sun. Here's how to read your room and pick plants that will genuinely be happy there.",
    sections: [
      {
        heading: "Read your light first",
        body: [
          "Stand where the plant will live and look toward the window. If you can see a wide patch of sky, you have medium light. If you can only see a sliver, or the window is across the room, you're in low light.",
          "A simple test: at midday, hold your hand a foot above the surface. A crisp shadow means bright light; a soft, fuzzy one means medium; barely any shadow means low.",
        ],
      },
      {
        heading: "Plants that cope well",
        body: [
          "Snake plants, ZZ plants and pothos are the most reliable choices. They grow slowly in lower light, but they keep their leaves and their good looks.",
          "Peace lilies tolerate dim rooms too, though they'll flower more freely with a little more brightness.",
        ],
      },
      {
        heading: "Adjust your watering",
        body: [
          "Plants in low light use water slowly, so the soil stays wet for longer. Most low-light problems are really overwatering problems. Always check the soil before you water — if it's still damp a few centimetres down, wait.",
        ],
      },
    ],
    relatedProducts: ["snake-plant-laurentii", "zz-plant", "golden-pothos", "peace-lily"],
  },
  {
    slug: "watering-without-guessing",
    title: "How to water without guessing",
    excerpt: "Forget the weekly schedule. Learn to read the soil and your plant will tell you exactly when it's thirsty.",
    category: "Watering",
    readTime: "4 min read",
    image: unsplash("photo-1515150144380-bca9f1650ed9"),
    imageAlt: "Water falling from a watering can onto leafy plants",
    intro:
      "Watering on a fixed day of the week is the most common reason houseplants struggle. Light, temperature, pot size and season all change how quickly soil dries. The good news: checking takes seconds.",
    sections: [
      {
        heading: "The finger test",
        body: [
          "Push a finger into the soil up to the second knuckle. If it's dry at your fingertip, most leafy tropical plants are ready for water. Succulents and cacti prefer the soil to be dry all the way through.",
        ],
      },
      {
        heading: "Water deeply, then wait",
        body: [
          "When you water, water thoroughly until it runs from the drainage hole, then empty the saucer after fifteen minutes. A deep drink encourages deep roots; frequent sips keep roots shallow and weak.",
        ],
      },
      {
        heading: "Seasons matter",
        body: [
          "Plants grow faster and drink more in the warm months. In winter, or in cooler, cloudier weeks, the same plant may need water half as often.",
        ],
      },
    ],
    relatedProducts: ["peace-lily", "calathea-lancifolia", "monstera-deliciosa"],
  },
  {
    slug: "repotting-step-by-step",
    title: "Repotting, step by step",
    excerpt: "Roots circling the pot? Water running straight through? It might be time for a new home.",
    category: "Repotting",
    readTime: "6 min read",
    image: unsplash("photo-1625758476104-f2ed6c81248f"),
    imageAlt: "A hand lifting a young plant with its roots from the soil",
    intro:
      "Most houseplants need repotting every one to two years. Done gently and at the right time of year, it's one of the best things you can do for a plant's long-term health.",
    sections: [
      {
        heading: "Signs it's time",
        body: [
          "Roots growing out of the drainage hole, water that runs straight through without soaking in, or a plant that dries out within a day or two are all signs that roots have filled the pot.",
        ],
      },
      {
        heading: "Choose the right pot",
        body: [
          "Go up just one size — usually 2–5 cm wider. A pot that's too large holds excess wet soil around the roots. Always choose a pot with a drainage hole.",
        ],
      },
      {
        heading: "The repot",
        body: [
          "Water the day before. Ease the plant out, gently loosen circling roots, and set it at the same depth in fresh mix. Firm lightly, water thoroughly, and keep it out of harsh sun for a week while it settles.",
        ],
      },
    ],
    relatedProducts: ["essential-repotting-kit", "rubber-plant-robusta", "fiddle-leaf-fig"],
  },
  {
    slug: "pruning-for-fuller-growth",
    title: "Pruning for fuller, happier plants",
    excerpt: "A few thoughtful snips can turn a leggy plant into a lush one. Here's where to cut.",
    category: "Pruning",
    readTime: "4 min read",
    image: unsplash("photo-1617576683096-00fc8eecb3af"),
    imageAlt: "Hands pruning a conifer with garden shears",
    intro:
      "Pruning feels counter-intuitive — why cut a plant you want to grow? But removing a little growth in the right place redirects energy into new shoots, giving you a fuller, more balanced plant.",
    sections: [
      {
        heading: "Cut just above a node",
        body: [
          "A node is the small bump on a stem where a leaf grows. New shoots emerge from nodes, so cut about half a centimetre above one using clean, sharp shears.",
        ],
      },
      {
        heading: "Timing",
        body: [
          "Prune at the start of the growing season, when plants recover fastest. Remove yellow or damaged leaves at any time of year.",
        ],
      },
      {
        heading: "Don't waste the cuttings",
        body: [
          "Pothos, philodendron and many other vining plants root easily in water. Pop your cuttings in a glass on a bright sill and you'll have new plants to share in a few weeks.",
        ],
      },
    ],
    relatedProducts: ["golden-pothos", "heartleaf-philodendron", "juniper-bonsai"],
  },
];

export const articleBySlug = (slug: string) => articles.find((a) => a.slug === slug);

/**
 * SAMPLE TESTIMONIALS — illustrative placeholder copy for the demo layout.
 * These are not real customer reviews and must be replaced before launch.
 */
export const sampleTestimonials = [
  {
    quote: "The plant arrived looking exactly like the photos, and the care card meant I finally stopped overwatering.",
    name: "Sample customer",
    detail: "Monstera Deliciosa",
    product: "monstera-deliciosa",
  },
  {
    quote: "I wanted something for a dim hallway and the low-light filter made it simple. It has been unbothered ever since.",
    name: "Sample customer",
    detail: "ZZ Plant",
    product: "zz-plant",
  },
  {
    quote: "Beautifully packed — it felt more like receiving a gift than an order. The terracotta pot is gorgeous.",
    name: "Sample customer",
    detail: "Snake Plant ‘Laurentii’",
    product: "snake-plant-laurentii",
  },
  {
    quote: "As a total beginner, the guides helped me understand light properly for the first time.",
    name: "Sample customer",
    detail: "Sweet Basil",
    product: "sweet-basil",
  },
  {
    quote: "Our cat ignores it completely and it has doubled in size by the window. Lovely, easy plant.",
    name: "Sample customer",
    detail: "Spider Plant",
    product: "spider-plant",
  },
  {
    quote: "Bought it as a housewarming gift and ended up ordering one for myself the same week.",
    name: "Sample customer",
    detail: "Ficus Ginseng Bonsai",
    product: "ficus-ginseng-bonsai",
  },
  {
    quote: "The leaves fold up every evening — my kids now call it the ‘bedtime plant’.",
    name: "Sample customer",
    detail: "Red Prayer Plant",
    product: "red-prayer-plant",
  },
  {
    quote: "Healthy roots, no shock after repotting, and new trailing growth within a month.",
    name: "Sample customer",
    detail: "Golden Pothos",
    product: "golden-pothos",
  },
];

export const socialGallery = [
  { image: unsplash("photo-1592150621744-aca64f48394a"), alt: "A sunlit room filled with potted houseplants and hanging lamps", product: "golden-pothos" },
  { image: unsplash("photo-1558603668-6570496b66f8"), alt: "A tall cactus in a woven basket beside a rattan chair", product: "blue-columnar-cactus" },
  { image: unsplash("photo-1545241047-6083a3684587"), alt: "A monstera on a wooden stool beside a white chair", product: "monstera-deliciosa" },
  { image: unsplash("photo-1604762524889-3e2fcc145683"), alt: "Small houseplants in white pots on a sideboard", product: "snake-plant-laurentii" },
  { image: unsplash("photo-1601985705806-5b9a71f6004f"), alt: "A plant-filled café corner with shelves of greenery", product: "heartleaf-philodendron" },
  { image: unsplash("photo-1466781783364-36c955e42a7f"), alt: "Eucalyptus stems arranged in a clear glass vase", product: "spider-plant" },
];

export const showcaseSlugs = [
  { slug: "monstera-deliciosa", persona: "The statement maker", tone: "#d8e1cf" },
  { slug: "snake-plant-laurentii", persona: "The unbothered one", tone: "#e4dcc8" },
  { slug: "zz-plant", persona: "The low-light hero", tone: "#d3dccb" },
  { slug: "fiddle-leaf-fig", persona: "The architectural one", tone: "#e9e1cf" },
  { slug: "zebra-haworthia", persona: "The tiny striped one", tone: "#dde4d6" },
] as const;

export const shopNav = {
  plants: [
    { label: "Indoor Plants", href: "/shop?category=indoor" },
    { label: "Outdoor Plants", href: "/shop?category=outdoor" },
    { label: "Succulents & Cacti", href: "/shop?category=succulents" },
    { label: "Hanging & Trailing", href: "/shop?category=hanging" },
    { label: "Bonsai", href: "/shop?category=bonsai" },
    { label: "Herbs & Edibles", href: "/shop?category=herbs" },
  ],
  needs: [
    { label: "Bestsellers", href: "/shop?tags=bestseller" },
    { label: "New arrivals", href: "/shop?tags=new" },
    { label: "Low-light tolerant", href: "/shop?tags=low-light" },
    { label: "Pet friendly", href: "/shop?tags=pet-friendly" },
    { label: "Beginner friendly", href: "/shop?tags=beginner" },
  ],
  more: [
    { label: "Seeds & Kits", href: "/shop?category=kits" },
    { label: "Plant Journal", href: "/journal" },
    { label: "Help & FAQ", href: "/help" },
  ],
};

/* ------------------------------------------------------------------ */
/* Header navigation (mega menus)                                       */
/* ------------------------------------------------------------------ */

export interface NavLink {
  label: string;
  href: string;
}

export interface NavMenu {
  id: string;
  label: string;
  columns: { title: string; links: NavLink[] }[];
  feature?: { eyebrow: string; title: string; href: string; image: string; alt: string };
}

export const navMenus: NavMenu[] = [
  {
    id: "plants",
    label: "Plants",
    columns: [
      {
        title: "Collections",
        links: [
          { label: "All plants", href: "/shop" },
          { label: "Bestsellers", href: "/shop?tags=bestseller" },
          { label: "New arrivals", href: "/shop?tags=new" },
          { label: "Giftable plants", href: "/shop?tags=gift" },
          { label: "The Festive Edit", href: "/shop?tags=festive" },
        ],
      },
      {
        title: "Shop by price",
        links: [
          { label: "Under ₹500", href: "/shop?price=under-500" },
          { label: "₹500 – ₹1,000", href: "/shop?price=500-1000" },
          { label: "₹1,000 – ₹2,000", href: "/shop?price=1000-2000" },
          { label: "Over ₹2,000", href: "/shop?price=over-2000" },
        ],
      },
      {
        title: "Shop by size",
        links: [
          { label: "Small", href: "/shop?size=small" },
          { label: "Medium", href: "/shop?size=medium" },
          { label: "Large", href: "/shop?size=large" },
        ],
      },
      {
        title: "Shop by need",
        links: [
          { label: "Low-light tolerant", href: "/shop?tags=low-light" },
          { label: "Pet friendly", href: "/shop?tags=pet-friendly" },
          { label: "Beginner friendly", href: "/shop?tags=beginner" },
          { label: "Flowering", href: "/shop?tags=flowering" },
          { label: "Statement plants", href: "/shop?tags=statement" },
        ],
      },
      {
        title: "Plant type",
        links: [
          { label: "Indoor", href: "/shop?category=indoor" },
          { label: "Outdoor", href: "/shop?category=outdoor" },
          { label: "Succulents & cacti", href: "/shop?category=succulents" },
          { label: "Hanging & trailing", href: "/shop?category=hanging" },
          { label: "Bonsai", href: "/shop?category=bonsai" },
          { label: "Herbs & edibles", href: "/shop?category=herbs" },
        ],
      },
    ],
  },
  {
    id: "gifts",
    label: "Gifts",
    columns: [
      {
        title: "Gift ideas",
        links: [
          { label: "All gifts", href: "/shop?tags=gift" },
          { label: "Gifts under ₹500", href: "/shop?tags=gift&price=under-500" },
          { label: "Gifts under ₹1,000", href: "/shop?tags=gift&price=500-1000" },
          { label: "The Festive Edit", href: "/shop?tags=festive" },
        ],
      },
      {
        title: "For every plant person",
        links: [
          { label: "New plant parents", href: "/shop?tags=gift,beginner" },
          { label: "Pet lovers", href: "/shop?tags=gift,pet-friendly" },
          { label: "Small spaces", href: "/shop?tags=gift&size=small" },
          { label: "Grow-your-own kits", href: "/shop?category=kits" },
        ],
      },
    ],
    feature: {
      eyebrow: "Festive gifting",
      title: "Gifts that keep growing",
      href: "/shop?tags=festive",
      image: unsplash("photo-1459156212016-c812468e2115"),
      alt: "Small succulents in terracotta pots seen from above",
    },
  },
  {
    id: "collections",
    label: "Collections",
    columns: [
      {
        title: "Plant types",
        links: [
          { label: "Indoor plants", href: "/shop?category=indoor" },
          { label: "Outdoor plants", href: "/shop?category=outdoor" },
          { label: "Succulents & cacti", href: "/shop?category=succulents" },
          { label: "Hanging & trailing", href: "/shop?category=hanging" },
          { label: "Bonsai", href: "/shop?category=bonsai" },
          { label: "Herbs & edibles", href: "/shop?category=herbs" },
          { label: "Seeds & kits", href: "/shop?category=kits" },
        ],
      },
      {
        title: "Edits",
        links: [
          { label: "The Low-Light Edit", href: "/shop?tags=low-light" },
          { label: "Statement plants", href: "/shop?tags=statement" },
          { label: "Flowering plants", href: "/shop?tags=flowering" },
          { label: "Pet-friendly plants", href: "/shop?tags=pet-friendly" },
        ],
      },
    ],
    feature: {
      eyebrow: "The Low-Light Edit",
      title: "Greenery for quieter corners",
      href: "/shop?tags=low-light",
      image: unsplash("photo-1604762524889-3e2fcc145683"),
      alt: "Snake plants and ZZ plants in white pots on a sideboard",
    },
  },
];

export const navLinks: NavLink[] = [
  { label: "Plant Care", href: "/journal" },
  { label: "Our Story", href: "/about" },
  { label: "Help", href: "/help" },
];

export const announcements: NavLink[] = [
  { label: "The Festive Edit is here — gifts that keep growing", href: "/shop?tags=festive" },
  { label: "Design preview · products and prices are sample content", href: "/help#demo" },
  { label: "New: the Low-Light Edit for quieter corners", href: "/shop?tags=low-light" },
];
