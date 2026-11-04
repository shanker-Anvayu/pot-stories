-- Pot Stories — demo seed (generated from lib/products.ts; safe to re-run)
-- DEMONSTRATION CATALOGUE: sample content, not live inventory or real offers.
--
-- Deterministic ids (RFC 4122 UUID v5):
--   namespace  = uuid_v5(NS_URL, 'https://potstories.in/seed') = '76573101-9937-5a10-b83c-368163570b85'
--   product    = uuid_v5(namespace, 'product:' || slug)
--   variant    = uuid_v5(namespace, 'variant:' || slug || ':' || code)
--   image      = uuid_v5(namespace, 'image:' || slug || ':' || position)
-- e.g. select extensions.uuid_generate_v5('76573101-9937-5a10-b83c-368163570b85', 'product:monstera-deliciosa');
--
-- Re-running refreshes catalogue content but never resets inventory
-- quantities or discount-code redemptions.

begin;

-- Categories
insert into public.categories (id, name, short_name, description, image_url, image_alt, position) values
  ('indoor', 'Indoor Plants', 'Indoor', 'Leafy companions for living rooms, desks and bright corners.', 'https://images.unsplash.com/photo-1530968464165-7a1861cbaf9f', 'Shelves of potted houseplants and trailing vines in a sunny room', 0),
  ('outdoor', 'Outdoor Plants', 'Outdoor', 'Hardy greens for balconies, terraces and garden beds.', 'https://images.unsplash.com/photo-1557429287-b2e26467fc2b', 'A cottage garden overflowing with flowering shrubs', 1),
  ('succulents', 'Succulents & Cacti', 'Succulents', 'Sculptural, sun-loving and wonderfully forgiving.', 'https://images.unsplash.com/photo-1446071103084-c257b5f70672', 'A dense carpet of blue-green echeveria rosettes', 2),
  ('hanging', 'Hanging & Trailing', 'Trailing', 'Cascading vines for shelves, ledges and hanging planters.', 'https://images.unsplash.com/photo-1595524147656-eb5d0a63e9a9', 'Close-up of glossy heart-shaped pothos leaves', 3),
  ('bonsai', 'Bonsai', 'Bonsai', 'Living miniatures, shaped slowly and patiently.', 'https://images.unsplash.com/photo-1512428813834-c702c7702b78', 'A ficus ginseng bonsai in a small white pot', 4),
  ('herbs', 'Herbs & Edibles', 'Herbs', 'Fragrant, useful plants for the kitchen windowsill.', 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733', 'A young sweet basil plant with bright green leaves', 5),
  ('kits', 'Seeds & Kits', 'Kits', 'Everything you need to sow, pot and grow.', 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2', 'Seedlings sprouting in small black nursery pots', 6)
on conflict (id) do update set
  name = excluded.name, short_name = excluded.short_name, description = excluded.description,
  image_url = excluded.image_url, image_alt = excluded.image_alt, position = excluded.position;

-- Planters
insert into public.planters (id, label, note, price, swatch, position, is_active) values
  ('grower', 'Grower pot', 'Recyclable nursery pot', 0, '#2b2b2b', 0, true),
  ('terracotta', 'Terracotta', 'Hand-thrown, breathable clay', 249, '#b4693f', 1, true),
  ('ceramic', 'Ivory ceramic', 'Matte glaze with saucer', 449, '#efe9dc', 2, true)
on conflict (id) do update set
  label = excluded.label, note = excluded.note, price = excluded.price,
  swatch = excluded.swatch, position = excluded.position;

-- Products
insert into public.products (id, slug, name, botanical, tags, light, care, size, height, water, pet_friendly, allows_planter, short_description, description, care_notes, is_active, position) values
  ('49868b28-de6e-504e-aaf1-bc6e09408fab', 'monstera-deliciosa', 'Monstera Deliciosa', 'Monstera deliciosa', array['bestseller', 'statement', 'beginner', 'gift']::text[], 'bright', 'easy', 'large', '70–90 cm with pot', 'When the top 5 cm of soil is dry', false, true, 'The iconic split-leaf statement plant.', 'Few plants change a room like a Monstera. Its glossy, deeply split leaves unfurl one by one, each a little larger than the last. Give it bright, indirect light and something to climb, and it will happily grow alongside you for years.', array['Bright, indirect light; avoid harsh afternoon sun', 'Wipe leaves monthly to keep them glossy', 'Add a moss pole as it matures for larger leaves']::text[], true, 0),
  ('1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'snake-plant-laurentii', 'Snake Plant ‘Laurentii’', 'Dracaena trifasciata', array['bestseller', 'low-light', 'beginner', 'gift', 'festive']::text[], 'low', 'easy', 'medium', '45–55 cm with pot', 'Every 2–3 weeks; let soil dry fully', false, true, 'Architectural, upright and almost unflappable.', 'Upright, sword-like leaves edged in buttery yellow make the Laurentii a crisp, graphic presence. It tolerates lower light and infrequent watering, which makes it a natural first plant and a reliable choice for bedrooms and hallways.', array['Tolerates low light; grows faster in bright, indirect light', 'Overwatering is the main risk — err on the dry side', 'Repot only when roots crowd the pot']::text[], true, 1),
  ('32952989-ea69-5f2c-b5bc-15937a723ddf', 'snake-plant-zeylanica', 'Snake Plant ‘Zeylanica’', 'Dracaena zeylanica', array['new', 'low-light', 'beginner']::text[], 'low', 'easy', 'medium', '40–50 cm with pot', 'Every 2–3 weeks; let soil dry fully', false, true, 'Silver-banded leaves with a softer silhouette.', 'Zeylanica has darker, silver-banded foliage that reads almost like brushwork. It shares the snake plant''s easy-going nature, thriving on a little neglect in spots most plants would find too dim.', array['Happy in low to bright, indirect light', 'Water sparingly, especially in winter', 'Use a free-draining, gritty potting mix']::text[], true, 2),
  ('a0b46fb9-ab70-56ad-9d35-576f87982f47', 'zz-plant', 'ZZ Plant', 'Zamioculcas zamiifolia', array['bestseller', 'low-light', 'beginner', 'gift']::text[], 'low', 'easy', 'medium', '45–60 cm with pot', 'Every 2–3 weeks; let soil dry', false, true, 'Waxy, glossy stems that shrug off low light.', 'The ZZ stores water in thick underground rhizomes, so it copes with irregular watering and low light better than most. Its waxy, almost lacquered leaves bring a polished, sculptural feel to offices and darker corners.', array['Tolerates low light; avoid direct midday sun', 'Water only when the soil has dried completely', 'Slow-growing — repot every two to three years']::text[], true, 3),
  ('cd010afc-bc5a-5c74-a02f-e9cfc6c369bc', 'fiddle-leaf-fig', 'Fiddle Leaf Fig', 'Ficus lyrata', array['statement']::text[], 'bright', 'moderate', 'large', '90–110 cm with pot', 'When the top 5 cm of soil is dry', false, true, 'Broad, violin-shaped leaves on a slender trunk.', 'The Fiddle Leaf Fig is the designer''s favourite for good reason: big, veined leaves held on an elegant stem. It rewards a consistent routine — a bright spot near a window, steady watering and as few moves as possible.', array['Bright light near a window; rotate quarterly', 'Keep away from draughts and air-conditioning vents', 'Dislikes being moved — pick its spot and let it settle']::text[], true, 4),
  ('2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'rubber-plant-robusta', 'Rubber Plant ‘Robusta’', 'Ficus elastica', array['beginner', 'festive']::text[], 'medium', 'easy', 'medium', '50–60 cm with pot', 'When the top 3–5 cm of soil is dry', false, true, 'Glossy, deep-green leaves with an easy temperament.', 'Robusta grows broad, leathery leaves that catch the light beautifully. It is forgiving, quick to establish and easy to shape — pinch the top to encourage a fuller, bushier plant.', array['Medium to bright, indirect light', 'Wipe leaves to keep them dust-free', 'Prune in spring to encourage branching']::text[], true, 5),
  ('f4fde8d5-8330-5157-95bb-f796069c0101', 'peace-lily', 'Peace Lily', 'Spathiphyllum wallisii', array['bestseller', 'flowering', 'low-light', 'gift', 'festive']::text[], 'low', 'easy', 'medium', '40–50 cm with pot', 'Weekly; it droops when thirsty', false, true, 'Elegant white blooms that tell you when they''re thirsty.', 'The Peace Lily pairs lush, arching leaves with pure white spathes that appear through much of the year. It visibly droops when it needs water and perks up within hours — a gentle teacher for new plant parents.', array['Low to medium, indirect light', 'Keep soil lightly moist; water when leaves begin to droop', 'Trim spent flowers at the base']::text[], true, 6),
  ('b76ea306-49dc-5590-8959-80908b0aed72', 'golden-pothos', 'Golden Pothos', 'Epipremnum aureum', array['bestseller', 'low-light', 'beginner', 'gift']::text[], 'low', 'easy', 'small', 'Trails 30–40 cm', 'When the top 3 cm of soil is dry', false, true, 'Gold-marbled vines that trail with abandon.', 'Pothos is the definition of easy-going. Its heart-shaped, gold-splashed leaves trail from shelves or climb a trellis, and cuttings root readily in a glass of water — perfect for sharing.', array['Low to bright, indirect light; variegation is richer in brighter spots', 'Trim long vines to keep it full', 'Propagate cuttings in water']::text[], true, 7),
  ('aa568e56-73aa-5e3e-b085-b91ffdf953d3', 'heartleaf-philodendron', 'Heartleaf Philodendron', 'Philodendron hederaceum', array['beginner', 'low-light']::text[], 'medium', 'easy', 'small', 'Trails 30–45 cm', 'When the top 3 cm of soil is dry', false, true, 'Soft, heart-shaped leaves on cascading stems.', 'A classic trailing plant with velvety, heart-shaped leaves. It grows quickly in medium light and looks especially lovely tumbling from a high shelf or hanging planter.', array['Medium, indirect light; tolerates lower light', 'Keep soil evenly moist but never soggy', 'Pinch tips to encourage bushier growth']::text[], true, 8),
  ('f0ec0672-05c0-5da8-b54f-010cf0b38725', 'neon-pothos-starter', 'Neon Pothos Starter', 'Epipremnum aureum ‘Neon’', array['new', 'beginner']::text[], 'medium', 'easy', 'small', '15–20 cm', 'When the top 3 cm of soil is dry', false, true, 'A young plant in electric chartreuse.', 'Neon Pothos glows with bright lime-green leaves that light up shelves and desks. This starter-size plant is an affordable way to begin a trailing collection.', array['Medium to bright, indirect light keeps the colour vivid', 'Water when the top of the soil dries out', 'Feed monthly in the growing season']::text[], true, 9),
  ('50beda3f-c7a3-5197-9e80-91dfd3d713f7', 'calathea-lancifolia', 'Calathea Lancifolia', 'Goeppertia insignis', array['pet-friendly', 'festive']::text[], 'medium', 'moderate', 'medium', '40–50 cm with pot', 'Keep soil lightly moist', true, true, 'Wavy, patterned leaves with a burgundy underside.', 'Sometimes called the rattlesnake plant, this calathea has long, rippled leaves painted with dark green ovals. Its leaves lift and fold with the light through the day — a quiet, living rhythm in your room.', array['Medium, indirect light; direct sun fades the pattern', 'Prefers humidity — group with other plants', 'Use filtered or rested tap water if tips brown']::text[], true, 10),
  ('0355e18d-3f53-573a-a3a4-bca66fc485a1', 'red-prayer-plant', 'Red Prayer Plant', 'Maranta leuconeura ‘Erythroneura’', array['pet-friendly', 'new', 'gift']::text[], 'medium', 'moderate', 'small', '25–30 cm with pot', 'Keep soil lightly moist', true, true, 'Red herringbone veins on velvet-green leaves.', 'The Red Prayer Plant folds its leaves upward each evening, like hands in prayer. Striking red veins over layered greens make it one of the most graphic foliage plants you can grow indoors.', array['Medium, indirect light', 'Enjoys humidity and evenly moist soil', 'Trim leggy stems to keep it compact']::text[], true, 11),
  ('20acb199-d5ae-58f5-afce-403528d40458', 'spider-plant', 'Spider Plant', 'Chlorophytum comosum', array['pet-friendly', 'beginner', 'bestseller', 'gift']::text[], 'medium', 'easy', 'small', '25–35 cm with pot', 'When the top 3 cm of soil is dry', true, true, 'Arching striped leaves and easy little plantlets.', 'A cheerful, fountain-shaped plant with cream-striped leaves. Mature plants send out baby plantlets on long stems that you can pot up and pass on to friends.', array['Bright to medium, indirect light', 'Tolerates the occasional missed watering', 'Pot up plantlets once they show roots']::text[], true, 12),
  ('49405bff-0bf6-559e-8afb-b2a024cabf83', 'lucky-bamboo', 'Lucky Bamboo', 'Dracaena sanderiana', array['beginner', 'low-light', 'gift', 'festive']::text[], 'low', 'easy', 'medium', '40–60 cm', 'Top up water weekly; refresh monthly', false, false, 'Slender, segmented stems grown in water.', 'Lucky Bamboo grows happily in a vessel of water and pebbles, making it one of the simplest plants to keep. Its tall, segmented stems bring a calm vertical line to desks and shelves.', array['Low to medium, indirect light', 'Keep roots covered with clean water', 'Use filtered water if leaf tips yellow']::text[], true, 13),
  ('6dd1e4de-6c17-5bb6-bc4e-0ebcb765faba', 'ficus-ginseng-bonsai', 'Ficus Ginseng Bonsai', 'Ficus microcarpa', array['beginner', 'bestseller', 'gift', 'festive']::text[], 'bright', 'moderate', 'small', '25–30 cm', 'When the soil surface feels dry', false, false, 'A sculptural root trunk under a tidy canopy.', 'With its swollen, sculptural roots and compact canopy, the Ficus Ginseng is a wonderful introduction to bonsai. It is more forgiving than most and grows well indoors in a bright spot.', array['Bright, indirect light; morning sun is welcome', 'Water thoroughly, then let the surface dry', 'Trim new shoots back to two leaves to keep its shape']::text[], true, 14),
  ('09612fb1-3547-5eb6-9cc2-f37df5a7de3f', 'juniper-bonsai', 'Juniper Bonsai', 'Juniperus procumbens ‘Nana’', array['statement']::text[], 'bright', 'expert', 'medium', '30–40 cm', 'Daily in summer; check soil each morning', false, false, 'Layered foliage pads with an aged, windswept form.', 'The Juniper is the classic outdoor bonsai, with dense, needle-like foliage that can be shaped over years into graceful layered pads. It needs sunshine, fresh air and a seasonal rhythm — this is a plant for the patient grower.', array['Keep outdoors in full sun to partial shade', 'Never let the root ball dry out completely', 'Pinch and prune during the growing season']::text[], true, 15),
  ('dcc71389-141f-5614-90c6-4ab083510f66', 'zebra-haworthia', 'Zebra Haworthia', 'Haworthiopsis attenuata', array['pet-friendly', 'beginner', 'bestseller', 'gift']::text[], 'medium', 'easy', 'small', '10–15 cm with pot', 'Every 2–3 weeks; less in winter', true, true, 'A pocket-sized succulent with white striped leaves.', 'Compact, striped and endlessly charming, the Zebra Haworthia suits desks and windowsills where space is tight. Unlike many succulents, it is content with bright, indirect light.', array['Bright, indirect light; avoid harsh afternoon sun', 'Water deeply, then allow soil to dry completely', 'Use a gritty cactus and succulent mix']::text[], true, 16),
  ('add0c7b1-f76e-59ff-949b-335f7f371e3f', 'aloe-vera', 'Aloe Vera', 'Aloe barbadensis miller', array['beginner']::text[], 'bright', 'easy', 'small', '25–30 cm with pot', 'Every 2–3 weeks; let soil dry fully', false, true, 'Plump, architectural leaves for a sunny sill.', 'A sun-loving succulent with fleshy, upright leaves. Aloe thrives on a bright windowsill or a sheltered balcony and asks for very little beyond good drainage.', array['Bright light with some direct sun', 'Water deeply but infrequently', 'Protect from heavy monsoon rain outdoors']::text[], true, 17),
  ('05b5efd2-82dc-5fde-87ce-d32d2344d857', 'blue-columnar-cactus', 'Blue Columnar Cactus', 'Pilosocereus azureus', array['new']::text[], 'bright', 'easy', 'small', '20–25 cm with pot', 'Every 3–4 weeks; dry between waterings', false, true, 'Powder-blue ribs with golden spines.', 'A cactus with a beautiful frosted blue skin that deepens in strong light. Give it your sunniest spot — a south-facing sill or balcony — and water sparingly.', array['Full sun is ideal', 'Water sparingly; never let it sit in water', 'Handle with care — wear gloves when repotting']::text[], true, 18),
  ('7f274ed9-8a7d-518e-bfc9-c6dcdc2638c6', 'flowering-ball-cactus', 'Flowering Ball Cactus', 'Cactaceae, assorted', array['flowering']::text[], 'bright', 'easy', 'small', '12–15 cm with pot', 'Every 2–3 weeks; dry between waterings', false, true, 'A compact globe crowned with seasonal blooms.', 'A neat, globe-shaped cactus that can produce vivid blooms in the right conditions. Bright light and a cool, dry rest in winter give it the best chance of flowering.', array['Bright light with a few hours of sun', 'Reduce watering in winter', 'Use a fast-draining cactus mix']::text[], true, 19),
  ('388de484-16af-59c6-88da-391750f4d7aa', 'boxwood-topiary', 'Boxwood Ball Topiary', 'Buxus sempervirens', array['statement', 'festive']::text[], 'bright', 'moderate', 'large', '70–80 cm with pot', 'Two to three times a week in warm weather', false, false, 'A clipped, formal crown for entrances and terraces.', 'A crisp, clipped standard that brings structure to doorways, balconies and terraces. Pair two either side of an entrance for a timeless, symmetrical welcome.', array['Full sun to partial shade', 'Keep soil consistently moist in summer', 'Trim lightly two or three times a year']::text[], true, 20),
  ('a7036e91-5ba2-5e29-91aa-fccb668c5bdb', 'sweet-basil', 'Sweet Basil', 'Ocimum basilicum', array['pet-friendly', 'beginner', 'new']::text[], 'bright', 'easy', 'small', '20–25 cm with pot', 'Keep soil evenly moist', true, true, 'Fragrant leaves for pesto, salads and more.', 'A sunny-windowsill essential. Pinch off the top leaves regularly and your basil will grow bushier and more productive — the more you harvest, the more it gives.', array['At least 5–6 hours of sun', 'Pinch out flower buds to prolong leaf growth', 'Harvest from the top, just above a leaf pair']::text[], true, 21),
  ('528d3aa7-1660-571b-b4bb-bd31d0ab2c91', 'succulent-trio', 'Succulent Trio', 'Echeveria & Haworthia, assorted', array['beginner', 'gift', 'festive']::text[], 'bright', 'easy', 'small', '8–12 cm each', 'Every 2–3 weeks', false, false, 'Three sculptural minis, ready to gift.', 'A hand-picked trio of compact succulents in terracotta pots. Varieties change with the season, so every trio is a little different.', array['Bright light with some direct sun', 'Water deeply, then let soil dry completely', 'Group together on a sunny sill']::text[], true, 22),
  ('d608a945-d260-538d-8173-78026617a8a5', 'heirloom-seed-starter-kit', 'Heirloom Seed Starter Kit', 'Kit · seeds, mix & pots', array['new', 'beginner', 'gift']::text[], 'bright', 'easy', 'small', 'Kit', 'Mist daily until seedlings emerge', false, false, 'Sow your own herbs from seed.', 'Everything you need to start a small herb garden from seed: biodegradable pots, a light seed-starting mix and a selection of easy herbs, with a step-by-step sowing guide.', array['Sow on a warm, bright windowsill', 'Keep the mix moist, not wet, until germination', 'Thin seedlings once true leaves appear']::text[], true, 23),
  ('a0dff966-dc4e-5572-9ed6-ace8fb7211d7', 'essential-repotting-kit', 'Essential Repotting Kit', 'Kit · trowel, mix & shears', '{}'::text[], 'medium', 'easy', 'small', 'Kit', '—', false, false, 'The tools for a calm, mess-free repot.', 'A compact trowel, precision shears and a bag of airy aroid-friendly potting mix — the essentials for giving a root-bound plant a new home.', array['Repot in spring or early summer', 'Go up only one pot size at a time', 'Water thoroughly after repotting']::text[], true, 24)
on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, botanical = excluded.botanical, tags = excluded.tags,
  light = excluded.light, care = excluded.care, size = excluded.size, height = excluded.height,
  water = excluded.water, pet_friendly = excluded.pet_friendly, allows_planter = excluded.allows_planter,
  short_description = excluded.short_description, description = excluded.description,
  care_notes = excluded.care_notes, position = excluded.position;

-- Product categories
insert into public.product_categories (product_id, category_id) values
  ('49868b28-de6e-504e-aaf1-bc6e09408fab', 'indoor'),
  ('1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'indoor'),
  ('32952989-ea69-5f2c-b5bc-15937a723ddf', 'indoor'),
  ('a0b46fb9-ab70-56ad-9d35-576f87982f47', 'indoor'),
  ('cd010afc-bc5a-5c74-a02f-e9cfc6c369bc', 'indoor'),
  ('2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'indoor'),
  ('f4fde8d5-8330-5157-95bb-f796069c0101', 'indoor'),
  ('b76ea306-49dc-5590-8959-80908b0aed72', 'indoor'),
  ('b76ea306-49dc-5590-8959-80908b0aed72', 'hanging'),
  ('aa568e56-73aa-5e3e-b085-b91ffdf953d3', 'indoor'),
  ('aa568e56-73aa-5e3e-b085-b91ffdf953d3', 'hanging'),
  ('f0ec0672-05c0-5da8-b54f-010cf0b38725', 'indoor'),
  ('f0ec0672-05c0-5da8-b54f-010cf0b38725', 'hanging'),
  ('50beda3f-c7a3-5197-9e80-91dfd3d713f7', 'indoor'),
  ('0355e18d-3f53-573a-a3a4-bca66fc485a1', 'indoor'),
  ('0355e18d-3f53-573a-a3a4-bca66fc485a1', 'hanging'),
  ('20acb199-d5ae-58f5-afce-403528d40458', 'indoor'),
  ('20acb199-d5ae-58f5-afce-403528d40458', 'hanging'),
  ('49405bff-0bf6-559e-8afb-b2a024cabf83', 'indoor'),
  ('6dd1e4de-6c17-5bb6-bc4e-0ebcb765faba', 'indoor'),
  ('6dd1e4de-6c17-5bb6-bc4e-0ebcb765faba', 'bonsai'),
  ('09612fb1-3547-5eb6-9cc2-f37df5a7de3f', 'outdoor'),
  ('09612fb1-3547-5eb6-9cc2-f37df5a7de3f', 'bonsai'),
  ('dcc71389-141f-5614-90c6-4ab083510f66', 'indoor'),
  ('dcc71389-141f-5614-90c6-4ab083510f66', 'succulents'),
  ('add0c7b1-f76e-59ff-949b-335f7f371e3f', 'indoor'),
  ('add0c7b1-f76e-59ff-949b-335f7f371e3f', 'outdoor'),
  ('add0c7b1-f76e-59ff-949b-335f7f371e3f', 'succulents'),
  ('05b5efd2-82dc-5fde-87ce-d32d2344d857', 'outdoor'),
  ('05b5efd2-82dc-5fde-87ce-d32d2344d857', 'succulents'),
  ('7f274ed9-8a7d-518e-bfc9-c6dcdc2638c6', 'indoor'),
  ('7f274ed9-8a7d-518e-bfc9-c6dcdc2638c6', 'succulents'),
  ('388de484-16af-59c6-88da-391750f4d7aa', 'outdoor'),
  ('a7036e91-5ba2-5e29-91aa-fccb668c5bdb', 'outdoor'),
  ('a7036e91-5ba2-5e29-91aa-fccb668c5bdb', 'herbs'),
  ('528d3aa7-1660-571b-b4bb-bd31d0ab2c91', 'indoor'),
  ('528d3aa7-1660-571b-b4bb-bd31d0ab2c91', 'succulents'),
  ('d608a945-d260-538d-8173-78026617a8a5', 'kits'),
  ('d608a945-d260-538d-8173-78026617a8a5', 'herbs'),
  ('a0dff966-dc4e-5572-9ed6-ace8fb7211d7', 'kits')
on conflict do nothing;

-- Product images (position 0 = primary)
insert into public.product_images (id, product_id, url, alt, storage_path, position) values
  ('a262b427-9d15-569e-9981-7ac44f814483', '49868b28-de6e-504e-aaf1-bc6e09408fab', 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b', 'A Monstera deliciosa with split leaves in a white pot', null, 0),
  ('cb877568-2fef-5676-af2c-82844e24dee6', '49868b28-de6e-504e-aaf1-bc6e09408fab', 'https://images.unsplash.com/photo-1545241047-6083a3684587', 'Monstera on a wooden stool beside a white chair', null, 1),
  ('7162ccef-8fca-51e1-8b74-d91172f52a1c', '49868b28-de6e-504e-aaf1-bc6e09408fab', 'https://images.unsplash.com/photo-1545165375-1b744b9ed444', 'Close-up of a fenestrated monstera leaf', null, 2),
  ('c6941136-04d3-5091-aae2-57df0a47146d', '1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'https://images.unsplash.com/photo-1611211232932-da3113c5b960', 'A snake plant with yellow-edged upright leaves in a white pot', null, 0),
  ('b3e098b0-cab3-5c4d-89c2-5fda5eda3620', '1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'https://images.unsplash.com/photo-1604762524889-3e2fcc145683', 'Houseplants lined up on a white sideboard', null, 1),
  ('c4f15765-bab0-53d8-afa3-2670f3c98be1', '32952989-ea69-5f2c-b5bc-15937a723ddf', 'https://images.unsplash.com/photo-1620127252536-03bdfcf6d5c3', 'A snake plant with banded leaves in a blush pink pot', null, 0),
  ('2fb9d251-8bc3-501b-8acd-059fc5e2d23a', 'a0b46fb9-ab70-56ad-9d35-576f87982f47', 'https://images.unsplash.com/photo-1632207691143-643e2a9a9361', 'A ZZ plant with glossy dark leaves held in a white pot', null, 0),
  ('4c2de75d-9830-5f52-9490-07b5fac95f42', 'cd010afc-bc5a-5c74-a02f-e9cfc6c369bc', 'https://images.unsplash.com/photo-1453904300235-0f2f60b15b5d', 'A young fiddle leaf fig with large violin-shaped leaves', null, 0),
  ('4bbac2e9-b43f-5ae3-a68f-9f09ded737f7', '2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6', 'A rubber plant stem with glossy oval leaves against a white wall', null, 0),
  ('4c9c8663-98d0-586e-af3c-f431d604381e', '2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'https://images.unsplash.com/photo-1477554193778-9562c28588c0', 'Soft green ficus leaves in diffused light', null, 1),
  ('3e0690e4-b4e3-5506-8b69-2233bd6f82f6', 'f4fde8d5-8330-5157-95bb-f796069c0101', 'https://images.unsplash.com/photo-1593691509543-c55fb32d8de5', 'White peace lily flowers among dark green leaves', null, 0),
  ('57ba5e10-9494-5217-9ac7-616257469fb1', 'b76ea306-49dc-5590-8959-80908b0aed72', 'https://images.unsplash.com/photo-1598880940080-ff9a29891b85', 'Golden pothos trailing from a white pot on a hanging shelf', null, 0),
  ('33d73b23-f841-52c0-96c0-3d09b1154d68', 'b76ea306-49dc-5590-8959-80908b0aed72', 'https://images.unsplash.com/photo-1595524147656-eb5d0a63e9a9', 'Close-up of marbled pothos leaves', null, 1),
  ('43e5fe27-9aa3-50aa-9c4b-0cf1af2cf27a', 'aa568e56-73aa-5e3e-b085-b91ffdf953d3', 'https://images.unsplash.com/photo-1600411833196-7c1f6b1a8b90', 'A heartleaf philodendron spilling out of a white hanging planter', null, 0),
  ('8bb21e80-e246-50d8-95c5-2a58a0da9d5f', 'f0ec0672-05c0-5da8-b54f-010cf0b38725', 'https://images.unsplash.com/photo-1591958911259-bee2173bdccc', 'A young neon pothos with chartreuse leaves in a dark nursery pot', null, 0),
  ('dec828c3-9fb5-57cb-b2f2-581c5d5b69e0', '50beda3f-c7a3-5197-9e80-91dfd3d713f7', 'https://images.unsplash.com/photo-1602923668104-8f9e03e77e62', 'A calathea lancifolia with patterned wavy leaves, roots exposed', null, 0),
  ('b2efee5a-44c6-50e6-ac9c-451631819840', '0355e18d-3f53-573a-a3a4-bca66fc485a1', 'https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5', 'A prayer plant leaf with red herringbone veins', null, 0),
  ('07bbde2e-8e48-577d-b337-9277ec85aed2', '20acb199-d5ae-58f5-afce-403528d40458', 'https://images.unsplash.com/photo-1572688484438-313a6e50c333', 'A variegated spider plant on a slim grey console table', null, 0),
  ('65e87e56-e085-5320-8c0e-ce538dd35e8b', '49405bff-0bf6-559e-8afb-b2a024cabf83', 'https://images.unsplash.com/photo-1567331711402-509c12c41959', 'Tall lucky bamboo stems with ribbon-like leaves', null, 0),
  ('bd1677b0-6300-5c6b-a182-0950e858f52d', '6dd1e4de-6c17-5bb6-bc4e-0ebcb765faba', 'https://images.unsplash.com/photo-1512428813834-c702c7702b78', 'A ficus ginseng bonsai with a sculpted root trunk in a white pot', null, 0),
  ('aeec6564-6ab6-5d8f-83f2-e8457dafb33c', '09612fb1-3547-5eb6-9cc2-f37df5a7de3f', 'https://images.unsplash.com/photo-1526397751294-331021109fbd', 'A juniper bonsai with layered foliage pads in a stone pot', null, 0),
  ('902711ba-c0ea-50a6-9991-e25deb82af83', 'dcc71389-141f-5614-90c6-4ab083510f66', 'https://images.unsplash.com/photo-1485955900006-10f4d324d411', 'A striped zebra haworthia succulent in a mint green pot', null, 0),
  ('3e87819b-dbe3-5e34-9bae-9f7cf1c79566', 'add0c7b1-f76e-59ff-949b-335f7f371e3f', 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09', 'A spiky, speckled aloe in a concrete pot', null, 0),
  ('4ded3f1d-9b2f-51ce-8750-5c668a47178d', '05b5efd2-82dc-5fde-87ce-d32d2344d857', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a', 'A blue-green columnar cactus in an orange pot against a pink wall', null, 0),
  ('e0ad7702-9d49-5408-a5e1-03fc2c41dbb5', '7f274ed9-8a7d-518e-bfc9-c6dcdc2638c6', 'https://images.unsplash.com/photo-1509937528035-ad76254b0356', 'A round cactus topped with a magenta flower in a white pot', null, 0),
  ('5ed6d4b5-d8f2-51e9-bfae-a33eae93a5a9', '388de484-16af-59c6-88da-391750f4d7aa', 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb', 'A boxwood topiary standard with a rounded crown in a green pot', null, 0),
  ('9d4a5ec5-0e70-58c4-96a3-34a4da702051', 'a7036e91-5ba2-5e29-91aa-fccb668c5bdb', 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733', 'A young sweet basil plant in a terracotta pot', null, 0),
  ('dce0a625-9989-538f-b013-fd44882b7ca9', '528d3aa7-1660-571b-b4bb-bd31d0ab2c91', 'https://images.unsplash.com/photo-1459156212016-c812468e2115', 'Three small succulents in terracotta pots seen from above', null, 0),
  ('e8e431fe-76df-5856-a6f9-43f0727cecca', 'd608a945-d260-538d-8173-78026617a8a5', 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2', 'Seedlings sprouting in a tray of small black pots', null, 0),
  ('d6052087-5fb8-5961-be70-9f8467b83ebd', 'd608a945-d260-538d-8173-78026617a8a5', 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8', 'Hands pressing seedlings into a seed tray', null, 1),
  ('736484df-c874-513d-80b0-f3fa05e09330', 'a0dff966-dc4e-5572-9ed6-ace8fb7211d7', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b', 'A sage green trowel scooping rich potting mix', null, 0)
on conflict (id) do update set
  url = excluded.url, alt = excluded.alt, position = excluded.position;

-- Product variants
insert into public.product_variants (id, product_id, code, sku, label, detail, price, compare_at_price, position, is_default, is_active) values
  ('e8604d79-2890-5610-b56a-287b488aab5d', '49868b28-de6e-504e-aaf1-bc6e09408fab', 'medium', 'PS-MONSTERA-DELICIOSA-MEDIUM', 'Medium', '6″ pot · 60–70 cm', 1499, 1799, 0, true, true),
  ('79402bc5-0eec-5e05-8726-2b9fe60f51f1', '49868b28-de6e-504e-aaf1-bc6e09408fab', 'large', 'PS-MONSTERA-DELICIOSA-LARGE', 'Large', '8″ pot · 90–110 cm', 2699, null, 1, false, true),
  ('52394b02-47c5-50e1-adb8-b6def6be29b6', '1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'small', 'PS-SNAKE-PLANT-LAURENTII-SMALL', 'Small', '4″ pot · 30–35 cm', 899, null, 0, true, true),
  ('b4ab47f2-92df-5038-a054-358d7d89f162', '1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'medium', 'PS-SNAKE-PLANT-LAURENTII-MEDIUM', 'Medium', '6″ pot · 45–55 cm', 1299, null, 1, false, true),
  ('2616fc5a-0c4e-5b31-9078-3f83f3d34f5b', '1a1cc992-aac9-5fd6-9957-7db6f595a40f', 'large', 'PS-SNAKE-PLANT-LAURENTII-LARGE', 'Large', '8″ pot · 70–80 cm', 1999, null, 2, false, true),
  ('7a59ccf3-0445-547a-a6c2-5a0499097118', '32952989-ea69-5f2c-b5bc-15937a723ddf', 'standard', 'PS-SNAKE-PLANT-ZEYLANICA-STANDARD', 'Standard', '40–50 cm with pot', 1099, null, 0, true, true),
  ('eb307545-6916-5d82-bc41-e278681a470e', 'a0b46fb9-ab70-56ad-9d35-576f87982f47', 'medium', 'PS-ZZ-PLANT-MEDIUM', 'Medium', '6″ pot · 45–60 cm', 1199, null, 0, true, true),
  ('0d2d868f-ef1e-59f4-9c6a-fe060ea71d7a', 'a0b46fb9-ab70-56ad-9d35-576f87982f47', 'large', 'PS-ZZ-PLANT-LARGE', 'Large', '8″ pot · 70–80 cm', 2099, null, 1, false, true),
  ('650142fe-a9ad-5f70-82bb-f456d42289a2', 'cd010afc-bc5a-5c74-a02f-e9cfc6c369bc', 'medium', 'PS-FIDDLE-LEAF-FIG-MEDIUM', 'Medium', '8″ pot · 90–110 cm', 2299, null, 0, true, true),
  ('3766ff49-28a1-5c9f-a671-75af213cac04', 'cd010afc-bc5a-5c74-a02f-e9cfc6c369bc', 'tall', 'PS-FIDDLE-LEAF-FIG-TALL', 'Tall', '10″ pot · 140–160 cm', 3799, null, 1, false, true),
  ('6c5178cc-c38b-5a30-95b6-de375716ecf9', '2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'medium', 'PS-RUBBER-PLANT-ROBUSTA-MEDIUM', 'Medium', '6″ pot · 50–60 cm', 999, null, 0, true, true),
  ('6750f47d-e391-5a83-8890-0faf40b3c6aa', '2f031e79-e6f1-597e-ae1f-da1fc54a518e', 'large', 'PS-RUBBER-PLANT-ROBUSTA-LARGE', 'Large', '8″ pot · 80–90 cm', 1799, null, 1, false, true),
  ('d5383064-747e-5af0-af1a-7c5478e45e7b', 'f4fde8d5-8330-5157-95bb-f796069c0101', 'medium', 'PS-PEACE-LILY-MEDIUM', 'Medium', '6″ pot · 40–50 cm', 799, null, 0, true, true),
  ('729d97cc-8e31-5a58-be53-888e674c8c68', 'f4fde8d5-8330-5157-95bb-f796069c0101', 'large', 'PS-PEACE-LILY-LARGE', 'Large', '8″ pot · 60–70 cm', 1399, null, 1, false, true),
  ('38003b24-7973-5918-86c6-702420526e8b', 'b76ea306-49dc-5590-8959-80908b0aed72', 'small', 'PS-GOLDEN-POTHOS-SMALL', 'Small', '4″ pot · trails 30 cm', 649, null, 0, true, true),
  ('8088ca91-e1bd-5daa-aa7d-2c9bac2f82ae', 'b76ea306-49dc-5590-8959-80908b0aed72', 'medium', 'PS-GOLDEN-POTHOS-MEDIUM', 'Medium', '6″ pot · trails 50 cm', 949, null, 1, false, true),
  ('1258692a-a992-55f3-a236-4d923d9e5b19', 'aa568e56-73aa-5e3e-b085-b91ffdf953d3', 'standard', 'PS-HEARTLEAF-PHILODENDRON-STANDARD', 'Standard', 'Trails 30–45 cm', 749, null, 0, true, true),
  ('7e5dacc6-c0ab-5c7a-b8bb-5945e20d164a', 'f0ec0672-05c0-5da8-b54f-010cf0b38725', 'standard', 'PS-NEON-POTHOS-STARTER-STANDARD', 'Standard', '15–20 cm', 349, null, 0, true, true),
  ('c4f8e7ff-2f5d-588e-a6ae-fb2d163eb2ef', '50beda3f-c7a3-5197-9e80-91dfd3d713f7', 'standard', 'PS-CALATHEA-LANCIFOLIA-STANDARD', 'Standard', '40–50 cm with pot', 1149, null, 0, true, true),
  ('a0f74fa9-7dac-56a1-a9c8-925c785525a0', '0355e18d-3f53-573a-a3a4-bca66fc485a1', 'standard', 'PS-RED-PRAYER-PLANT-STANDARD', 'Standard', '25–30 cm with pot', 849, null, 0, true, true),
  ('1379020f-6523-534b-b602-78cd6fafe162', '20acb199-d5ae-58f5-afce-403528d40458', 'small', 'PS-SPIDER-PLANT-SMALL', 'Small', '4″ pot', 549, null, 0, true, true),
  ('eaabb9b9-ae75-5a03-ac3c-8568cb782d8e', '20acb199-d5ae-58f5-afce-403528d40458', 'medium', 'PS-SPIDER-PLANT-MEDIUM', 'Medium', '6″ pot', 799, null, 1, false, true),
  ('47041c8c-1dad-58dc-960a-115c75b7d9cf', '49405bff-0bf6-559e-8afb-b2a024cabf83', 'standard', 'PS-LUCKY-BAMBOO-STANDARD', 'Standard', '40–60 cm', 449, null, 0, true, true),
  ('f77ab306-525c-54ac-9430-28ffa045f973', '6dd1e4de-6c17-5bb6-bc4e-0ebcb765faba', 'standard', 'PS-FICUS-GINSENG-BONSAI-STANDARD', 'Standard', '25–30 cm', 1349, null, 0, true, true),
  ('5a942633-43e5-5546-a435-f83543e87b46', '09612fb1-3547-5eb6-9cc2-f37df5a7de3f', 'standard', 'PS-JUNIPER-BONSAI-STANDARD', 'Standard', '30–40 cm', 3499, null, 0, true, true),
  ('3a391826-8f12-5645-ac23-5079c8c8034a', 'dcc71389-141f-5614-90c6-4ab083510f66', 'standard', 'PS-ZEBRA-HAWORTHIA-STANDARD', 'Standard', '10–15 cm with pot', 399, null, 0, true, true),
  ('a6fdd02b-8529-5ea6-9e2a-c03f5088d83e', 'add0c7b1-f76e-59ff-949b-335f7f371e3f', 'standard', 'PS-ALOE-VERA-STANDARD', 'Standard', '25–30 cm with pot', 449, null, 0, true, true),
  ('709e57a5-70df-5a24-bb7e-508e462888ed', '05b5efd2-82dc-5fde-87ce-d32d2344d857', 'standard', 'PS-BLUE-COLUMNAR-CACTUS-STANDARD', 'Standard', '20–25 cm with pot', 599, null, 0, true, true),
  ('196274c4-2fda-5d58-84cb-f4ccd74a971c', '7f274ed9-8a7d-518e-bfc9-c6dcdc2638c6', 'standard', 'PS-FLOWERING-BALL-CACTUS-STANDARD', 'Standard', '12–15 cm with pot', 499, null, 0, true, true),
  ('c20eb345-1eea-5b9f-85e7-584ca3e12fcd', '388de484-16af-59c6-88da-391750f4d7aa', 'standard', 'PS-BOXWOOD-TOPIARY-STANDARD', 'Standard', '70–80 cm with pot', 2799, null, 0, true, true),
  ('aef33e31-38f2-5f94-8721-9652eb9f083c', 'a7036e91-5ba2-5e29-91aa-fccb668c5bdb', 'standard', 'PS-SWEET-BASIL-STANDARD', 'Standard', '20–25 cm with pot', 249, null, 0, true, true),
  ('e57d32b4-d6b6-5016-a264-85653b85aa2d', '528d3aa7-1660-571b-b4bb-bd31d0ab2c91', 'standard', 'PS-SUCCULENT-TRIO-STANDARD', 'Standard', '8–12 cm each', 749, null, 0, true, true),
  ('2ee3938d-6481-564e-a80e-3c0d48599adc', 'd608a945-d260-538d-8173-78026617a8a5', 'standard', 'PS-HEIRLOOM-SEED-STARTER-KIT-STANDARD', 'Standard', 'Kit', 699, null, 0, true, true),
  ('52722f9d-749d-58c4-886e-0089b0b36a0d', 'a0dff966-dc4e-5572-9ed6-ace8fb7211d7', 'standard', 'PS-ESSENTIAL-REPOTTING-KIT-STANDARD', 'Standard', 'Kit', 899, null, 0, true, true)
on conflict (id) do update set
  code = excluded.code, sku = excluded.sku, label = excluded.label, detail = excluded.detail,
  price = excluded.price, compare_at_price = excluded.compare_at_price,
  position = excluded.position, is_default = excluded.is_default;

-- Inventory (initial stock only; existing quantities are left untouched)
insert into public.inventory (variant_id, quantity, low_stock_threshold) values
  ('e8604d79-2890-5610-b56a-287b488aab5d', 18, 5),
  ('79402bc5-0eec-5e05-8726-2b9fe60f51f1', 4, 5),
  ('52394b02-47c5-50e1-adb8-b6def6be29b6', 18, 5),
  ('b4ab47f2-92df-5038-a054-358d7d89f162', 18, 5),
  ('2616fc5a-0c4e-5b31-9078-3f83f3d34f5b', 18, 5),
  ('7a59ccf3-0445-547a-a6c2-5a0499097118', 18, 5),
  ('eb307545-6916-5d82-bc41-e278681a470e', 18, 5),
  ('0d2d868f-ef1e-59f4-9c6a-fe060ea71d7a', 18, 5),
  ('650142fe-a9ad-5f70-82bb-f456d42289a2', 18, 5),
  ('3766ff49-28a1-5c9f-a671-75af213cac04', 2, 5),
  ('6c5178cc-c38b-5a30-95b6-de375716ecf9', 18, 5),
  ('6750f47d-e391-5a83-8890-0faf40b3c6aa', 18, 5),
  ('d5383064-747e-5af0-af1a-7c5478e45e7b', 18, 5),
  ('729d97cc-8e31-5a58-be53-888e674c8c68', 18, 5),
  ('38003b24-7973-5918-86c6-702420526e8b', 18, 5),
  ('8088ca91-e1bd-5daa-aa7d-2c9bac2f82ae', 18, 5),
  ('1258692a-a992-55f3-a236-4d923d9e5b19', 18, 5),
  ('7e5dacc6-c0ab-5c7a-b8bb-5945e20d164a', 18, 5),
  ('c4f8e7ff-2f5d-588e-a6ae-fb2d163eb2ef', 18, 5),
  ('a0f74fa9-7dac-56a1-a9c8-925c785525a0', 18, 5),
  ('1379020f-6523-534b-b602-78cd6fafe162', 18, 5),
  ('eaabb9b9-ae75-5a03-ac3c-8568cb782d8e', 18, 5),
  ('47041c8c-1dad-58dc-960a-115c75b7d9cf', 18, 5),
  ('f77ab306-525c-54ac-9430-28ffa045f973', 18, 5),
  ('5a942633-43e5-5546-a435-f83543e87b46', 3, 5),
  ('3a391826-8f12-5645-ac23-5079c8c8034a', 18, 5),
  ('a6fdd02b-8529-5ea6-9e2a-c03f5088d83e', 18, 5),
  ('709e57a5-70df-5a24-bb7e-508e462888ed', 18, 5),
  ('196274c4-2fda-5d58-84cb-f4ccd74a971c', 18, 5),
  ('c20eb345-1eea-5b9f-85e7-584ca3e12fcd', 0, 5),
  ('aef33e31-38f2-5f94-8721-9652eb9f083c', 18, 5),
  ('e57d32b4-d6b6-5016-a264-85653b85aa2d', 18, 5),
  ('2ee3938d-6481-564e-a80e-3c0d48599adc', 18, 5),
  ('52722f9d-749d-58c4-886e-0089b0b36a0d', 18, 5)
on conflict (variant_id) do nothing;

-- Demo discount code
insert into public.discount_codes (code, kind, value, min_subtotal, description, is_active)
values ('DEMO10', 'percent', 10, 0, 'Demo code for this preview — 10% off', true)
on conflict (code) do nothing;

commit;
