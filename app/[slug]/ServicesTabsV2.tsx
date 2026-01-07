// app/[slug]/ServicesTabsV2.tsx
"use client";

import { useMemo, useState } from "react";
import type { Service } from "./types";

type Props = {
  services: Service[];
  primary: string;
  slug: string;
};

export default function ServicesTabsV2({ services, primary, slug }: Props) {
  const safe = Array.isArray(services) ? services : [];

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of safe) {
      const c = (s.category || "Услуги").trim() || "Услуги";
      map.set(c, (map.get(c) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [safe]);

  const [active, setActive] = useState<string>(categories[0]?.name || "Услуги");

  const items = useMemo(() => {
    const key = (active || "Услуги").trim() || "Услуги";
    return safe
      .filter((s) => ((s.category || "Услуги").trim() || "Услуги") === key)
      .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
  }, [safe, active]);

  const makeBookHref = (serviceId: string) => `/${slug}/book?serviceId=${encodeURIComponent(serviceId)}`;

  return (
    <section className="mt-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">

        {/* LEFT: Categories (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur shadow-[0_18px_50px_rgba(0,0,0,0.07)] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/10">
                <div className="text-[11px] tracking-[0.22em] text-black/45 uppercase">Категории</div>
                <div className="mt-1 text-lg font-semibold text-[#111827]">Ценоразпис</div>
              </div>

              <div className="p-2">
                {categories.map((c) => {
                  const is = c.name === active;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setActive(c.name)}
                      className={[
                        "w-full text-left rounded-2xl px-4 py-3 transition flex items-center justify-between gap-3",
                        is ? "bg-black/[0.04] ring-1 ring-black/10" : "hover:bg-black/[0.03]",
                      ].join(" ")}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-[14px] text-[#111827] truncate">{c.name}</span>
                        <span className="block text-[12px] text-black/45">{c.count} услуги</span>
                      </span>

                      <span
                        className={[
                          "shrink-0 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] border",
                          is ? "border-transparent text-white" : "border-black/10 text-black/50",
                        ].join(" ")}
                        style={is ? { background: primary } : undefined}
                      >
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 text-xs text-black/45 px-2">
              Избери категория, после натисни „Запази час“ на услугата.
            </div>
          </div>
        </aside>

        {/* MOBILE: Categories chips */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {categories.map((c) => {
              const is = c.name === active;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setActive(c.name)}
                  className={[
                    "shrink-0 rounded-full border px-4 py-2 text-[13px] transition",
                    is
                      ? "text-white border-transparent shadow-sm"
                      : "bg-white border-black/10 text-black/70 hover:text-black hover:border-black/20",
                  ].join(" ")}
                  style={is ? { background: primary } : undefined}
                >
                  {c.name} <span className={is ? "opacity-90" : "opacity-60"}>({c.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Services list */}
        <div className="rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.07)] overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-black/10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] tracking-[0.22em] text-black/45 uppercase">Категория</div>
              <div className="mt-1 text-lg md:text-xl font-semibold text-[#111827] truncate">{active}</div>
            </div>
            <div className="text-xs md:text-sm text-black/45 shrink-0">{items.length ? `${items.length} услуги` : "—"}</div>
          </div>

          {!items.length ? (
            <div className="px-5 md:px-6 py-6 text-sm text-black/60">Няма услуги в тази категория.</div>
          ) : (
            <div className="divide-y divide-black/10">
              {items.map((s) => {
                const href = makeBookHref(s.id);
                return (
                  <div key={s.id} className="px-5 md:px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[15px] md:text-[16px] leading-snug text-[#111827]">{s.name}</div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] md:text-[13px] text-black/55">
                          {Number.isFinite(Number(s.duration_min)) && s.duration_min ? (
                            <span className="inline-flex items-center rounded-full border border-black/10 bg-black/[0.03] px-2 py-1">
                              {s.duration_min} мин
                            </span>
                          ) : null}
                          {s.description ? <span className="min-w-0 line-clamp-2 md:line-clamp-1">{s.description}</span> : null}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 md:gap-4">
                        <div className="hidden sm:block text-right w-[92px]">
                          <div className="text-[11px] text-black/45">Цена</div>
                          <div className="font-semibold tabular-nums" style={{ color: primary }}>
                            {formatPriceBG(s.price_from)}
                          </div>
                        </div>

                        <a
                          href={href}
                          className={[
                            "inline-flex items-center justify-center font-semibold text-white transition select-none",
                            "shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
                            "px-3.5 py-2.5 text-[13px] rounded-full",
                            "md:px-4 md:py-2.5 md:text-sm",
                            "active:scale-[0.98]",
                            "supports-[hover:hover]:hover:brightness-110",
                          ].join(" ")}
                          style={{ background: primary }}
                        >
                          Запази час
                        </a>
                      </div>
                    </div>

                    <div className="sm:hidden mt-3 flex items-center justify-between text-[12px] text-black/55">
                      <span className="opacity-70">Цена</span>
                      <span className="font-semibold tabular-nums" style={{ color: primary }}>
                        {formatPriceBG(s.price_from)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="px-5 md:px-6 py-4 border-t border-black/10 text-xs text-black/45">
            Натисни „Запази час“ и избери дата и свободен начален час.
          </div>
        </div>
      </div>
    </section>
  );
}

function formatPriceBG(price: any) {
  const n = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toFixed(0)} €`;
}
