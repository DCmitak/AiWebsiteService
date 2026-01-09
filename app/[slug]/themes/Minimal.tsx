// app/[slug]/themes/Minimal.tsx
import type { PublicPayload, Review, Service, GalleryImage } from "../types";
import ReviewsCarousel from "./ReviewsCarousel";
import ServicesTabs from "../ServicesTabs";
import ServicesTabsV2 from "../ServicesTabsV2";
import WorkCarousel from "./WorkCarousel";

export default function MinimalTheme({ client, settings, services, gallery, reviews }: PublicPayload) {
  const primary = settings?.primary_color || "#B2773D";
  const pricingLayout = (settings?.pricing_layout || "v1").toLowerCase();

  const bg = "#F3D8D4";
  const surface = "#F7EFEE";
  const ink = "#1F2430";

  // Booking is internal
  const booking = `/${client.slug}/book`;

  const phone = (settings?.phone || "").trim();
  const address = (settings?.address || "").trim();
  const hours = (settings?.working_hours || "").trim();
  const aboutText = (settings?.about_text || "").trim();

  const mapUrl = settings?.google_maps_url || "";
  const logoUrl = (settings?.logo_url || "").trim();

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

  const PLACEHOLDER = "/img/placeholder.svg";

  // ---- gallery sections (ONLY admin-driven) ----
  const heroGallery = gal.find((x) => (x.section || "").toString().toLowerCase() === "hero");
  const aboutGallery = gal.find((x) => (x.section || "").toString().toLowerCase() === "about");
  const pricingGallery = gal.find((x) => (x.section || "").toString().toLowerCase() === "pricing");

  const work = gal.filter((x) => (x.section || "work").toString().toLowerCase() === "work");
  const venue = gal.filter((x) => (x.section || "").toString().toLowerCase() === "venue");
  const brands = gal.filter((x) => (x.section || "").toString().toLowerCase() === "brands");

  const heroImg = (heroGallery?.image_url || "").trim() || PLACEHOLDER;
  const aboutImg = (aboutGallery?.image_url || "").trim() || PLACEHOLDER;
  const pricingImg = (pricingGallery?.image_url || "").trim() || PLACEHOLDER;

  // ---- section copy (Minimal settings; with defaults) ----
  const copy = {
    categoryLabel: (settings?.category_label || "").trim() || "УСЛУГИ",
    heroTitle: (settings?.hero_title || "").trim(),
    heroSubtitle: (settings?.hero_subtitle || "").trim(),

    servicesEyebrow: (settings?.services_eyebrow || "").trim() || "НАШИТЕ УСЛУГИ",
    servicesTitle: (settings?.services_title || "").trim() || "Препоръчани процедури",
    servicesSubtitle:
      (settings?.services_subtitle || "").trim() || "Подбрани услуги, за да изглеждаш и да се чувстваш прекрасно.",

    aboutEyebrow: (settings?.about_eyebrow || "").trim() || "За нас",
    aboutTitle: (settings?.about_title || "").trim() || `Добре дошли в ${client.business_name}!`,
    aboutCta: (settings?.about_cta_label || "").trim() || "Виж цени",

    brandsEyebrow: (settings?.brands_eyebrow || "").trim() || "Марки",
    brandsTitle: (settings?.brands_title || "").trim() || "Марките, с които работим",
    brandsSubtitle: (settings?.brands_subtitle || "").trim() || "Подбрани професионални продукти и партньори.",

    pricingEyebrow: (settings?.pricing_eyebrow || "").trim() || "Цени",
    pricingTitle: (settings?.pricing_title || "").trim() || "Ценоразпис",
    pricingSubtitle: (settings?.pricing_subtitle || "").trim() || "Избери услуга и запази час лесно.",
    pricingBadge: (settings?.pricing_badge || "").trim() || "Без плащане онлайн • Плащане в обекта",

    galleryEyebrow: (settings?.gallery_eyebrow || "").trim() || "Галерия",
    galleryTitle: (settings?.gallery_title || "").trim() || "Нашата работа",
    gallerySubtitle:
      (settings?.gallery_subtitle || "").trim() || "Подбрани снимки, които най-добре показват стила ни.",
    galleryWorkTitle: (settings?.gallery_work_title || "").trim() || "Снимки от работата ни",
    galleryVenueTitle: (settings?.gallery_venue_title || "").trim() || "Галерия на обекта",

    reviewsEyebrow: (settings?.reviews_eyebrow || "").trim() || "Отзиви",
    reviewsTitle: (settings?.reviews_title || "").trim() || "Клиентите за нас",
    reviewsSubtitle: (settings?.reviews_subtitle || "").trim() || "Благодарим за всяко мнение!",

    contactEyebrow: (settings?.contact_eyebrow || "").trim() || "Контакти",
    contactTitle: (settings?.contact_title || "").trim() || "Свържи се с нас",
    contactSubtitle: (settings?.contact_subtitle || "").trim() || "Запази час и се погрижи за себе си.",
  };

  // ---- reviews (payload only) ----
  const reviewsFinal: Review[] = Array.isArray(reviews) ? (reviews as Review[]) : [];

  // ---- featured services ----
  const featuredManual = svc
    .filter((s) => !!(s as any).is_featured)
    .sort((a: any, b: any) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999))
    .slice(0, 3);

  const featuredAuto = pickFeaturedServices(svc, 3);
  const featuredFinal = featuredManual.length ? featuredManual : featuredAuto;

  const featuredWithImages = featuredFinal.map((s, i) => ({
    ...s,
    image_url:
      ((s as any).featured_image_url || "").trim() ||
      (work[i]?.image_url || "").trim() ||
      (work[(i + 3) % Math.max(1, work.length)]?.image_url || "").trim() ||
      PLACEHOLDER,
  }));

  // ---- hero feature cards (from settings; with defaults) ----
  const heroFeatures = normalizeHeroFeatures((settings as any)?.hero_features);

  // ---- branding header rules ----
  const brandMode = ((settings?.brand_mode || "text").toLowerCase() as "logo" | "text") || "text";
  const brandText = (settings?.brand_text || "").trim() || client.business_name;
  const brandSubtext = (settings?.brand_subtext || "").trim();
  const brandLetter = (brandText || client.business_name || "B").trim().slice(0, 1).toUpperCase();

  return (
    <main style={{ background: surface, color: ink }} className="min-h-screen">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#F3D8D4]/80 backdrop-blur">
        <div className={cx(container, "flex items-center justify-between px-6 py-4")}>
          {/* Brand */}
          <a href="#" className="flex items-center gap-3 min-w-0">
            {brandMode === "logo" && logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${client.business_name} logo`}
                className="h-11 w-auto max-w-[180px] object-contain"
              />
            ) : (
              <>
                <div
                  className="h-11 w-11 rounded-full grid place-items-center border border-black/10 bg-white/60 font-semibold text-sm"
                  aria-hidden
                >
                  {brandLetter}
                </div>

                <div className="min-w-0 leading-tight">
                  <div className="text-[15px] font-semibold tracking-tight truncate">{brandText}</div>
                  {brandSubtext ? <div className="text-xs text-black/55 truncate">{brandSubtext}</div> : null}
                </div>
              </>
            )}
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
              <div className="text-[11px] font-semibold tracking-[0.30em] text-black/55">{copy.categoryLabel}</div>

              <h1
                className="mt-5 font-serif text-[46px] leading-[0.93] tracking-[-0.02em] text-[#111827] md:text-[78px] lg:text-[86px]"
                style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
              >
                {copy.heroTitle ? (
                  copy.heroTitle
                ) : (
                  <>
                    Добре дошли в
                    <br />
                    {client.business_name}
                  </>
                )}
              </h1>

              {copy.heroSubtitle ? (
                <p className="mt-6 max-w-3xl text-[16px] leading-7 text-black/65 md:text-[19px] md:leading-8">
                  {copy.heroSubtitle}
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
                {heroFeatures.map((x) => (
                  <div key={x.title} className="rounded-2xl bg-white/55 p-4 shadow-sm ring-1 ring-black/10">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-white/70 ring-1 ring-black/10 grid place-items-center">
                        <span className="text-base" aria-hidden>
                          {x.icon}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[#111827]">{x.title}</div>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-black/60">{x.text}</div>
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
                      alt="Hero"
                      className={
                        heroImg === PLACEHOLDER
                          ? "h-[560px] w-full object-contain p-12 bg-white/40 md:h-[680px]"
                          : "h-[560px] w-full object-cover md:h-[680px]"
                      }
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
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              {copy.servicesEyebrow}
            </div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">
              {copy.servicesTitle}
            </h2>
            <p className="mt-4 opacity-70">{copy.servicesSubtitle}</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredWithImages.map((s: any) => (
              <a
                key={s.id}
                href="#pricing"
                className="group block overflow-hidden bg-white border border-black/10 
                shadow-[0_20px_60px_rgba(0,0,0,0.08)] 
                hover:shadow-[0_28px_90px_rgba(0,0,0,0.14)] 
                hover:-translate-y-1 transition rounded-2xl"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.image_url || PLACEHOLDER}
                  alt=""
                  className={(s.image_url || PLACEHOLDER) === PLACEHOLDER ? "w-full h-72 object-contain p-10 bg-white/40" : "w-full h-72 object-cover"}
                />
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
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] overflow-hidden rounded-2xl h-[420px] md:h-[520px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutImg}
                  alt=""
                  className={aboutImg === PLACEHOLDER 
                    ? "block w-full h-full object-contain p-12 bg-white/40 transition-transform duration-300 hover:scale-[1.02]" 
                    : "block w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  }
                />
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                {copy.aboutEyebrow}
              </div>

              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.aboutTitle}</h2>

              <div className="mt-6 space-y-4 opacity-80 leading-relaxed">
                <p>{aboutText || "Добави About текст в Settings."}</p>
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
                  {copy.aboutCta}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY – нашата работа и обект */}
      <section id="gallery" style={{ background: surface }}>
        {/* по-малък padding отгоре, нормален отдолу */}
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              {copy.galleryEyebrow}
            </div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">
              {copy.galleryTitle}
            </h2>
            <p className="mt-4 opacity-70">{copy.gallerySubtitle}</p>
          </div>

          {(() => {
            const galleryItems = [...work, ...venue]; // работа + обект
            if (!galleryItems.length) {
              return (
                <div className="mt-6 text-sm opacity-70 text-center">
                  Няма качени снимки (секции: work / venue).
                </div>
              );
            }

            return (
              // full-width: излизаме от контейнера с -50vw
              <div className="mt-6 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                <WorkCarousel items={galleryItems} />
              </div>
            );
          })()}
        </div>
      </section>




      {/* PRICING */}
      {pricingLayout === "v2" ? (
        // V2: APP-STYLE (NO IMAGE)
        <section id="pricing" className="bg-[#F6EEE9] border-t border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.pricingEyebrow}
                </div>
                <h2 className="mt-2 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.pricingTitle}</h2>
                <p className="mt-3 opacity-70 max-w-xl">{copy.pricingSubtitle}</p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-sm text-black/60">
                {copy.pricingBadge}
              </div>
            </div>

            <div className="mt-6">
              <ServicesTabsV2 services={svc} primary={primary} slug={client.slug} />
            </div>
          </div>
        </section>
      ) : (
        // V1: CLASSIC (WITH IMAGE)
        <section id="pricing" className="bg-[#F6EEE9]">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="grid lg:grid-cols-12 gap-10 items-stretch">
              {/* LEFT IMAGE */}
              <div className="lg:col-span-6 self-stretch">
                <div className="h-full">
                  <div className="relative h-full min-h-[520px] rounded-2xl bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pricingImg}
                      alt=""
                      className={
                        pricingImg === PLACEHOLDER
                          ? "absolute inset-0 w-full h-full object-contain p-12 bg-white/40"
                          : "absolute inset-0 w-full h-full object-cover"
                      }
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="lg:col-span-6">
                <div style={{ background: bg }} className="border border-black/10 p-8 md:p-10 h-full rounded-2xl">
                  <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                    {copy.pricingEyebrow}
                  </div>

                  <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.pricingTitle}</h2>

                  <p className="mt-4 opacity-75 max-w-xl">{copy.pricingSubtitle}</p>

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

      {/* BRANDS (moved AFTER pricing) */}
      {brands.length ? (
        <section style={{ background: surface }} className="border-t border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
            <div>
              <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                {copy.brandsEyebrow}
              </div>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.brandsTitle}</h2>
              <p className="mt-3 opacity-70 max-w-2xl">{copy.brandsSubtitle}</p>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.slice(0, 24).map((b) => (
                <div key={b.id} className="h-24 rounded-xl border border-black/10 bg-white shadow-sm grid place-items-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt="" className="max-h-full max-w-full object-contain opacity-90" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* VENUE GALLERY (secondary, no duplication of work) */}
      <section id="venue" style={{ background: bg }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              {copy.galleryEyebrow}
            </div>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.galleryVenueTitle}</h2>
            <p className="mt-3 opacity-70">Атмосфера и комфорт в обекта.</p>
          </div>

          <div className="mt-12">
            {venue.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="mt-5 text-sm opacity-70 text-center">Няма качени снимки (секция: venue).</div>
            )}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" style={{ background: surface }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              {copy.reviewsEyebrow}
            </div>

            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.reviewsTitle}</h2>
            <p className="mt-3 opacity-70">{copy.reviewsSubtitle}</p>
          </div>

          <div className="mt-10">
            <ReviewsCarousel reviews={reviewsFinal.slice(0, 6)} primary={primary} />
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: bg }} className="border-t border-black/10">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="text-center">
            <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
              {copy.contactEyebrow}
            </div>

            <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide">{copy.contactTitle}</h2>

            <p className="mt-3 opacity-70">{copy.contactSubtitle}</p>
          </div>

          <div className="mt-10 bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-4 rounded-2xl">
            <div className="bg-[#f3f3f3] border border-black/10 rounded-xl">
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
          <a href={booking} className="flex-1 text-center px-4 py-3 rounded-xl text-white font-semibold" style={{ background: primary }}>
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
    <div className="bg-white border border-black/10 shadow-[0_18px_50px_rgba(0,0,0,0.07)] p-6 text-center rounded-2xl">
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
    const k = ((s as any)?.category || "").trim();
    if (!byCat[k]) byCat[k] = [];
    byCat[k].push(s);
  }

  const cats = Object.keys(byCat).filter(Boolean);
  const picked: Service[] = [];

  for (const c of cats) {
    const best = byCat[c]?.find((x) => Number.isFinite(Number((x as any)?.price_from))) || byCat[c]?.[0];
    if (best) picked.push(best);
    if (picked.length >= count) break;
  }

  if (picked.length < count) {
    for (const s of services) {
      if (!picked.find((p) => (p as any).id === (s as any).id)) picked.push(s);
      if (picked.length >= count) break;
    }
  }

  return picked.slice(0, count);
}

function normalizeHeroFeatures(raw: any) {
  const fallback = [
    { icon: "✨", title: "Професионално отношение", text: "Фокус върху качество и детайл." },
    { icon: "🧼", title: "Чистота и комфорт", text: "Уютна атмосфера и грижа за клиента." },
    { icon: "📅", title: "Лесно записване", text: "Онлайн букинг и бърза връзка." },
  ];

  if (!Array.isArray(raw)) return fallback;

  const cleaned = raw
    .slice(0, 3)
    .map((x) => ({
      icon: (x?.icon || "").toString().trim() || "✨",
      title: (x?.title || "").toString().trim(),
      text: (x?.text || "").toString().trim(),
    }))
    .filter((x) => x.title.length > 0 && x.text.length > 0);

  return cleaned.length ? cleaned : fallback;
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
