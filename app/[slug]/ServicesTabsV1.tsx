"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Service } from "./types";

type Props = {
  services: Service[];
  primary: string;
};

export default function ServicesTabsV1({ services, primary }: Props) {
  const params = useParams<{ slug?: string }>();
  const slug = (params?.slug || "").toString();

  const safe = Array.isArray(services) ? services : [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of safe) {
      set.add((s.category || "Услуги").trim() || "Услуги");
    }
    return Array.from(set);
  }, [safe]);

  const [active, setActive] = useState(categories[0] || "Услуги");

  const items = useMemo(() => {
    const key = (active || "Услуги").trim();
    return safe
      .filter((s) => ((s.category || "Услуги").trim() || "Услуги") === key)
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
  }, [safe, active]);

  function makeBookHref(serviceId: string) {
    if (!slug) return `/book?serviceId=${encodeURIComponent(serviceId)}`;
    return `/${encodeURIComponent(slug)}/book?serviceId=${encodeURIComponent(serviceId)}`;
  }

  return (
    <div className="mt-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const is = c === active;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={[
                "px-4 py-2 rounded-full text-sm transition border",
                is
                  ? "text-white border-transparent shadow-sm"
                  : "border-black/10 text-black/70 hover:text-black hover:border-black/20 bg-white",
              ].join(" ")}
              style={is ? { background: primary } : undefined}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="mt-6 rounded-3xl bg-white border border-black/10 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-black/10">
          <div className="text-sm text-black/50">Категория</div>
          <div className="text-xl font-semibold">{active}</div>
          <div className="mt-1 text-sm text-black/50">
            Избери услуга и натисни „Запази“.
          </div>
        </div>

        {!items.length ? (
          <div className="px-6 py-6 text-sm text-black/60">
            Няма услуги в тази категория.
          </div>
        ) : (
          <ul className="divide-y divide-black/10">
            {items.map((s) => (
              <li
                key={s.id}
                className="px-6 py-4 transition hover:bg-black/[0.02]"
              >
                <div className="flex items-start gap-4">
                  {/* LEFT: name + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[15px] md:text-base leading-snug">
                      {s.name}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-black/55">
                      {s.duration_min ? (
                        <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.02] px-2.5 py-1 text-[12px]">
                          {s.duration_min} мин
                        </span>
                      ) : null}

                      {s.description ? (
                        <span className="min-w-0 line-clamp-1">
                          {s.description}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* RIGHT: price (left) + CTA (right) */}
                  <div className="shrink-0 flex items-center gap-4">
                    {/* Price */}
                    <div className="text-right min-w-[72px]">
                      <div className="text-[11px] text-black/45">Цена</div>
                      <div
                        className="font-semibold tabular-nums text-[15px]"
                        style={{ color: primary }}
                      >
                        {formatPriceBG(s.price_from)}
                      </div>
                    </div>

                    {/* CTA */}
                    <a
                      href={makeBookHref(s.id)}
                      className={[
                        "inline-flex items-center justify-center",
                        "px-3.5 py-2 rounded-full text-[13px] font-semibold",
                        "text-white shadow-sm transition",
                        "active:scale-[0.97]",
                        "supports-[hover:hover]:hover:opacity-95",
                        "whitespace-nowrap",
                      ].join(" ")}
                      style={{ background: primary }}
                      aria-label={`Запази час за ${s.name}`}
                    >
                      Запази
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Helper */}
      <div className="mt-3 text-xs text-black/45">
        * След натискане „Запази“ избираш дата и свободен начален час.
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function formatPriceBG(price: any) {
  const n = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toFixed(0)} €`;
}
