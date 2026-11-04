"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, ImagePlus, Link2, Plus, Trash2, Upload } from "lucide-react";
import { deleteProduct, saveProduct, uploadProductImage } from "@/app/actions/admin";
import { careLabel, lightLabel, sizeLabel, tagLabel, type CareLevel, type Light, type Size, type Tag } from "@/lib/products";
import { cn } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { inputCls, labelCls, smallBtn } from "./ui";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ProductFormVariant {
  id?: string;
  code: string;
  label: string;
  detail: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  lowStockThreshold: string;
  isActive: boolean;
}

export interface ProductFormValues {
  id?: string;
  name: string;
  slug: string;
  botanical: string;
  categoryIds: string[];
  tags: string[];
  light: Light;
  care: CareLevel;
  size: Size;
  height: string;
  water: string;
  petFriendly: boolean;
  allowsPlanter: boolean;
  shortDescription: string;
  description: string;
  careNotes: string[];
  isActive: boolean;
  images: { url: string; alt: string }[];
  variants: ProductFormVariant[];
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  botanical: "",
  categoryIds: [],
  tags: [],
  light: "medium",
  care: "easy",
  size: "medium",
  height: "",
  water: "",
  petFriendly: false,
  allowsPlanter: true,
  shortDescription: "",
  description: "",
  careNotes: [],
  isActive: false,
  images: [],
  variants: [
    { code: "standard", label: "Standard", detail: "", price: "", compareAtPrice: "", stock: "0", lowStockThreshold: "5", isActive: true },
  ],
};

type Keyed<T> = T & { key: string };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const move = <T,>(arr: T[], from: number, to: number) => {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** Only preview URLs from hosts the server will accept (avoids loading arbitrary third-party images). */
const canPreview = (url: string) =>
  url.startsWith("https://images.unsplash.com/") || /^\/api\/demo-uploads\/[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(url) || /^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/product-images\//.test(url);

const rowMotion = {
  layout: true,
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: { duration: 0.18 },
} as const;

/* ------------------------------------------------------------------ */
/* Form                                                                */
/* ------------------------------------------------------------------ */

type ProductFormProps = { initial: ProductFormValues; categories: { id: string; name: string }[] };

/**
 * Next keeps recently visited routes mounted (hidden) so their state survives
 * back/forward. After a successful create we bump the key so returning to
 * "New product" shows an empty form rather than the product just created.
 */
export function ProductForm(props: ProductFormProps) {
  const [generation, setGeneration] = useState(0);
  return <ProductFormInner key={generation} {...props} onCreated={() => setGeneration((g) => g + 1)} />;
}

function ProductFormInner({ initial, categories, onCreated }: ProductFormProps & { onCreated: () => void }) {
  const router = useRouter();
  const formId = useId();
  const isEdit = Boolean(initial.id);
  const seq = useRef(0);
  const nextKey = () => `k${++seq.current}`;

  const [v, setV] = useState<Omit<ProductFormValues, "images" | "variants" | "careNotes">>(() => {
    const { images: _i, variants: _v, careNotes: _c, ...rest } = initial;
    void _i;
    void _v;
    void _c;
    return rest;
  });
  const [images, setImages] = useState<Keyed<{ url: string; alt: string }>[]>(() => initial.images.map((img, i) => ({ ...img, key: `i${i}` })));
  const [variants, setVariants] = useState<Keyed<ProductFormVariant>[]>(() => initial.variants.map((row, i) => ({ ...row, key: `v${i}` })));
  const [notes, setNotes] = useState<Keyed<{ text: string }>[]>(() => initial.careNotes.map((text, i) => ({ text, key: `n${i}` })));
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };
  const err = (key: string) => errors[key];
  const fid = (key: string) => `${formId}-${key.replace(/\./g, "-")}`;
  const aria = (key: string) => (errors[key] ? { "aria-invalid": true as const, "aria-describedby": `${fid(key)}-err` } : {});

  /* --- images --- */
  const addImage = (url: string) => setImages((prev) => [...prev, { url, alt: prev.length === 0 ? v.name : "", key: nextKey() }]);
  const onUpload = (file: File) =>
    startUpload(async () => {
      setUploadError(null);
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Images must be 5 MB or smaller.");
        return;
      }
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadProductImage(fd);
      if (!res.ok) setUploadError(res.error);
      else addImage(res.data.url);
      if (fileRef.current) fileRef.current.value = "";
    });

  /* --- submit --- */
  const submit = () =>
    startSave(async () => {
      setFormError(null);
      setNotice(null);
      const payload = {
        ...v,
        careNotes: notes.map((n) => n.text),
        images: images.map(({ url, alt }) => ({ url: url.trim(), alt: alt.trim() })),
        variants: variants.map(({ key: _k, ...row }) => {
          void _k;
          return {
            ...row,
            price: row.price.trim() === "" ? "" : Number(row.price),
            compareAtPrice: row.compareAtPrice.trim() === "" ? null : Number(row.compareAtPrice),
            stock: row.stock.trim() === "" ? "" : Number(row.stock),
            lowStockThreshold: row.lowStockThreshold.trim() === "" ? "" : Number(row.lowStockThreshold),
          };
        }),
      };
      const res = await saveProduct(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setErrors({});
      if (!isEdit) {
        router.push(`/admin/products/${res.data.id}?created=1`);
        onCreated();
        return;
      }
      setNotice("Saved. The storefront has been refreshed.");
      router.refresh();
    });

  const errorCount = Object.keys(errors).length;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6 pb-24"
    >
      <div ref={summaryRef} tabIndex={-1} aria-live="polite" className="outline-none">
        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay-dark"
            >
              <p className="font-semibold">{formError}</p>
              {errorCount > 1 && <p className="mt-0.5 text-xs">{errorCount} fields need attention.</p>}
            </motion.div>
          )}
          {notice && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl bg-leaf/60 px-4 py-3 text-sm font-semibold text-forest-900">
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {/* Basics */}
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" id={fid("name")} error={err("name")} required>
                <input
                  id={fid("name")}
                  className={inputCls}
                  value={v.name}
                  maxLength={120}
                  onChange={(e) => {
                    const name = e.target.value;
                    setV((prev) => ({ ...prev, name, slug: slugTouched ? prev.slug : slugify(name) }));
                  }}
                  {...aria("name")}
                />
              </Field>
              <Field label="URL slug" id={fid("slug")} error={err("slug")} hint={`/shop/${v.slug || "…"}`} required>
                <input
                  id={fid("slug")}
                  className={cn(inputCls, "font-mono text-[0.82rem]")}
                  value={v.slug}
                  maxLength={80}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                  onBlur={() => set("slug", slugify(v.slug))}
                  {...aria("slug")}
                />
              </Field>
              <Field label="Botanical name" id={fid("botanical")} error={err("botanical")}>
                <input id={fid("botanical")} className={cn(inputCls, "italic")} value={v.botanical} maxLength={120} onChange={(e) => set("botanical", e.target.value)} {...aria("botanical")} />
              </Field>
              <Field label="Short description" id={fid("shortDescription")} error={err("shortDescription")} required className="sm:col-span-2">
                <input
                  id={fid("shortDescription")}
                  className={inputCls}
                  value={v.shortDescription}
                  maxLength={300}
                  onChange={(e) => set("shortDescription", e.target.value)}
                  {...aria("shortDescription")}
                />
              </Field>
              <Field label="Description" id={fid("description")} error={err("description")} required className="sm:col-span-2">
                <textarea
                  id={fid("description")}
                  className={cn(inputCls, "min-h-32")}
                  value={v.description}
                  maxLength={5000}
                  onChange={(e) => set("description", e.target.value)}
                  {...aria("description")}
                />
              </Field>
            </div>
          </Section>

          {/* Images */}
          <Section title="Images" description="The first image is the main product photo. Alt text is required for every image.">
            {err("images") && <FieldError id={`${fid("images")}-err`}>{err("images")}</FieldError>}
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {images.map((img, i) => (
                  <motion.li key={img.key} {...rowMotion} className="flex gap-3 rounded-xl border border-sand bg-ivory p-2.5">
                    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {canPreview(img.url) && !err(`images.${i}.url`) ? (
                        <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
                      ) : (
                        <ImagePlus className="absolute inset-0 m-auto size-5 text-moss" aria-hidden />
                      )}
                      {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-forest-900/85 px-1.5 text-[0.6rem] font-bold text-ivory">Main</span>}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <label htmlFor={fid(`images.${i}.url`)} className="sr-only">
                          Image {i + 1} URL
                        </label>
                        <input
                          id={fid(`images.${i}.url`)}
                          className={cn(inputCls, "py-1.5 font-mono text-xs")}
                          value={img.url}
                          onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, url: e.target.value } : x)))}
                          {...aria(`images.${i}.url`)}
                        />
                        {err(`images.${i}.url`) && <FieldError id={`${fid(`images.${i}.url`)}-err`}>{err(`images.${i}.url`)}</FieldError>}
                      </div>
                      <div>
                        <label htmlFor={fid(`images.${i}.alt`)} className="sr-only">
                          Image {i + 1} alt text
                        </label>
                        <input
                          id={fid(`images.${i}.alt`)}
                          className={cn(inputCls, "py-1.5 text-xs")}
                          placeholder="Alt text — describe the photo"
                          value={img.alt}
                          maxLength={200}
                          onChange={(e) => setImages((prev) => prev.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))}
                          {...aria(`images.${i}.alt`)}
                        />
                        {err(`images.${i}.alt`) && <FieldError id={`${fid(`images.${i}.alt`)}-err`}>{err(`images.${i}.alt`)}</FieldError>}
                      </div>
                    </div>
                    <RowControls
                      label={`image ${i + 1}`}
                      index={i}
                      count={images.length}
                      onMove={(to) => setImages((prev) => move(prev, i, to))}
                      onRemove={() => setImages((prev) => prev.filter((x) => x.key !== img.key))}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                id={fid("upload")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
              <label
                htmlFor={fid("upload")}
                className={cn(smallBtn, "cursor-pointer border border-forest-800 bg-card py-2 text-forest-900 hover:bg-sage-100", uploading && "pointer-events-none opacity-60")}
              >
                <Upload className="size-3.5" aria-hidden />
                {uploading ? "Uploading…" : "Upload image"}
              </label>
              <div className="flex flex-1 gap-2">
                <label htmlFor={fid("paste")} className="sr-only">
                  Image URL to add
                </label>
                <input
                  id={fid("paste")}
                  className={cn(inputCls, "py-1.5 text-xs")}
                  placeholder="…or paste an https://images.unsplash.com/ URL"
                  value={pasteUrl}
                  onChange={(e) => setPasteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (pasteUrl.trim()) {
                        addImage(pasteUrl.trim());
                        setPasteUrl("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!pasteUrl.trim()}
                  onClick={() => {
                    addImage(pasteUrl.trim());
                    setPasteUrl("");
                  }}
                  className={cn(smallBtn, "shrink-0 bg-sage-100 text-forest-900 hover:bg-sage-200")}
                >
                  <Link2 className="size-3.5" aria-hidden /> Add
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-moss">JPEG, PNG, WebP or AVIF, up to 5 MB.</p>
            {uploadError && <FieldError id={`${fid("upload")}-err`}>{uploadError}</FieldError>}
          </Section>

          {/* Variants */}
          <Section
            title="Variants & stock"
            description="Each variant is a size or format with its own price and stock. The first row is the default shown in the store."
          >
            {err("variants") && <FieldError id={`${fid("variants")}-err`}>{err("variants")}</FieldError>}
            <div className="space-y-2">
              <div className="hidden grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_5.5rem_4.5rem_4.5rem_3.5rem_4.5rem] gap-2 px-2.5 text-[0.65rem] font-bold tracking-wider text-moss uppercase 2xl:grid">
                <span>Code</span>
                <span>Label</span>
                <span>Detail</span>
                <span>Price ₹</span>
                <span>Compare ₹</span>
                <span>Stock</span>
                <span>Low at</span>
                <span>Active</span>
                <span className="sr-only">Actions</span>
              </div>
              <AnimatePresence initial={false}>
                {variants.map((row, i) => {
                  const upd = (patch: Partial<ProductFormVariant>) => {
                    setVariants((prev) => prev.map((x) => (x.key === row.key ? { ...x, ...patch } : x)));
                    setNotice(null);
                  };
                  const p = `variants.${i}`;
                  return (
                    <motion.fieldset
                      key={row.key}
                      {...rowMotion}
                      className="grid grid-cols-2 gap-2 rounded-xl border border-sand bg-ivory p-2.5 sm:grid-cols-4 2xl:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_5.5rem_4.5rem_4.5rem_3.5rem_4.5rem] 2xl:items-start"
                    >
                      <legend className="sr-only">
                        Variant {i + 1}
                        {i === 0 ? " (default)" : ""}
                      </legend>
                      <VCell label="Code" id={fid(`${p}.code`)} error={err(`${p}.code`)}>
                        <input id={fid(`${p}.code`)} className={cn(inputCls, "px-2 py-1.5 font-mono text-xs")} value={row.code} maxLength={30} onChange={(e) => upd({ code: e.target.value.toLowerCase() })} {...aria(`${p}.code`)} />
                      </VCell>
                      <VCell label="Label" id={fid(`${p}.label`)} error={err(`${p}.label`)}>
                        <input id={fid(`${p}.label`)} className={cn(inputCls, "px-2 py-1.5 text-xs")} value={row.label} maxLength={60} onChange={(e) => upd({ label: e.target.value })} {...aria(`${p}.label`)} />
                      </VCell>
                      <VCell label="Detail" id={fid(`${p}.detail`)} error={err(`${p}.detail`)} className="col-span-2 sm:col-span-2 2xl:col-span-1">
                        <input id={fid(`${p}.detail`)} className={cn(inputCls, "px-2 py-1.5 text-xs")} placeholder="e.g. 20 cm nursery pot" value={row.detail} maxLength={120} onChange={(e) => upd({ detail: e.target.value })} {...aria(`${p}.detail`)} />
                      </VCell>
                      <VCell label="Price ₹" id={fid(`${p}.price`)} error={err(`${p}.price`)}>
                        <NumInput id={fid(`${p}.price`)} value={row.price} min={1} onChange={(price) => upd({ price })} a={aria(`${p}.price`)} />
                      </VCell>
                      <VCell label="Compare-at ₹" id={fid(`${p}.compareAtPrice`)} error={err(`${p}.compareAtPrice`)}>
                        <NumInput id={fid(`${p}.compareAtPrice`)} value={row.compareAtPrice} min={1} placeholder="—" onChange={(compareAtPrice) => upd({ compareAtPrice })} a={aria(`${p}.compareAtPrice`)} />
                      </VCell>
                      <VCell label="Stock" id={fid(`${p}.stock`)} error={err(`${p}.stock`)}>
                        <NumInput id={fid(`${p}.stock`)} value={row.stock} min={0} onChange={(stock) => upd({ stock })} a={aria(`${p}.stock`)} />
                      </VCell>
                      <VCell label="Low at" id={fid(`${p}.lowStockThreshold`)} error={err(`${p}.lowStockThreshold`)}>
                        <NumInput id={fid(`${p}.lowStockThreshold`)} value={row.lowStockThreshold} min={0} onChange={(lowStockThreshold) => upd({ lowStockThreshold })} a={aria(`${p}.lowStockThreshold`)} />
                      </VCell>
                      <div className="flex flex-col">
                        <span className="mb-1 text-[0.65rem] font-bold tracking-wider text-moss uppercase 2xl:sr-only">Active</span>
                        <label className="inline-flex h-8 items-center gap-2 text-xs">
                          <input type="checkbox" checked={row.isActive} onChange={(e) => upd({ isActive: e.target.checked })} className="size-4 accent-forest-700" />
                          <span className="2xl:sr-only">Sell this variant</span>
                        </label>
                      </div>
                      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-4 2xl:col-span-1 2xl:justify-end">
                        {i === 0 ? <span className="text-[0.65rem] font-bold text-forest-700 2xl:hidden">Default</span> : <span />}
                        <RowControls
                          horizontal
                          label={`variant ${row.label || i + 1}`}
                          index={i}
                          count={variants.length}
                          onMove={(to) => setVariants((prev) => move(prev, i, to))}
                          onRemove={variants.length > 1 ? () => setVariants((prev) => prev.filter((x) => x.key !== row.key)) : undefined}
                        />
                      </div>
                    </motion.fieldset>
                  );
                })}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  { key: nextKey(), code: "", label: "", detail: "", price: prev[0]?.price ?? "", compareAtPrice: "", stock: "0", lowStockThreshold: prev[0]?.lowStockThreshold ?? "5", isActive: true },
                ])
              }
              className={cn(smallBtn, "mt-3 bg-sage-100 py-2 text-forest-900 hover:bg-sage-200")}
            >
              <Plus className="size-3.5" aria-hidden /> Add variant
            </button>
          </Section>

          {/* Care notes */}
          <Section title="Care notes" description="Short tips shown on the product page.">
            {err("careNotes") && <FieldError id={`${fid("careNotes")}-err`}>{err("careNotes")}</FieldError>}
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {notes.map((n, i) => (
                  <motion.li key={n.key} {...rowMotion} className="flex items-start gap-2">
                    <label htmlFor={fid(`note-${n.key}`)} className="sr-only">
                      Care note {i + 1}
                    </label>
                    <input
                      id={fid(`note-${n.key}`)}
                      className={cn(inputCls, "py-1.5")}
                      value={n.text}
                      maxLength={300}
                      onChange={(e) => setNotes((prev) => prev.map((x) => (x.key === n.key ? { ...x, text: e.target.value } : x)))}
                    />
                    <RowControls
                      horizontal
                      label={`care note ${i + 1}`}
                      index={i}
                      count={notes.length}
                      onMove={(to) => setNotes((prev) => move(prev, i, to))}
                      onRemove={() => setNotes((prev) => prev.filter((x) => x.key !== n.key))}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <button
              type="button"
              disabled={notes.length >= 12}
              onClick={() => setNotes((prev) => [...prev, { key: nextKey(), text: "" }])}
              className={cn(smallBtn, "mt-3 bg-sage-100 py-2 text-forest-900 hover:bg-sage-200")}
            >
              <Plus className="size-3.5" aria-hidden /> Add care note
            </button>
          </Section>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <Section title="Visibility">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} className="mt-0.5 size-4 accent-forest-700" />
              <span>
                <span className="block text-sm font-semibold text-forest-900">Active — visible in the store</span>
                <span className="block text-xs text-moss">Hidden products can&rsquo;t be found, viewed or bought.</span>
              </span>
            </label>
          </Section>

          <Section title="Categories" description="Choose at least one.">
            <fieldset aria-describedby={err("categoryIds") ? `${fid("categoryIds")}-err` : undefined}>
              <legend className="sr-only">Categories</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sage-50">
                    <input
                      type="checkbox"
                      className="size-4 accent-forest-700"
                      checked={v.categoryIds.includes(c.id)}
                      onChange={(e) => set("categoryIds", e.target.checked ? [...v.categoryIds, c.id] : v.categoryIds.filter((x) => x !== c.id))}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
            {err("categoryIds") && <FieldError id={`${fid("categoryIds")}-err`}>{err("categoryIds")}</FieldError>}
          </Section>

          <Section title="Tags">
            <div role="group" aria-label="Tags" className="flex flex-wrap gap-1.5">
              {(Object.keys(tagLabel) as Tag[]).map((t) => {
                const on = v.tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("tags", on ? v.tags.filter((x) => x !== t) : [...v.tags, t])}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      on ? "border-forest-800 bg-forest-800 text-ivory" : "border-oat bg-ivory text-forest-800 hover:bg-sage-100",
                    )}
                  >
                    {tagLabel[t]}
                  </button>
                );
              })}
            </div>
            {err("tags") && <FieldError id={`${fid("tags")}-err`}>{err("tags")}</FieldError>}
          </Section>

          <Section title="Plant details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <Field label="Light" id={fid("light")} error={err("light")}>
                <select id={fid("light")} className={inputCls} value={v.light} onChange={(e) => set("light", e.target.value as Light)}>
                  {(Object.keys(lightLabel) as Light[]).map((k) => (
                    <option key={k} value={k}>
                      {lightLabel[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Care" id={fid("care")} error={err("care")}>
                <select id={fid("care")} className={inputCls} value={v.care} onChange={(e) => set("care", e.target.value as CareLevel)}>
                  {(Object.keys(careLabel) as CareLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {careLabel[k]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Size" id={fid("size")} error={err("size")}>
                <select id={fid("size")} className={inputCls} value={v.size} onChange={(e) => set("size", e.target.value as Size)}>
                  {(Object.keys(sizeLabel) as Size[]).map((k) => (
                    <option key={k} value={k}>
                      {sizeLabel[k]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label="Height" id={fid("height")} error={err("height")}>
                <input id={fid("height")} className={inputCls} placeholder="e.g. 45–60 cm" value={v.height} maxLength={60} onChange={(e) => set("height", e.target.value)} {...aria("height")} />
              </Field>
              <Field label="Watering" id={fid("water")} error={err("water")}>
                <input id={fid("water")} className={inputCls} placeholder="e.g. Every 7–10 days" value={v.water} maxLength={120} onChange={(e) => set("water", e.target.value)} {...aria("water")} />
              </Field>
            </div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={v.petFriendly} onChange={(e) => set("petFriendly", e.target.checked)} className="size-4 accent-forest-700" />
                Pet friendly
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={v.allowsPlanter} onChange={(e) => set("allowsPlanter", e.target.checked)} className="size-4 accent-forest-700" />
                Offer decorative planters
              </label>
            </div>
          </Section>

          {isEdit && (
            <Section title="Danger zone">
              <p className="mb-3 text-xs text-moss">Deleting removes the product and its variants. Past orders keep their own copy of the details.</p>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
                className={cn(smallBtn, "border border-clay/50 py-2 text-clay-dark hover:bg-clay/10")}
              >
                <Trash2 className="size-3.5" aria-hidden /> Delete product
              </button>
            </Section>
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-ivory/95 backdrop-blur supports-[backdrop-filter]:bg-ivory/80">
        <div className="mx-auto flex max-w-[96rem] items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          {errorCount > 0 && <span className="mr-auto text-xs font-semibold text-clay-dark">{errorCount} field{errorCount === 1 ? "" : "s"} need attention</span>}
          <Link href="/admin/products" className="rounded-full px-4 py-2 text-sm font-bold text-forest-800 hover:bg-sage-100">
            Cancel
          </Link>
          <button type="submit" disabled={saving || uploading} className="btn btn-primary !px-5 !py-2.5 disabled:opacity-60">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>

      {isEdit && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete “${initial.name}”?`}
          confirmLabel="Delete product"
          pending={deleting}
          error={deleteError}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            startDelete(async () => {
              const res = await deleteProduct(initial.id);
              if (!res.ok) {
                setDeleteError(res.error);
                return;
              }
              router.replace("/admin/products");
              router.refresh();
            })
          }
        >
          This permanently removes the product, its images list and all variants from the catalogue. Customers&rsquo; wishlists and carts will drop it. This
          can&rsquo;t be undone.
        </ConfirmDialog>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-sand bg-card p-4 sm:p-5">
      <h2 className="text-sm font-bold text-forest-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-moss">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  id,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
        {required && (
          <span className="text-clay" aria-hidden>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 truncate font-mono text-[0.7rem] text-moss">{hint}</p>}
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

function VCell({ label, id, error, className, children }: { label: string; id: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="mb-1 block text-[0.65rem] font-bold tracking-wider text-moss uppercase 2xl:sr-only">
        {label}
      </label>
      {children}
      {error && <FieldError id={`${id}-err`}>{error}</FieldError>}
    </div>
  );
}

function NumInput({
  id,
  value,
  min,
  placeholder,
  onChange,
  a,
}: {
  id: string;
  value: string;
  min: number;
  placeholder?: string;
  onChange: (v: string) => void;
  a: Record<string, unknown>;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      step={1}
      min={min}
      placeholder={placeholder}
      className={cn(inputCls, "px-2 py-1.5 text-xs tabular-nums")}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...a}
    />
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs font-medium text-clay-dark">
      {children}
    </p>
  );
}

function RowControls({
  label,
  index,
  count,
  onMove,
  onRemove,
  horizontal,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove?: () => void;
  horizontal?: boolean;
}) {
  const btn = "grid size-7 place-items-center rounded-full text-forest-800 transition-colors hover:bg-sage-100 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className={cn("flex shrink-0 gap-0.5", horizontal ? "flex-row" : "flex-col")}>
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="size-3.5" aria-hidden />
      </button>
      <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="size-3.5" aria-hidden />
      </button>
      {onRemove && (
        <button type="button" className={cn(btn, "text-clay-dark hover:bg-clay/10")} onClick={onRemove} aria-label={`Remove ${label}`}>
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
