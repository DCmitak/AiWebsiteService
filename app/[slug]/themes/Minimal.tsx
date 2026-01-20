// app/[slug]/themes/Minimal.tsx
import type { PublicPayload, Review, Service, GalleryImage } from "../types";
import ReviewsCarousel from "./components/ReviewsCarousel";
import ServicesTabs from "../ServicesTabs";
import ServicesTabsV2 from "../ServicesTabsV2";
import WorkCarousel from "./components/WorkCarousel";
import ThemeButton from "./components/ThemeButton";

import FaIcon from "./components/FaIcon";
import VenueGallery from "./components/VenueGallery";

export default function MinimalTheme({
  client,
  settings,
  services,
  gallery,
  reviews,
}: PublicPayload) {
  const sAny = (settings || {}) as any;

  const primary = settings?.primary_color || "#B2773D";
  const pricingLayout = (settings?.pricing_layout || "v1").toLowerCase();

  // Theme colors (from settings)
  const bg = sAny.theme_bg || "#F3D8D4";
  const surface = sAny.theme_surface || "#F7EFEE";
  const ink = sAny.theme_ink || "#1F2430";

  // CTA / hero buttons
  const booking = "#pricing";
  const showHeaderCta = sAny.show_header_cta !== false;
  const showHeroCta = sAny.show_hero_cta !== false;
  const showHeroCall = sAny.show_hero_call !== false;
  const ctaLabel = (sAny.cta_label || "").trim() || "Запази час";
  const callLabel = (sAny.call_label || "").trim() || "Обади се";

  // contact
  const phone = (settings?.phone || "").trim();
  const address = (settings?.address || "").trim();
  const hours = (settings?.working_hours || "").trim();
  const aboutText = (settings?.about_text || "").trim();

  const logoUrl = (settings?.logo_url || "").trim();

  const facebook = (settings?.facebook_url || "").trim();
  const instagram = (settings?.instagram_url || "").trim();
  const tiktok = (settings?.tiktok_url || "").trim();
  const youtube = (settings?.youtube_url || "").trim();

  // Maps
  const mapUrl = (settings?.google_maps_url || "").trim();
  const isEmbed =
    !!mapUrl && /^https:\/\/www\.google\.[a-z.]+\/maps\/embed/i.test(mapUrl);

  const mapEmbedSrc = isEmbed ? mapUrl : "";
  const mapOpenLink = !isEmbed ? mapUrl : "";
  const isProbablyUrl = (v: string) => /^https?:\/\//i.test(v);
  const safeMapOpenLink =
    mapOpenLink && isProbablyUrl(mapOpenLink) ? mapOpenLink : "";
  const hasMap = !!(mapEmbedSrc || safeMapOpenLink);

  // cards presence
  const showAddressCard = !!address;
  const showPhoneCard = !!phone;
  const showHoursCard = !!hours;
  const hasSocial = !!(facebook || instagram || tiktok || youtube);

  const contactCardsCount =
    (showAddressCard ? 1 : 0) +
    (showPhoneCard ? 1 : 0) +
    (showHoursCard ? 1 : 0);

  // data arrays
  const svc = (Array.isArray(services) ? services : []) as Service[];
  const gal = (Array.isArray(gallery) ? gallery : []) as GalleryImage[];

  const PLACEHOLDER = "/img/placeholder.svg";

  // ---- gallery sections ----
  const heroGallery = gal.find(
    (x) => (x.section || "").toString().toLowerCase() === "hero",
  );
  const aboutGallery = gal.find(
    (x) => (x.section || "").toString().toLowerCase() === "about",
  );
  const pricingGallery = gal.find(
    (x) => (x.section || "").toString().toLowerCase() === "pricing",
  );

  const work = gal.filter(
    (x) => (x.section || "work").toString().toLowerCase() === "work",
  );
  const venue = gal.filter(
    (x) => (x.section || "").toString().toLowerCase() === "venue",
  );
  const brands = gal.filter(
    (x) => (x.section || "").toString().toLowerCase() === "brands",
  );

  const heroImg = (heroGallery?.image_url || "").trim() || PLACEHOLDER;
  const aboutImg = (aboutGallery?.image_url || "").trim() || PLACEHOLDER;
  const pricingImg = (pricingGallery?.image_url || "").trim() || PLACEHOLDER;

  // ---- section copy ----
  const copy = {
    categoryLabel: (settings?.category_label || "").trim() || "УСЛУГИ",
    heroTitle: (settings?.hero_title || "").trim(),
    heroSubtitle: (settings?.hero_subtitle || "").trim(),

    servicesEyebrow: (settings?.services_eyebrow || "").trim(),
    servicesTitle: (settings?.services_title || "").trim(),
    servicesSubtitle: (settings?.services_subtitle || "").trim(),

    aboutEyebrow: (settings?.about_eyebrow || "").trim(),
    aboutTitle: (settings?.about_title || "").trim(),
    aboutCta: (settings?.about_cta_label || "").trim() || "Виж цени",

    brandsEyebrow: (settings?.brands_eyebrow || "").trim(),
    brandsTitle: (settings?.brands_title || "").trim(),
    brandsSubtitle: (settings?.brands_subtitle || "").trim(),

    pricingEyebrow: (settings?.pricing_eyebrow || "").trim(),
    pricingTitle: (settings?.pricing_title || "").trim() || "Ценоразпис",
    pricingSubtitle: (settings?.pricing_subtitle || "").trim(),
    pricingBadge:
      (settings?.pricing_badge || "").trim() ||
      "Без плащане онлайн • Плащане в обекта",

    galleryEyebrow: (settings?.gallery_eyebrow || "").trim(),
    galleryTitle: (settings?.gallery_title || "").trim(),
    gallerySubtitle: (settings?.gallery_subtitle || "").trim(),

    venueGalleryEyebrow:
      (settings?.venue_gallery_eyebrow || settings?.gallery_eyebrow || "").trim(),
    venueGalleryTitle: (settings?.gallery_venue_title || "").trim(),
    venueGallerySubtitle:
      (settings?.venue_gallery_subtitle || "").trim() ||
      "Атмосфера и комфорт в обекта.",

    reviewsEyebrow: (settings?.reviews_eyebrow || "").trim(),
    reviewsTitle: (settings?.reviews_title || "").trim(),
    reviewsSubtitle: (settings?.reviews_subtitle || "").trim(),

    contactEyebrow: (settings?.contact_eyebrow || "").trim(),
    contactTitle: (settings?.contact_title || "").trim() || "Свържи се с нас",
    contactSubtitle: (settings?.contact_subtitle || "").trim(),
  };

  // ---- on/off flags ----
  const showServices = sAny.show_services !== false;
  const showAbout = sAny.show_about !== false;
  const showPricing = sAny.show_pricing !== false;
  const showBrands = sAny.show_brands !== false;
  const showGallery = sAny.show_gallery !== false;
  const showVenue = sAny.show_venue !== false;
  const showReviews = sAny.show_reviews !== false;
  const showContact = sAny.show_contact !== false;

  // ---- derived ----
  const hasServices = svc.length > 0;
  const hasBrands = brands.length > 0;
  const hasGallery = work.length + venue.length > 0;
  const hasVenue = venue.length > 0;
  const hasReviews = Array.isArray(reviews) && reviews.length > 0;
  const hasContactInfo = !!(address || phone || hours || hasMap || hasSocial);

  // reviews
  const reviewsFinal: Review[] = Array.isArray(reviews)
    ? (reviews as Review[])
    : [];

  // featured services
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

  // hero feature cards
  const heroFeatures = normalizeHeroFeatures((settings as any)?.hero_features);

  // branding header rules
  const brandMode =
    ((settings?.brand_mode || "text").toLowerCase() as "logo" | "text") ||
    "text";
  const brandText = (settings?.brand_text || "").trim() || client.business_name;
  const brandSubtext = (settings?.brand_subtext || "").trim();
  const brandLetter = (brandText || client.business_name || "B")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <main style={{ background: surface, color: ink }} className="min-h-screen">
      {/* TOP BAR */}
      <header
        className="sticky top-0 z-30 border-b border-black/10 backdrop-blur"
        style={{ background: hexToRgba(bg, 0.86) }}
      >
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
                  <div className="text-[15px] font-semibold tracking-tight truncate">
                    {brandText}
                  </div>
                  {brandSubtext ? (
                    <div className="text-xs text-black/55 truncate">{brandSubtext}</div>
                  ) : null}
                </div>
              </>
            )}
          </a>

          {/* Nav */}
          <nav className="hidden items-center gap-7 text-[14px] font-semibold text-black/85 md:flex">
            {showServices && hasServices && (
              <a
                href="#services"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Услуги
              </a>
            )}
            {showAbout && (
              <a
                href="#about"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                За нас
              </a>
            )}
            {showPricing && hasServices && (
              <a
                href="#pricing"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Цени
              </a>
            )}
            {showGallery && hasGallery && (
              <a
                href="#gallery"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Галерия
              </a>
            )}
            {showVenue && hasVenue && (
              <a
                href="#venue"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Обект
              </a>
            )}
            {showReviews && hasReviews && (
              <a
                href="#reviews"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Отзиви
              </a>
            )}
            {showContact && hasContactInfo && (
              <a
                href="#contact"
                className="relative hover:text-black after:absolute after:-bottom-1 after:left-0 after:h-[1px] after:w-0 after:bg-black after:transition-all hover:after:w-full"
              >
                Контакти
              </a>
            )}
          </nav>

          {/* Social + CTA */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <SocialIcon href={facebook} label="Facebook" icon="facebook" />
              <SocialIcon href={instagram} label="Instagram" icon="instagram" />
              <SocialIcon href={tiktok} label="TikTok" icon="tiktok" />
              <SocialIcon href={youtube} label="YouTube" icon="youtube" />
            </div>

            {showHeaderCta ? (
              <ThemeButton href={booking} style={{ background: primary }}>
                {ctaLabel}
              </ThemeButton>
            ) : null}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: bg }} className="border-b border-black/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 py-14 md:grid-cols-12 md:py-20">
            {/* LEFT */}
            <div className="md:col-span-8 lg:col-span-8">
              <div className="text-[11px] font-semibold tracking-[0.30em] text-black/55">
                {copy.categoryLabel}
              </div>

              <h1
                className="mt-5 font-serif text-[46px] leading-[0.93] tracking-[-0.02em] md:text-[78px] lg:text-[86px]"
                style={{
                  color: ink,
                  fontFamily:
                    "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
                }}
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
                {showHeroCta ? (
                  <ThemeButton href="#pricing" style={{ background: primary }}>
                    {ctaLabel}
                  </ThemeButton>
                ) : null}

                {showHeroCall && phone ? (
                  <ThemeButton href={`tel:${phone}`} variant="secondary" className="gap-2">
                    {callLabel}
                  </ThemeButton>
                ) : null}
              </div>

              {/* Feature mini cards */}
              {heroFeatures.length ? (
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-3xl">
                  {heroFeatures.map((x) => (
                    <div
                      key={x.title}
                      className="rounded-2xl bg-white/55 p-4 shadow-sm ring-1 ring-black/10"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-white/70 ring-1 ring-black/10 grid place-items-center">
                          <FaIcon name={x.icon} sizePx={16} className="opacity-90" />
                        </div>
                        <div className="text-sm font-semibold" style={{ color: ink }}>
                          {x.title}
                        </div>
                      </div>
                      <div className="mt-3 text-xs leading-5 text-black/60">{x.text}</div>
                    </div>
                  ))}
                </div>
              ) : null}
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
      {showServices && hasServices && featuredWithImages.length > 0 && (
        <section id="services" style={{ background: surface }} className="border-b border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="text-center">
              {copy.servicesEyebrow ? (
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.servicesEyebrow}
                </div>
              ) : null}
              {copy.servicesTitle ? (
                <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                  {copy.servicesTitle}
                </h2>
              ) : null}
              {copy.servicesSubtitle ? <p className="mt-4 opacity-70">{copy.servicesSubtitle}</p> : null}
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
                    className={
                      (s.image_url || PLACEHOLDER) === PLACEHOLDER
                        ? "w-full h-72 object-contain p-10 bg-white/40"
                        : "w-full h-72 object-cover"
                    }
                  />
                  <div className="p-6">
                    <div className="text-xl font-semibold font-serif" style={{ color: ink }}>
                      {s.name}
                    </div>

                    {s.description ? <div className="mt-2 opacity-70 line-clamp-2">{s.description}</div> : null}

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
      )}

      {/* ABOUT */}
      {showAbout && (
        <section id="about" style={{ background: bg }} className="border-b border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-7">
                <div className="bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] overflow-hidden rounded-2xl h-[420px] md:h-[520px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={aboutImg}
                    alt=""
                    className={
                      aboutImg === PLACEHOLDER
                        ? "block w-full h-full object-contain p-12 bg-white/40 transition-transform duration-300 hover:scale-[1.02]"
                        : "block w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                    }
                  />
                </div>
              </div>

              <div className="lg:col-span-5">
                {copy.aboutEyebrow ? (
                  <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                    {copy.aboutEyebrow}
                  </div>
                ) : null}

                {copy.aboutTitle ? (
                  <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                    {copy.aboutTitle}
                  </h2>
                ) : null}

                {aboutText ? (
                  <div className="mt-6 space-y-4 opacity-80 leading-relaxed">
                    <p>{aboutText}</p>
                  </div>
                ) : null}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {showHeroCall && phone ? (
                    <ThemeButton href={`tel:${phone}`} variant="secondary" className="gap-2">
                      {callLabel}
                    </ThemeButton>
                  ) : null}

                  <ThemeButton href="#pricing" style={{ background: primary }} className="px-6">
                    {copy.aboutCta}
                  </ThemeButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY – work */}
      {showGallery && hasGallery && (
        <section id="gallery" style={{ background: surface }} className="border-b border-black/10">
          {(() => {
            const galleryItems = [...work, ...venue];
            if (!galleryItems.length) return null;

            return (
              <>
                <div className="mx-auto max-w-7xl px-6 pt-10 md:pt-14">
                  <div className="text-center">
                    {copy.galleryEyebrow ? (
                      <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                        {copy.galleryEyebrow}
                      </div>
                    ) : null}

                    {copy.galleryTitle ? (
                      <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                        {copy.galleryTitle}
                      </h2>
                    ) : null}

                    {copy.gallerySubtitle ? <p className="mt-4 opacity-70">{copy.gallerySubtitle}</p> : null}
                  </div>
                </div>

                <div className="mt-6 w-full overflow-x-clip pb-16 md:pb-20">
                  <WorkCarousel items={galleryItems} />
                </div>
              </>
            );
          })()}
        </section>
      )}

      {/* PRICING */}
      {showPricing && hasServices && (
        <>
          {pricingLayout === "v2" ? (
            <section id="pricing" style={{ background: surface }} className="border-b border-black/10">
              <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
                <div className="flex items-end justify-between gap-6 flex-wrap">
                  <div>
                    {copy.pricingEyebrow ? (
                      <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                        {copy.pricingEyebrow}
                      </div>
                    ) : null}
                    <h2 className="mt-2 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                      {copy.pricingTitle}
                    </h2>
                    {copy.pricingSubtitle ? <p className="mt-3 opacity-70 max-w-xl">{copy.pricingSubtitle}</p> : null}
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
            <section id="pricing" style={{ background: surface }} className="border-b border-black/10">
              <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
                <div className="grid lg:grid-cols-12 gap-10 items-stretch">
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

                  <div className="lg:col-span-6">
                    <div style={{ background: bg }} className="border border-black/10 p-8 md:p-10 h-full rounded-2xl">
                      {copy.pricingEyebrow ? (
                        <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                          {copy.pricingEyebrow}
                        </div>
                      ) : null}

                      <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                        {copy.pricingTitle}
                      </h2>

                      {copy.pricingSubtitle ? <p className="mt-4 opacity-75 max-w-xl">{copy.pricingSubtitle}</p> : null}

                      <div className="mt-8">
                        <ServicesTabs services={svc} primary={primary} slug={client.slug} />
                      </div>

                      <div className="mt-10">
                        <ThemeButton href={booking} style={{ background: primary }}>
                          {ctaLabel}
                        </ThemeButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* BRANDS */}
      {showBrands && hasBrands && (
        <section style={{ background: surface }} className="border-b border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-14 md:py-16">
            <div>
              {copy.brandsEyebrow ? (
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.brandsEyebrow}
                </div>
              ) : null}
              {copy.brandsTitle ? (
                <h2 className="mt-2 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                  {copy.brandsTitle}
                </h2>
              ) : null}
              {copy.brandsSubtitle ? <p className="mt-3 opacity-70 max-w-2xl">{copy.brandsSubtitle}</p> : null}
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {brands.slice(0, 24).map((b) => (
                <div
                  key={b.id}
                  className="h-24 rounded-xl border border-black/10 bg-white shadow-sm grid place-items-center p-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt="" className="max-h-full max-w-full object-contain opacity-90" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VENUE GALLERY */}
      {showVenue && hasVenue && (
        <section id="venue" style={{ background: bg }} className="border-b border-black/10">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="text-center">
              {copy.venueGalleryEyebrow ? (
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.venueGalleryEyebrow}
                </div>
              ) : null}

              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                {copy.venueGalleryTitle}
              </h2>

              {copy.venueGallerySubtitle ? <p className="mt-3 opacity-70">{copy.venueGallerySubtitle}</p> : null}
            </div>

            <div className="mt-12">
              <VenueGallery venue={venue} />
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {showReviews && hasReviews && (
        <section id="reviews" style={{ background: surface }} className="border-b border-black/10">
          <div className="mx-auto max-w-7xl px-6 pt-16 md:pt-20">
            <div className="text-center">
              {copy.reviewsEyebrow ? (
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.reviewsEyebrow}
                </div>
              ) : null}

              {copy.reviewsTitle ? (
                <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                  {copy.reviewsTitle}
                </h2>
              ) : null}

              {copy.reviewsSubtitle ? <p className="mt-3 opacity-70">{copy.reviewsSubtitle}</p> : null}
            </div>
          </div>

          <div className="mt-10 w-full overflow-x-clip pb-16 md:pb-20">
            <ReviewsCarousel
              reviews={reviewsFinal.slice(0, 8)}
              primary={primary}
              bg={surface}
            />
          </div>
        </section>
      )}
      
      {/* CONTACT */}
      {showContact && hasContactInfo && (
        <section id="contact" style={{ background: bg }}>
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <div className="text-center">
              {copy.contactEyebrow ? (
                <div className="text-sm italic opacity-70" style={{ fontFamily: "cursive" }}>
                  {copy.contactEyebrow}
                </div>
              ) : null}

              <h2 className="mt-3 font-serif text-3xl md:text-4xl font-semibold tracking-wide" style={{ color: ink }}>
                {copy.contactTitle}
              </h2>

              {copy.contactSubtitle ? <p className="mt-3 opacity-70">{copy.contactSubtitle}</p> : null}
            </div>

            {/* MAP (only if exists) */}
            {hasMap ? (
              <div className="mt-10 bg-white border border-black/10 shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-4 rounded-2xl">
                <div className="bg-[#f3f3f3] border border-black/10 rounded-2xl overflow-hidden">
                  <div className="h-64 md:h-80">
                    {mapEmbedSrc ? (
                      <iframe
                        src={mapEmbedSrc}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                        title="Google Map"
                      />
                    ) : (
                      <div className="h-full grid place-items-center text-sm opacity-70">
                        <a href={safeMapOpenLink} target="_blank" rel="noreferrer" className="underline">
                          Отвори в Google Maps →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* CONTACT CARDS (render only existing fields) */}
            {contactCardsCount > 0 ? (
              <div className="mt-10 grid gap-6 items-stretch md:grid-cols-3">
                {address ? (
                  <ContactCard
                    title="Адрес"
                    value={address}
                    icon={<FaIcon name="map-marker-alt" sizePx={30} className="text-black/70" />}
                  />
                ) : null}

                {phone ? (
                  <ContactCard
                    title="Телефон"
                    value={phone}
                    icon={<FaIcon name="phone" sizePx={30} className="text-black/70" />}
                  />
                ) : null}

                {hours ? (
                  <ContactCard
                    title="Работно време"
                    value={hours}
                    icon={<FaIcon name="clock" sizePx={30} className="text-black/70" />}
                  />
                ) : null}
              </div>
            ) : null}

            {/* SOCIAL (only if has any) */}
            {hasSocial ? (
              <div className="mt-10 flex items-center justify-center gap-2">
                <SocialIcon href={facebook} label="Facebook" icon="facebook" />
                <SocialIcon href={instagram} label="Instagram" icon="instagram" />
                <SocialIcon href={tiktok} label="TikTok" icon="tiktok" />
                <SocialIcon href={youtube} label="YouTube" icon="youtube" />
              </div>
            ) : null}
          </div>
        </section>
      )}

      <footer className="border-t border-black/10" style={{ background: surface }}>
        <div className="mx-auto max-w-7xl px-6 py-10 flex items-center justify-between flex-wrap gap-4 opacity-70 text-sm">
          <div>
            © {new Date().getFullYear()} {client.business_name}
          </div>
          {showServices && hasServices ? (
            <a href="#services" className="underline">
              Услуги
            </a>
          ) : null}
        </div>
      </footer>

      {/* Mobile CTA */}
      <div className="md:hidden fixed bottom-3 left-0 right-0 px-4 z-40">
        <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur border border-black/10 shadow-lg p-3 flex gap-3 rounded-2xl">
          <ThemeButton href={booking} fullWidth style={{ background: primary }}>
            {ctaLabel || "Запази"}
          </ThemeButton>

          {phone ? (
            <ThemeButton href={`tel:${phone}`} variant="secondary" fullWidth>
              {callLabel || "Обади се"}
            </ThemeButton>
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

function ContactCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        bg-white border border-black/10
        shadow-[0_18px_50px_rgba(0,0,0,0.07)]
        rounded-2xl
        px-6 py-6
        text-center
        flex flex-col items-center
      "
    >
      {/* Icon */}
      <div className="h-12 w-12 grid place-items-center mb-3">
        {icon}
      </div>

      {/* Title */}
      <div className="text-[16px] font-bold leading-tight">
        {title}
      </div>

      {/* Value */}
      <div className="mt-4 text-[15px] leading-6 text-black/80 break-words">
        {value}
      </div>
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
    const best =
      byCat[c]?.find((x) => Number.isFinite(Number((x as any)?.price_from))) ||
      byCat[c]?.[0];
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
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, 3)
    .map((x) => ({
      icon: (x?.icon || "").toString().trim() || "star",
      title: (x?.title || "").toString().trim(),
      text: (x?.text || "").toString().trim(),
    }))
    .filter((x) => x.title.length > 0 && x.text.length > 0);
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
    <a
      className={base}
      href={href}
      aria-label={label}
      title={label}
      target="_blank"
      rel="noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/icons/${icon}.svg`} alt={label} className="h-[18px] w-[18px]" />
    </a>
  );
}

/**
 * Convert hex (#RRGGBB) to rgba(r,g,b,a).
 * Used for header translucent background.
 */
function hexToRgba(hex: string, alpha: number) {
  const h = (hex || "").replace("#", "").trim();
  if (h.length !== 6) return `rgba(243,216,212,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
