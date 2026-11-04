"use client";

import { useId, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/admin";
import { cn } from "@/lib/format";
import { ConfirmDialog } from "./confirm-dialog";
import { inputCls, labelCls, smallBtn } from "./ui";

export interface CategoryRow {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
  imageAlt: string;
  productCount: number;
}

type Draft = Omit<CategoryRow, "productCount">;
const EMPTY: Draft = { id: "", name: "", short: "", description: "", image: "", imageAlt: "" };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ mode: "create" | "update"; draft: Draft } | null>(null);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing({ mode: "create", draft: EMPTY })} className="btn btn-primary !px-4 !py-2 text-sm">
          <Plus className="size-4" aria-hidden /> Add category
        </button>
      </div>

      <AnimatePresence initial={false}>
        {editing && (
          <motion.div key="editor" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CategoryEditor
              key={`${editing.mode}-${editing.draft.id}`}
              mode={editing.mode}
              initial={editing.draft}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
              onCancel={() => setEditing(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="flex gap-3 rounded-2xl border border-sand bg-card p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-cream">
              {c.image && <Image src={c.image} alt="" fill sizes="80px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-forest-900">{c.name}</p>
              <p className="font-mono text-[0.7rem] text-moss">
                {c.id} · short: {c.short}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-moss">{c.description}</p>
              <p className="mt-1 text-xs font-semibold text-forest-800">
                {c.productCount} product{c.productCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                aria-label={`Edit ${c.name}`}
                onClick={() => setEditing({ mode: "update", draft: { id: c.id, name: c.name, short: c.short, description: c.description, image: c.image, imageAlt: c.imageAlt } })}
                className="grid size-8 place-items-center rounded-full text-forest-800 hover:bg-sage-100"
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(c);
                }}
                className="grid size-8 place-items-center rounded-full text-clay-dark hover:bg-clay/10"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        confirmLabel="Delete category"
        pending={pendingDelete}
        error={deleteError}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          startDelete(async () => {
            const res = await deleteCategory(deleting.id);
            if (!res.ok) {
              setDeleteError(res.error);
              return;
            }
            setDeleting(null);
            router.refresh();
          })
        }
      >
        {deleting && deleting.productCount > 0
          ? `${deleting.productCount} product${deleting.productCount === 1 ? "" : "s"} will be removed from this category (the products themselves are kept). `
          : ""}
        Links to /shop?category={deleting?.id} will stop filtering.
      </ConfirmDialog>
    </div>
  );
}

function CategoryEditor({ mode, initial, onDone, onCancel }: { mode: "create" | "update"; initial: Draft; onDone: () => void; onCancel: () => void }) {
  const uid = useId();
  const [d, setD] = useState(initial);
  const [idTouched, setIdTouched] = useState(mode === "update");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = (key: keyof Draft) => ({
    id: `${uid}-${key}`,
    value: d[key],
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${uid}-${key}-err` : undefined,
    onChange: (e: { target: { value: string } }) => setD((prev) => ({ ...prev, [key]: e.target.value })),
  });
  const err = (k: keyof Draft) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="mt-1 text-xs font-medium text-clay-dark">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setFormError(null);
          const res = await saveCategory(d, mode);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            setFormError(res.error);
            return;
          }
          onDone();
        });
      }}
      className="rounded-2xl border border-forest-800/30 bg-card p-4 sm:p-5"
    >
      <h2 className="text-sm font-bold text-forest-900">{mode === "create" ? "New category" : `Edit “${initial.name}”`}</h2>
      {formError && (
        <p role="alert" className="mt-2 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay-dark">
          {formError}
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor={`${uid}-name`} className={labelCls}>
            Name
          </label>
          <input
            {...field("name")}
            className={inputCls}
            maxLength={80}
            onChange={(e) => {
              const name = e.target.value;
              setD((prev) => ({ ...prev, name, id: idTouched ? prev.id : slugify(name) }));
            }}
          />
          {err("name")}
        </div>
        <div>
          <label htmlFor={`${uid}-short`} className={labelCls}>
            Short name
          </label>
          <input {...field("short")} className={inputCls} maxLength={30} />
          {err("short")}
        </div>
        <div>
          <label htmlFor={`${uid}-id`} className={labelCls}>
            Id (URL slug)
          </label>
          <input
            {...field("id")}
            className={cn(inputCls, "font-mono text-xs", mode === "update" && "bg-cream text-moss")}
            readOnly={mode === "update"}
            maxLength={40}
            onChange={(e) => {
              setIdTouched(true);
              setD((prev) => ({ ...prev, id: e.target.value.toLowerCase() }));
            }}
          />
          {mode === "update" && <p className="mt-1 text-[0.7rem] text-moss">Ids can&rsquo;t change once created.</p>}
          {err("id")}
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor={`${uid}-description`} className={labelCls}>
            Description
          </label>
          <input {...field("description")} className={inputCls} maxLength={300} />
          {err("description")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-image`} className={labelCls}>
            Image URL
          </label>
          <input {...field("image")} className={cn(inputCls, "font-mono text-xs")} placeholder="https://images.unsplash.com/…" />
          {err("image")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-imageAlt`} className={labelCls}>
            Image alt text
          </label>
          <input {...field("imageAlt")} className={inputCls} maxLength={200} />
          {err("imageAlt")}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={cn(smallBtn, "px-4 py-2 text-sm text-forest-800 hover:bg-sage-100")}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary !px-5 !py-2 disabled:opacity-60">
          {pending ? "Saving…" : mode === "create" ? "Create category" : "Save category"}
        </button>
      </div>
    </form>
  );
}
