"use client";

import { useMemo, useState } from "react";
import type { Service } from "./types";

export default function ServicesTabs({
  services,
  primary,
  bookingUrl,
}: {
  services: Service[];
  primary: string;
  bookingUrl: string;
}) {
  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category || "Услуги"))),
    [services]
  );

  const [active, setActive] = useState(categories[0] || "Услуги");
  const items = services.filter((s) => (s.category || "Услуги") === active);

  return (
    <div className="mt-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const is = c === active;
          return (
            <button
              key={c}
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

      {/* Menu */}
      <div className="mt-6 rounded-3xl bg-white border border-black/10 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-black/50">Категория</div>
            <div className="text-xl font-semibold">{active}</div>
          </div>
          <a
            href={bookingUrl}
            className="text-sm font-semibold underline underline-offset-4"
            style={{ color: primary }}
          >
            Запази час →
          </a>
        </div>

        <div className="divide-y divide-black/10">
          {items.map((s) => (
            <details key={s.id} className="group">
              <summary className="cursor-pointer list-none px-6 py-4 hover:bg-black/[0.02] transition">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-[15px] md:text-base leading-snug">
                        {s.name}
                      </div>
                      <div className="hidden md:block flex-1 border-b border-dotted border-black/15 translate-y-[2px]" />
                      <div className="font-semibold shrink-0" style={{ color: primary }}>
                        {s.price_from ? `${s.price_from} лв` : "—"}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-black/55 flex items-center gap-2">
                      {s.duration_min ? <span>{s.duration_min} мин</span> : null}
                      {s.description ? (
                        <>
                          <span className="h-1 w-1 rounded-full bg-black/20" />
                          <span className="line-clamp-1">{s.description}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className="h-9 w-9 rounded-xl border border-black/10 grid place-items-center text-black/60 group-open:rotate-45 transition shrink-0"
                    aria-hidden
                  >
                    +
                  </span>
                </div>
              </summary>

              <div className="px-6 pb-5 text-sm text-black/70">
                {s.description ? (
                  <p className="leading-relaxed">{s.description}</p>
                ) : (
                  <p className="leading-relaxed">Без допълнителни детайли.</p>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-black/50">Записване</span>
                  <a
                    href={bookingUrl}
                    className="font-semibold underline underline-offset-4"
                    style={{ color: primary }}
                  >
                    Избери час →
                  </a>
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
