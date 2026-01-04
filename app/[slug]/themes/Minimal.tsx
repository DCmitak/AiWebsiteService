// app/[slug]/themes/Minimal.tsx
import type { PublicPayload, Review, Service, GalleryImage } from "../types";
import ReviewsCarousel from "./ReviewsCarousel";
import ServicesTabs from "../ServicesTabs";
import ServicesTabsV2 from "../ServicesTabsV2";


export default function MinimalTheme({ client, settings, services, gallery, reviews }: PublicPayload) {
  const primary = settings?.primary_color || "#B2773D";
  const pricingLayout = (settings?.pricing_layout || "v1").toLowerCase();

  const bg = "#F3D8D4";
  const surface = "#F7EFEE";
  const ink = "#1F2430";

  const booking = settings?.booking_url || "#book";
  const phone = (settings?.phone || "").trim();

  const address = settings?.address || "";
  const hours = settings?.working_hours || "";
  const about = settings?.about_text || "";

  const mapUrl = settings?.google_maps_url || "";
  const logoUrl = settings?.logo_url || "";

  const facebook = settings?.facebook_url || "";
  const instagram = settings?.instagram_url || "";
  const tiktok = settings?.tiktok_url || "";
  const youtube = settings?.youtube_url || "";

  const mapLink =
    mapUrl && typeof mapUrl === "string"
      ? mapUrl.includes("output=embed")
        ? mapUrl.replace("output=embed", "")
        : mapUrl
      : "";

  const svc = (Array.isArray(services) ? services : []) as Service[];
  const gal = (Array.isArray(gallery) ? gallery : []) as GalleryImage[];

  // --- GALLERY SECTIONS (semantic, no magic indices) ---
  const heroGallery = gal.find((x) => (x.section || "").toString().toLowerCase() === "hero");
  const work = gal.filter((x) => (x.section || "work").toString().toLowerCase() === "work");
  const venue = gal.filter((x) => (x.section || "").toString().toLowerCase() === "venue");

  const fallbackHero =
    "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1800&q=80";

  const heroImg = settings?.hero_image_url || heroGallery?.image_url || work[0]?.image_url || fallbackHero;

  const aboutImg =
    venue[0]?.image_url ||
    work[0]?.image_url ||
    "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1800&q=80";

  const pricingImg =
    work[1]?.image_url ||
    work[0]?.image_url ||
    venue[0]?.image_url ||
    "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1800&q=80";

  // IMPORTANT: ONLY DB reviews (payload)
  const reviewsFinal: Review[] = Array.isArray(reviews) ? (reviews as Review[]) : [];

  // Featured services: 3 карти (услуги + снимки от WORK gallery)
  const featuredManual = svc
    .filter((s) => !!s.is_featured)
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
    .slice(0, 3);

  const featuredAuto = pickFeaturedServices(svc, 3);

  const featuredFinal = featuredManual.length ? featuredManual : featuredAuto;

  const featuredWithImages = featuredFinal.map((s, i) => ({
    ...s,
    image_url:
      (s.featured_image_url || "").trim() ||
      work[i]?.image_url ||
      work[(i + 3) % Math.max(1, work.length)]?.image_url ||
      heroImg,
  }));


  // Hero copy from admin (optional)
  const heroTitle = (settings?.hero_title || "").trim();
  const heroSubtitle = (settings?.hero_subtitle || "").trim();
  const categoryLabel = (settings?.category_label || "").trim() || "УСЛУГИ";
  const heroFeatures = Array.isArray(settings?.hero_features) ? settings!.hero_features! : [];

  return (
    <main style={{ background: surface, color: ink }} className="min-h-screen">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#F3D8D4]/80 backdrop-blur">
        <div className={cx(container, "flex items-center justify-between px-6 py-4")}>
          {/* Brand */}
          <a href="#" className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${client.business_name} logo`}
                className="h-10 w-10 rounded-full object-cover border border-black/10 bg-white"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/60 ring-1 ring-black/10" aria-hidden />
            )}

            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-semibold tracking-tight truncate">{client.business_name}</div>
              <div className="text-xs text-black/55 truncate">{client.city}</div>
            </div>
          </a>

          {/* Nav */}
          <nav className="hidden items-center gap-7 text-sm text-black/60 md:flex">
            <a href="#services" className="hover:text-black">
              Услуги
            </a>
            <a href="#about" className="hover:text-black">
              За нас
            </a>
            <a href="#pricing" className="hover:text-black">
              Цени
            </a>
            <a href="#gallery" className="hover:text-black">
              Галерия
            </a>
            <a href="#reviews" className="hover:text-black">
              Отзиви
            </a>
            <a href="#contact" className="hover:text-black">
              Контакти
            </a>
          </nav>

          {/* Social + CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <SocialIcon href={facebook} label="Facebook" icon="facebook" />
              <SocialIcon href={instagram} label="Instagram" icon="instagram" />
              <SocialIcon href={tiktok} label="TikTok" icon="tiktok" />
              <SocialIcon href={youtube} label="YouTube" icon="youtube" />
            </div>

            <a
              href={booking}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
              style={{ background: primary }}
            >
              Запази час
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: bg }} className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 py-14 md:grid-cols-12 md:py-20">
            {/* LEFT */}
            <div className="md:col-span-8 lg:col-span-8">
              <div className="text-[11px] font-semibold tracking-[0.30em] text-black/55">{categoryLabel}</div>

              <h1
                className="mt-5 font-serif text-[46px] leading-[0.93] tracking-[-0.02em] text-[#111827] md:text-[78px] lg:text-[86px]"
                style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
              >
                {heroTitle ? (
                  heroTitle
                ) : (
                  <>
                    Добре дошли в
                    <br />
                    {client.business_name}
                    <br />
                    ({client.city})
                  </>
                )}
              </h1>

              {heroSubtitle ? (
                <p className="mt-6 max-w-3xl text-[16px] leading-7 text-black/65 md:text-[19px] md:leading-8">
                  {heroSubtitle}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={booking}
                  className="rounded-xl px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  style={{ background: primary }}
                >
                  Запази час
                </a>

                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="rounded-xl border border-black/10 bg-white/40 px-7 py-3 text-sm font-semibold text-black/80 shadow-sm transition hover:bg-white/60"
                  >
                    Обади се
                  </a>
                ) : null}
              </div>

              {/* Feature mini cards */}
              <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl">
                {(heroFeatures.length
                  ? heroFeatures.slice(0, 3).map((x) => ({ t: x.title, d: x.text }))
                  : [
                      { t: "Професионално отношение", d: "Фокус върху качество и детайл." },
                      { t: "Чистота и комфорт", d: "Уютна атмосфера и грижа за клиента." },
                      { t: "Лесно записване", d: "Онлайн букинг и бърза връзка." },
                    ]
                ).map((x) => (
                  <div key={x.t} className="rounded-2xl bg-white/45 p-4 shadow-sm ring-1 ring-black/10">
                    <div className="text-sm font-semibold text-[#111827]">{x.t}</div>
                    <div className="mt-2 text-xs leading-5 text-black/60">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT */}
            <div className="md:col-span-4 lg:col-span-4">
              <div className="relative mx-auto w-full max-w-[420px] md:max-w-[460px]">
                <div className="absolute -right-8 -top-10 hidden h-32 w-32 rounded-2xl border border-white/50 bg-white/10 md:block" />
                <div className="absolute -left-10 bottom-16 hidden h-24 w-24 rounded-2xl border border-white/40 bg-white/5 md:block" />

                <div className="rounded-[28px] bg-white/70 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.14)] ring-1 ring-black/10">
                  <div className="overflow-hidden rounded-[22px] bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImg}
                      alt={settings?.hero_image_alt || "Hero"}
                      className="h-[560px] w-full object-cover md:h-[680px]"
                    />
                  </div>
                </div>

                <div
                  className="absolute -bottom-8 right-6 hidden md:block h-16 w-40 rounded-2xl bg-white/35 border border-white/60"
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* FEATURED SERVICES */}
      <section id="services" className="bg-[#F6EEE9]">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-[12px] font-semibold tracking-[0.26em] text-black/45">НАШИТЕ УСЛУГИ</div>
            <h2 className="mt-4 font-serif text-3xl tracking-tight text-[#111827] md:text-4xl">
              Препоръчани процедури
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-black/60">
              Подбрани услуги, за да изглеждаш и да се чувстваш прекрасно.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredWithImages.map((s) => (
              <a
                key={s.id}
                href="#pricing"
                className="group block overflow-hidden bg-white border border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] hover:shadow-[0_28px_90px_rgba(0,0,0,0.12)] transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_url} alt="" className="w-full h-72 object-cover" />
                <div className="p-6">
                  <div className="text-xl font-semibold font-serif">{s.name}</div>
                  <div className="mt-2 opacity-70 line-clamp-2">{s.description || "—"}</div>

                  <div className="mt-5 flex items-center justify-between">
                    <div className="opacity-80">
                      от{" "}
                      <span style={{ color: primary }} className="font-semibold">
                        {formatPriceBG(s.price_from)}
                      </span>
                    </div>
                    <span className="text-sm font-semibold opacity-70 group-hover:opacity-100 transition">→</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" style={{ background: bg }} className="border-y border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7">
              <div className="bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aboutImg} alt="" className="w-full h-[420px] md:h-[520px] object-cover" />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                За нас
              </div>

              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">
                Добре дошли в {client.business_name}!
              </h2>

              <div className="mt-6 space-y-4 opacity-80 leading-relaxed">
                <p>{about || "Добави about_text в Settings."}</p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/60 border border-black/10 font-semibold"
                  >
                    <span
                      className="h-10 w-10 rounded-full grid place-items-center"
                      style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(0,0,0,0.10)" }}
                      aria-hidden
                    >
                      ☎
                    </span>
                    <span>{phone}</span>
                  </a>
                ) : null}

                <a
                  href="#pricing"
                  className="px-6 py-3 rounded-md text-white font-semibold shadow-sm hover:shadow-md transition"
                  style={{ background: primary }}
                >
                  Виж цени
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

{/* PRICING */}
{pricingLayout === "v2" ? (
  // =========================
  // V2: APP-STYLE (NO IMAGE)
  // =========================
  <section id="pricing" className="bg-[#F6EEE9] border-t border-black/10">
    <div className="mx-auto max-w-4xl px-6 py-14 md:py-18">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
            Цени
          </div>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl font-semibold tracking-wide">Ценоразпис</h2>
          <p className="mt-3 opacity-70 max-w-xl">
            Избери категория, после натисни „Запази час“ на конкретната услуга.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-black/60">
          Без плащане онлайн • Плащане в обекта
        </div>
      </div>

      <div className="mt-6">
        <ServicesTabsV2 services={svc} primary={primary} slug={client.slug} />
      </div>

      <div className="mt-5 text-xs text-black/45">
        Ако не виждаш свободни часове, провери работното време или избери друга дата.
      </div>
    </div>
  </section>
) : (
  // =========================
  // V1: CLASSIC (WITH IMAGE)
  // =========================
  <section id="pricing" className="bg-[#F6EEE9]">
    <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6">
          <div className="bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pricingImg} alt="" className="w-full h-[520px] object-cover" />
          </div>
        </div>

        <div className="lg:col-span-6">
          <div style={{ background: bg }} className="border border-black/10 p-8 md:p-10 h-full">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              Цени
            </div>

            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">Ценоразпис</h2>

            <p className="mt-4 opacity-75 max-w-xl">Избери услуга и запази час лесно.</p>

            <div className="mt-8">
              <ServicesTabs services={svc} primary={primary} slug={client.slug} />
            </div>

            <div className="mt-10">
              <a
                href={booking}
                className="inline-flex px-6 py-3 rounded-md text-white font-semibold shadow-sm hover:shadow-md transition"
                style={{ background: primary }}
              >
                Запази час
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)}


      {/* GALLERY */}
      <section id="gallery" style={{ background: surface }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              Галерия
            </div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">Нашата работа и обект</h2>
            <p className="mt-3 opacity-70">Подбрани снимки, които най-добре показват стила ни.</p>
          </div>

          {/* Work */}
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-serif text-2xl tracking-tight">Снимки от работата ни</h3>
              <div className="text-sm opacity-60">{work.length ? `${work.length} снимки` : "—"}</div>
            </div>

            {work.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {work.slice(0, 9).map((img) => (
                  <a
                    key={img.id}
                    href={img.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className="h-64 w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 text-sm opacity-70">Няма качени снимки (секция: work).</div>
            )}
          </div>

          {/* Venue */}
          <div className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <h3 className="font-serif text-2xl tracking-tight">Галерия на обекта</h3>
              <div className="text-sm opacity-60">{venue.length ? `${venue.length} снимки` : "—"}</div>
            </div>

            {venue.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {venue.slice(0, 9).map((img) => (
                  <a
                    key={img.id}
                    href={img.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm hover:shadow-md transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="" className="h-64 w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 text-sm opacity-70">Няма качени снимки (секция: venue).</div>
            )}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ background: surface }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              Отзиви
            </div>

            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">Клиентите за нас</h2>
            <p className="mt-3 opacity-70">Благодарим за всяко мнение!</p>
          </div>

          <div className="mt-10">
            <ReviewsCarousel reviews={reviewsFinal.slice(0, 6)} primary={primary} />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: surface }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              Контакти
            </div>

            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">Свържи се с нас</h2>

            <p className="mt-3 opacity-70">Запази час и се погрижи за себе си.</p>
          </div>

          <div className="mt-10 bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-4">
            <div className="bg-[#f3f3f3] border border-black/10">
              <div className="h-64 md:h-80 grid place-items-center text-sm opacity-70">
                {mapLink ? (
                  <a href={mapLink} target="_blank" rel="noreferrer" className="underline">
                    Отвори в Google Maps →
                  </a>
                ) : (
                  <div>Добави google_maps_url</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <ContactCard title="Адрес" value={address || "—"} icon="📍" />
            <ContactCard title="Телефон" value={phone || "—"} icon="☎" />
            <ContactCard title="Работно време" value={hours || "—"} icon="🕒" />
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            <SocialIcon href={facebook} label="Facebook" icon="facebook" />
            <SocialIcon href={instagram} label="Instagram" icon="instagram" />
            <SocialIcon href={tiktok} label="TikTok" icon="tiktok" />
            <SocialIcon href={youtube} label="YouTube" icon="youtube" />
          </div>
        </div>
      </section>

      <footer className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-10 flex items-center justify-between flex-wrap gap-4 opacity-70 text-sm">
          <div>
            © {new Date().getFullYear()} {client.business_name}
          </div>
          <a href="#services" className="underline">
            Услуги
          </a>
        </div>
      </footer>

      {/* Mobile CTA */}
      <div className="md:hidden fixed bottom-3 left-0 right-0 px-4 z-40">
        <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur border border-black/10 shadow-lg p-3 flex gap-3 rounded-2xl">
          <a
            href={booking}
            className="flex-1 text-center px-4 py-3 rounded-xl text-white font-semibold"
            style={{ background: primary }}
          >
            Запази
          </a>
          {phone ? (
            <a href={`tel:${phone}`} className="px-4 py-3 rounded-xl bg-white border border-black/10 font-semibold">
              Обади се
            </a>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/* ---------------- helpers ---------------- */

const container = "max-w-7xl mx-auto";

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

function ContactCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.07)] p-6 text-center">
      <div className="text-3xl">{icon}</div>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="mt-2 opacity-70">{value}</div>
    </div>
  );
}

function formatPriceBG(price: any) {
  const n = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toFixed(0)}  €`;
}

function pickFeaturedServices(services: Service[], count: number) {
  const byCat: Record<string, Service[]> = {};
  for (const s of services) {
    const k = (s?.category || "").trim();
    if (!byCat[k]) byCat[k] = [];
    byCat[k].push(s);
  }

  const cats = Object.keys(byCat).filter(Boolean);
  const picked: Service[] = [];

  for (const c of cats) {
    const best = byCat[c]?.find((x) => Number.isFinite(Number(x?.price_from))) || byCat[c]?.[0];
    if (best) picked.push(best);
    if (picked.length >= count) break;
  }

  if (picked.length < count) {
    for (const s of services) {
      if (!picked.find((p) => p.id === s.id)) picked.push(s);
      if (picked.length >= count) break;
    }
  }

  return picked.slice(0, count);
}

// IMPORTANT: icons come from /public/icons/*.svg
function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "facebook" | "instagram" | "tiktok" | "youtube";
}) {
  if (!href) return null;

  const base =
    "h-10 w-10 rounded-full bg-white/70 border border-black/10 grid place-items-center hover:bg-white/85 transition";

  return (
    <a className={base} href={href} aria-label={label} title={label} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/${icon}.svg`} alt={label} className="h-[18px] w-[18px]" />
    </a>
  );
}
