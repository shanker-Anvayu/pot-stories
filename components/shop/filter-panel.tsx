"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { priceBuckets, type Filters } from "@/lib/filters";
import { careLabel, lightLabel, sizeLabel, tagLabel, type CareLevel, type Light, type Size, type Tag } from "@/lib/products";
import { cn } from "@/lib/format";

interface FilterPanelProps {
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
  idPrefix: string;
}

const needTags: Tag[] = ["bestseller", "new", "gift", "festive", "low-light", "pet-friendly", "beginner", "flowering", "statement"];
const lights: Light[] = ["low", "medium", "bright"];
const cares: CareLevel[] = ["easy", "moderate", "expert"];
const sizes: Size[] = ["small", "medium", "large"];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-forest-900/10 py-5 first:pt-0">
      <legend className="mb-3 text-[0.82rem] font-bold text-forest-900">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Option({
  id,
  label,
  checked,
  onToggle,
  type = "checkbox",
  name,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  type?: "checkbox" | "radio";
  name?: string;
}) {
  return (
    <label htmlFor={id} className="group flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-[0.88rem] text-forest-900">
      <input id={id} name={name} type={type} checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay peer-focus-visible:ring-offset-2",
          type === "radio" ? "rounded-full" : "rounded-md",
          checked ? "border-forest-800 bg-forest-800 text-ivory" : "border-forest-900/25 group-hover:border-forest-900/60",
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      {label}
    </label>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters, onChange, idPrefix }: FilterPanelProps) {
  return (
    <div>
      <Group title="Shop by need">
        {needTags.map((t) => (
          <Option
            key={t}
            id={`${idPrefix}-tag-${t}`}
            label={tagLabel[t]}
            checked={filters.tags.includes(t)}
            onToggle={() => onChange({ tags: toggle(filters.tags, t) })}
          />
        ))}
      </Group>
      <Group title="Light">
        {lights.map((l) => (
          <Option
            key={l}
            id={`${idPrefix}-light-${l}`}
            label={lightLabel[l]}
            checked={filters.light.includes(l)}
            onToggle={() => onChange({ light: toggle(filters.light, l) })}
          />
        ))}
      </Group>
      <Group title="Care level">
        {cares.map((c) => (
          <Option
            key={c}
            id={`${idPrefix}-care-${c}`}
            label={careLabel[c]}
            checked={filters.care.includes(c)}
            onToggle={() => onChange({ care: toggle(filters.care, c) })}
          />
        ))}
      </Group>
      <Group title="Size">
        {sizes.map((s) => (
          <Option
            key={s}
            id={`${idPrefix}-size-${s}`}
            label={sizeLabel[s]}
            checked={filters.size.includes(s)}
            onToggle={() => onChange({ size: toggle(filters.size, s) })}
          />
        ))}
      </Group>
      <Group title="Price">
        {priceBuckets.map((b) => (
          <Option
            key={b.id}
            id={`${idPrefix}-price-${b.id}`}
            type="checkbox"
            label={b.label}
            checked={filters.price === b.id}
            onToggle={() => onChange({ price: filters.price === b.id ? null : b.id })}
          />
        ))}
      </Group>
    </div>
  );
}
