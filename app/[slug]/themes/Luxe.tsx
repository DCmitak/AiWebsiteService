// app/[slug]/themes/Luxe.tsx
import ServicesTabs from "../ServicesTabs";
import type { PublicPayload, Review, Service } from "../types";

export default function LuxeTheme({ client, settings, services, gallery, reviews }: PublicPayload) {
  const primary = settings?.primary_color || "#dca263";
  const hero = settings?.hero_image_url || "";
  const booking = settings?.booking_url || "#";
  const phone = settings?.phone || "";
  const address = settings?.address || "";
  const hours = settings?.working_hours || "";
  const about = settings?.about_text || "";
  const mapUrl = settings?.google_maps_url || "";
  const brands: string[] = Array.isArray(settings?.brands) ? (settings.brands as string[]) : [];
  const heroTitle = (settings?.hero_title || "").trim();
  const heroSubtitle = (settings?.hero_subtitle || "").trim();

  const facebook = settings?.facebook_url || "";
  const instagram = settings?.instagram_url || "";
  const tiktok = settings?.tiktok_url || "";
  const youtube = settings?.youtube_url || "";

  const rev = (reviews || []) as Review[];
  const svc = (services || []) as Service[];

  // clean maps link (avoid iframe “Oops”)
  const mapLink =
    mapUrl
      ? mapUrl.includes("output=embed")
        ? mapUrl.replace("output=embed", "")
        : mapUrl
      : "";

  return (
    <main className="min-h-screen text-black bg-[#fff7fb]">
      {/* luxe background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute -top-28 -left-28 h-[520px] w-[520px] rounded-full blur-3xl opacity-30"
          style={{ background: primary }}
        />
        <div className="absolute top-24 right-[-120px] h-[520px] w-[520px] rounded-full blur-3xl opacity-20 bg-pink-200" />
        <div className="absolute bottom-[-180px] left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-18 bg-amber-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.75),transparent_60%)]" />
      </div>

      <div className="h-[3px]" style={{ background: primary }} />

      {/* HEADER */}
      <header className="sticky top-0 z-30">
        <div className="backdrop-blur bg-white/75 border-b border-black/5">
          <div className={cx(siteContainer, "py-4 flex items-center justify-between gap-4")}>
            {/* brand */}
            <a href="#" className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-full shadow-sm border border-black/10"
                style={{
                  background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), ${primary})`,
                }}
                aria-hidden
              />
              <div className="min-w-0 leading-tight">
                <div className="font-semibold truncate">{client.business_name}</div>
                <div className="text-xs text-black/55 truncate">{client.city}</div>
              </div>
            </a>

            {/* nav */}
            <nav className="hidden lg:flex items-center gap-1 rounded-full bg-white/90 border border-black/10 px-2 py-2 shadow-sm">
              <NavLink href="#about" label="За нас" />
              <NavLink href="#services" label="Услуги" />
              <NavLink href="#gallery" label="Галерия" />
              <NavLink href="#reviews" label="Отзиви" />
              <NavLink href="#contact" label="Контакт" />
            </nav>

            {/* actions */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                <SocialIcon href={facebook} label="Facebook" kind="facebook" />
                <SocialIcon href={instagram} label="Instagram" kind="instagram" />
                <SocialIcon href={tiktok} label="TikTok" kind="tiktok" />
                <SocialIcon href={youtube} label="YouTube" kind="youtube" />
              </div>

              <a
                href="#book"
                className="px-5 py-2.5 rounded-full text-white font-semibold shadow-md hover:shadow-lg transition"
                style={{ background: primary }}
              >
                Запази час
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className={cx(siteContainer, "pt-10 pb-14 md:pt-16 md:pb-24")}>
        <div className="grid lg:grid-cols-12 gap-12 xl:gap-16 items-center">
          {/* left */}
          <div className="lg:col-span-6 space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/70 border border-black/10 text-[12px] text-black/70">
                Премиум маникюр • {client.city}
              </span>
              <span className="text-[12px] text-black/45">
                ✦ дълготраен гланц • чиста форма • внимание към детайла
              </span>
            </div>

            {/* brand in hero */}
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-full border border-black/10 shadow-sm"
                style={{
                  background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), ${primary})`,
                }}
                aria-hidden
              />
              <div className="leading-tight">
                <div className="text-[13px] font-semibold tracking-wide">{client.business_name}</div>
                <div className="text-[12px] text-black/50">{client.city}</div>
              </div>
            </div>

            {heroTitle ? (
              <h1 className="lux-h text-5xl md:text-6xl lg:text-7xl leading-[0.92]">
                {heroTitle}
              </h1>
            ) : null}


            {heroSubtitle ? (
              <p className="text-lg md:text-xl text-black/60 leading-relaxed max-w-2xl">
                {heroSubtitle}
              </p>
            ) : null}


            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#book"
                className="px-6 py-3 rounded-full text-white font-semibold shadow-md hover:shadow-lg transition"
                style={{ background: primary }}
              >
                Запази час
              </a>

              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="px-6 py-3 rounded-full bg-white/70 border border-black/10 text-black/80 hover:border-black/20 transition"
                >
                  Обади се
                </a>
              ) : null}

              <a
                href="#services"
                className="px-6 py-3 rounded-full bg-white/70 border border-black/10 text-black/80 hover:border-black/20 transition"
              >
                Виж услугите
              </a>
            </div>

            {/* trust */}
            <div className="grid grid-cols-3 gap-3 pt-5 max-w-2xl">
              <TrustItem primary={primary} top="90+" bottom="доволни клиенти" />
              <TrustItem primary={primary} top="5.0" bottom="средна оценка" />
              <TrustItem primary={primary} top="7/7" bottom="работни дни" />
            </div>

            <div className="text-sm text-black/45">
              * Резервациите ще са с наш личен календар (без външни провайдъри). Скоро.
            </div>
          </div>

          {/* right */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-[44px] overflow-hidden border border-black/10 shadow-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  hero ||
                  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1600&q=80"
                }
                alt=""
                className="w-full h-[460px] md:h-[560px] object-cover"
              />

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.70),transparent_55%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6">
                <div className="rounded-3xl bg-white/85 backdrop-blur border border-black/10 shadow-lg p-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-black/45">Локация</div>
                      <div className="font-semibold truncate">{address || "София"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-widest text-black/45">Работно време</div>
                      <div className="font-semibold">{hours || "09:00–21:00"}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <a
                      href="#book"
                      className="flex-1 text-center px-5 py-3 rounded-full text-white font-semibold shadow-sm"
                      style={{ background: primary }}
                    >
                      Запази час
                    </a>

                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-3 rounded-full bg-white border border-black/10 text-black/80 hover:border-black/20 transition"
                      >
                        Google Maps
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute -z-10 -top-12 -right-12 h-56 w-56 rounded-full blur-3xl opacity-25"
              style={{ background: primary }}
            />
            <div className="absolute -z-10 bottom-10 -left-12 h-52 w-52 rounded-full blur-3xl opacity-18 bg-pink-200" />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className={cx(siteContainer, "pb-14 md:pb-20")}>
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-xs uppercase tracking-widest text-black/50">нашата философия</div>
            <h2 className="lux-h text-3xl md:text-4xl mt-2">За нас</h2>
            <p className="text-black/60 mt-3">Красота, стил и спокойствие — в едно преживяване.</p>
          </div>

          <div className="bg-white/70 backdrop-blur border border-black/10 rounded-3xl p-7 shadow-sm">
            <div className="whitespace-pre-line leading-relaxed text-black/75">
              {about || "Добави about_text в site_settings."}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className={cx(siteContainer, "pb-14 md:pb-20")}>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-black/50">меню</div>
            <h2 className="lux-h text-3xl md:text-4xl mt-2">Услуги и цени</h2>
            <p className="text-black/60 mt-2">Изчистено меню, детайли при нужда.</p>
          </div>

          <a
            href="#book"
            className="px-4 py-2 rounded-full bg-white/80 border border-black/10 text-black/80 hover:border-black/20 transition"
          >
            Запази час →
          </a>
        </div>

        <ServicesTabs services={svc} primary={primary} bookingUrl="#book" />
      </section>

      {/* GALLERY */}
      <section id="gallery" className={cx(siteContainer, "pb-14 md:pb-20")}>
        <div>
          <div className="text-xs uppercase tracking-widest text-black/50">галерия</div>
          <h2 className="lux-h text-3xl md:text-4xl mt-2">Реални резултати</h2>
          <p className="text-black/60 mt-2">Снимки от работата ни.</p>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
          {(gallery || []).slice(0, 9).map((img) => (
            <div
              key={img.id}
              className="rounded-3xl overflow-hidden border border-black/10 bg-white shadow-sm hover:shadow-md transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="" className="w-full h-44 md:h-60 object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className={cx(siteContainer, "pb-14 md:pb-20")}>
        <div>
          <div className="text-xs uppercase tracking-widest text-black/50">отзиви</div>
          <h2 className="lux-h text-3xl md:text-4xl mt-2">Доверие</h2>
          <p className="text-black/60 mt-2">Истински думи. Истински резултати.</p>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {(rev.length ? rev : demoReviews).slice(0, 3).map((r) => (
            <div key={r.id} className="rounded-3xl bg-white/70 backdrop-blur border border-black/10 shadow-sm p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">{r.author}</div>
                <Stars count={r.rating} primary={primary} />
              </div>
              <p className="mt-3 text-black/70 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BRANDS */}
      {brands.length > 0 && (
        <section className={cx(siteContainer, "pb-14 md:pb-20")}>
          <h2 className="lux-h text-2xl md:text-3xl">Марките, с които работим</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {brands.map((b) => (
              <span
                key={b}
                className="px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-black/10 text-black/70"
              >
                {b}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* BOOK */}
      <section id="book" className={cx(siteContainer, "pb-14 md:pb-20")}>
        <div className="rounded-3xl bg-white/75 backdrop-blur border border-black/10 shadow-sm p-7">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest text-black/50">резервации</div>
              <h2 className="lux-h text-2xl md:text-3xl mt-2">Запази час</h2>
              <p className="text-black/60 mt-2 max-w-2xl">
                Скоро: собствен календар за салона. Засега — линк/телефон.
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href={booking}
                className="px-6 py-3 rounded-full text-white font-semibold shadow-md hover:shadow-lg transition"
                style={{ background: primary }}
              >
                Запази час
              </a>

              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="px-6 py-3 rounded-full bg-white border border-black/10 text-black/80 hover:border-black/20 transition font-semibold"
                >
                  Обади се
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className={cx(siteContainer, "pb-16")}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white/70 backdrop-blur border border-black/10 shadow-sm p-7">
            <div className="text-xs uppercase tracking-widest text-black/50">контакт</div>
            <h3 className="lux-h text-xl md:text-2xl mt-2">Посети ни</h3>

            <div className="mt-4 space-y-2 text-black/75">
              {address && <div>📍 {address}</div>}
              {hours && <div>🕒 {hours}</div>}
              {phone && <div>📞 {phone}</div>}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <SocialIcon href={facebook} label="Facebook" kind="facebook" />
              <SocialIcon href={instagram} label="Instagram" kind="instagram" />
              <SocialIcon href={tiktok} label="TikTok" kind="tiktok" />
              <SocialIcon href={youtube} label="YouTube" kind="youtube" />
            </div>

            {mapLink ? (
              <div className="mt-6">
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-black/70 underline hover:text-black"
                >
                  Отвори в Google Maps →
                </a>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl bg-white/70 backdrop-blur border border-black/10 shadow-sm p-7">
            <div className="text-xs uppercase tracking-widest text-black/50">локация</div>
            <h3 className="lux-h text-xl md:text-2xl mt-2">Карта</h3>
            <p className="text-black/60 mt-2">
              Показваме линк към Google Maps (по-сигурно от embed). По-късно ще добавим embed/API.
            </p>

            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex px-5 py-3 rounded-full bg-white border border-black/10 text-black/80 hover:border-black/20 transition font-semibold"
              >
                Виж на картата
              </a>
            ) : (
              <div className="mt-5 text-black/50">Добави google_maps_url</div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 py-10 bg-white/60 backdrop-blur">
        <div className={cx(siteContainer, "flex items-center justify-between flex-wrap gap-3 text-sm text-black/60")}>
          <div>
            © {new Date().getFullYear()} {client.business_name}
          </div>
          <a href="#services" className="underline">
            Услуги
          </a>
        </div>
      </footer>

      <div className="md:hidden fixed bottom-3 left-0 right-0 px-4 z-40">
        <div className="max-w-2xl mx-auto rounded-2xl bg-white/90 backdrop-blur border border-black/10 shadow-lg p-3 flex gap-3">
          <a
            href="#book"
            className="flex-1 text-center px-4 py-3 rounded-full text-white font-semibold"
            style={{ background: primary }}
          >
            Запази час
          </a>
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="px-4 py-3 rounded-full bg-white border border-black/10 font-semibold text-black/80"
            >
              Обади се
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}

const siteContainer = "max-w-6xl mx-auto px-6";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-4 py-2 rounded-full text-sm font-medium text-black/75 hover:text-black hover:bg-black/[0.03] transition"
    >
      {label}
    </a>
  );
}

function Stars({ count, primary }: { count: number; primary: string }) {
  const stars = Array.from({ length: 5 }).map((_, i) => i < count);
  return (
    <div className="flex gap-1" aria-label={`${count} stars`}>
      {stars.map((on, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={on ? primary : "none"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z"
            stroke={on ? primary : "rgba(0,0,0,0.25)"}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

function TrustItem({ top, bottom, primary }: { top: string; bottom: string; primary: string }) {
  return (
    <div className="rounded-3xl bg-white/70 border border-black/10 p-4">
      <div className="lux-h text-2xl leading-none" style={{ color: primary }}>
        {top}
      </div>
      <div className="text-sm text-black/55 mt-1">{bottom}</div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  kind,
}: {
  href: string;
  label: string;
  kind: "facebook" | "instagram" | "tiktok" | "youtube";
}) {
  if (!href) return null;

  const base =
    "h-10 w-10 rounded-full bg-white/85 border border-black/10 grid place-items-center text-black/70 hover:border-black/20 transition";
  const iconProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg" as const,
  };

  return (
    <a className={base} href={href} aria-label={label} title={label} target="_blank" rel="noreferrer">
      {kind === "facebook" && (
        <svg {...iconProps}>
          <path
            d="M14 8.5V7.2c0-.9.6-1.1 1-1.1h1V4h-2c-2.2 0-3 1.6-3 3.3V8.5H9v2.2h2V20h3v-9.3h2.2l.4-2.2H14Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {kind === "instagram" && (
        <svg {...iconProps}>
          <path
            d="M7.5 3.8h9A3.7 3.7 0 0 1 20.2 7.5v9A3.7 3.7 0 0 1 16.5 20.2h-9A3.7 3.7 0 0 1 3.8 16.5v-9A3.7 3.7 0 0 1 7.5 3.8Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M17 7.2h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )}
      {kind === "tiktok" && (
        <svg {...iconProps}>
          <path
            d="M14 3v10.2a3.8 3.8 0 1 1-3.2-3.7"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 3c.6 2.7 2.3 4.3 5 4.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {kind === "youtube" && (
        <svg {...iconProps}>
          <path
            d="M21 12s0-3.4-.4-4.9a2.5 2.5 0 0 0-1.7-1.8C17.3 5 12 5 12 5s-5.3 0-6.9.3A2.5 2.5 0 0 0 3.4 7C3 8.6 3 12 3 12s0 3.4.4 4.9a2.5 2.5 0 0 0 1.7 1.8C6.7 19 12 19 12 19s5.3 0 6.9-.3a2.5 2.5 0 0 0 1.7-1.8c.4-1.5.4-4.9.4-4.9Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M10.5 9.8 15 12l-4.5 2.2V9.8Z" fill="currentColor" />
        </svg>
      )}
    </a>
  );
}

const demoReviews: Review[] = [
  {
    id: "d1",
    author: "Мария П.",
    rating: 5,
    text: "Най-добрият гел лак, който съм имала. Чисто, стилно и много внимателно отношение.",
  },
  {
    id: "d2",
    author: "Елица Н.",
    rating: 5,
    text: "Перфектна форма и детайл. Атмосферата е спокойна и луксозна.",
  },
  {
    id: "d3",
    author: "Деси К.",
    rating: 5,
    text: "Запазих час лесно, обслужването беше на ниво. Препоръчвам с две ръце.",
  },
];
