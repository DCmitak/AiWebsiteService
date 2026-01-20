// app/admin/[slug]/settings/page.tsx
import type React from "react";
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import FaIconPreview from "@/app/admin/_components/FaIconPreview";
import ColorFieldClient from "@/app/admin/_components/ColorFieldClient";

type SiteSettingsRow = {
  client_id: string;

  theme_preset?: string | null;
  // theme colors (Minimal)
  primary_color?: string | null;
  theme_bg?: string | null;
  theme_surface?: string | null;
  theme_ink?: string | null;

  // CTA / Hero buttons
  cta_label?: string | null;
  call_label?: string | null;
  show_header_cta?: boolean | null;  // Запази час в header
  show_hero_cta?: boolean | null;    // Запази час в hero
  show_hero_call?: boolean | null;   // Обади се в hero


  // branding
  logo_url?: string | null;
  brand_mode?: "logo" | "text" | string | null;
  brand_text?: string | null;
  brand_subtext?: string | null;

  // contact
  phone?: string | null;
  address?: string | null;
  working_hours?: string | null;

  // hero
  category_label?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;

  // hero features (json in DB)
  hero_features?: any;

  // about
  about_text?: string | null;

  // maps + social
  google_maps_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;

  // layout
  pricing_layout?: "v1" | "v2" | string | null;

  // section texts
  services_eyebrow?: string | null;
  services_title?: string | null;
  services_subtitle?: string | null;

  about_eyebrow?: string | null;
  about_title?: string | null;
  about_cta_label?: string | null;

  brands_eyebrow?: string | null;
  brands_title?: string | null;
  brands_subtitle?: string | null;

  pricing_eyebrow?: string | null;
  pricing_title?: string | null;
  pricing_subtitle?: string | null;
  pricing_badge?: string | null;

  gallery_eyebrow?: string | null;
  gallery_title?: string | null;
  gallery_subtitle?: string | null;
  gallery_work_title?: string | null; // за съвместимост
  gallery_venue_title?: string | null;

  // отделни полета за галерията на обекта
  venue_gallery_eyebrow?: string | null;
  venue_gallery_subtitle?: string | null;

  reviews_eyebrow?: string | null;
  reviews_title?: string | null;
  reviews_subtitle?: string | null;

  contact_eyebrow?: string | null;
  contact_title?: string | null;
  contact_subtitle?: string | null;

  // visibility toggles
  show_services?: boolean | null;
  show_about?: boolean | null;
  show_brands?: boolean | null;
  show_pricing?: boolean | null;
  show_gallery?: boolean | null;
  show_venue?: boolean | null;
  show_reviews?: boolean | null;
  show_contact?: boolean | null;

  updated_at?: string | null;
};

const BUCKET = "branding"; // make sure this bucket exists in Supabase Storage

export default async function AdminSettings(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; toast?: string }>;
}) {
  const [{ slug }, { key, toast }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; business_name: string }>();

  if (clientErr) return <div className="p-8">DB error: {clientErr.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  const { data: settings, error: settingsErr } = await sb
    .from("site_settings")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle<SiteSettingsRow>();

  if (settingsErr)
    return <div className="p-8">DB error: {settingsErr.message}</div>;

  const toastText =
    toast === "saved"
      ? "Saved successfully."
      : toast === "logo_uploaded"
      ? "Logo uploaded."
      : toast === "logo_removed"
      ? "Logo removed."
      : toast === "missing_file"
      ? "Please choose a file first."
      : toast === "upload_failed"
      ? "Upload failed."
      : toast === "bucket_missing"
      ? `Storage bucket "${BUCKET}" is missing. Create it in Supabase.`
      : null;

  async function save(formData: FormData) {
    "use server";

    const themeBg = pickColor(formData, "theme_bg");
    const themeSurface = pickColor(formData, "theme_surface");
    const themeInk = pickColor(formData, "theme_ink");

    const primaryColor = pickColor(formData, "primary_color") || "#dca263";

    const ctaLabel = (formData.get("cta_label")?.toString() || "").trim() || null;
    const callLabel = (formData.get("call_label")?.toString() || "").trim() || null;

    const showHeaderCta = formData.get("show_header_cta")?.toString() === "on";
    const showHeroCta = formData.get("show_hero_cta")?.toString() === "on";
    const showHeroCall = formData.get("show_hero_call")?.toString() === "on";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const themePreset =
      (formData.get("theme_preset")?.toString() || "").trim() || "minimal";
    const rawPricingLayout = (
      formData.get("pricing_layout")?.toString() || "v1"
    )
      .trim()
      .toLowerCase();
    const pricingLayout = rawPricingLayout === "v2" ? "v2" : "v1";

    const rawBrandMode = (
      formData.get("brand_mode")?.toString() || "text"
    )
      .trim()
      .toLowerCase();
    const brandMode = rawBrandMode === "logo" ? "logo" : "text";

    const features = buildHeroFeaturesFromForm(formData);

    // Google Maps: accept iframe OR embed URL; store normalized value in google_maps_url
    const mapsRaw = (formData.get("google_maps_embed")?.toString() || "").trim();
    const googleMapsEmbed = extractGoogleMapsEmbedSrc(mapsRaw);

    // visibility toggles (checkbox → boolean)
    const showServices = formData.get("show_services")?.toString() === "on";
    const showAbout = formData.get("show_about")?.toString() === "on";
    const showBrands = formData.get("show_brands")?.toString() === "on";
    const showPricing = formData.get("show_pricing")?.toString() === "on";
    const showGallery = formData.get("show_gallery")?.toString() === "on";
    const showVenue = formData.get("show_venue")?.toString() === "on";
    const showReviews = formData.get("show_reviews")?.toString() === "on";
    const showContact = formData.get("show_contact")?.toString() === "on";

    const payload: SiteSettingsRow = {
      client_id: clientId,

      theme_preset: themePreset,
      primary_color: primaryColor,
      theme_bg: themeBg,
      theme_surface: themeSurface,
      theme_ink: themeInk,

      cta_label: ctaLabel,
      call_label: callLabel,
      show_header_cta: showHeaderCta,
      show_hero_cta: showHeroCta,
      show_hero_call: showHeroCall,

      pricing_layout: pricingLayout,

      brand_mode: brandMode,
      brand_text: (formData.get("brand_text")?.toString() || "").trim() || null,
      brand_subtext:
        (formData.get("brand_subtext")?.toString() || "").trim() || null,

      phone: (formData.get("phone")?.toString() || "").trim() || null,
      address: (formData.get("address")?.toString() || "").trim() || null,
      working_hours:
        (formData.get("working_hours")?.toString() || "").trim() || null,

      category_label:
        (formData.get("category_label")?.toString() || "").trim() || null,
      hero_title: (formData.get("hero_title")?.toString() || "").trim() || null,
      hero_subtitle:
        (formData.get("hero_subtitle")?.toString() || "").trim() || null,

      hero_features: features,

      about_text: (formData.get("about_text")?.toString() || "").trim() || null,

      // ✅ stored as embed src (preferred) OR regular maps link (fallback)
      google_maps_url: googleMapsEmbed,

      instagram_url:
        (formData.get("instagram_url")?.toString() || "").trim() || null,
      facebook_url:
        (formData.get("facebook_url")?.toString() || "").trim() || null,
      tiktok_url: (formData.get("tiktok_url")?.toString() || "").trim() || null,
      youtube_url:
        (formData.get("youtube_url")?.toString() || "").trim() || null,

      services_eyebrow:
        (formData.get("services_eyebrow")?.toString() || "").trim() || null,
      services_title:
        (formData.get("services_title")?.toString() || "").trim() || null,
      services_subtitle:
        (formData.get("services_subtitle")?.toString() || "").trim() || null,

      about_eyebrow:
        (formData.get("about_eyebrow")?.toString() || "").trim() || null,
      about_title:
        (formData.get("about_title")?.toString() || "").trim() || null,
      about_cta_label:
        (formData.get("about_cta_label")?.toString() || "").trim() || null,

      brands_eyebrow:
        (formData.get("brands_eyebrow")?.toString() || "").trim() || null,
      brands_title:
        (formData.get("brands_title")?.toString() || "").trim() || null,
      brands_subtitle:
        (formData.get("brands_subtitle")?.toString() || "").trim() || null,

      pricing_eyebrow:
        (formData.get("pricing_eyebrow")?.toString() || "").trim() || null,
      pricing_title:
        (formData.get("pricing_title")?.toString() || "").trim() || null,
      pricing_subtitle:
        (formData.get("pricing_subtitle")?.toString() || "").trim() || null,
      pricing_badge:
        (formData.get("pricing_badge")?.toString() || "").trim() || null,

      gallery_eyebrow:
        (formData.get("gallery_eyebrow")?.toString() || "").trim() || null,
      gallery_title:
        (formData.get("gallery_title")?.toString() || "").trim() || null,
      gallery_subtitle:
        (formData.get("gallery_subtitle")?.toString() || "").trim() || null,
      gallery_work_title:
        (formData.get("gallery_work_title")?.toString() || "").trim() || null,
      gallery_venue_title:
        (formData.get("gallery_venue_title")?.toString() || "").trim() || null,

      venue_gallery_eyebrow:
        (formData.get("venue_gallery_eyebrow")?.toString() || "").trim() || null,
      venue_gallery_subtitle:
        (formData.get("venue_gallery_subtitle")?.toString() || "").trim() || null,

      reviews_eyebrow:
        (formData.get("reviews_eyebrow")?.toString() || "").trim() || null,
      reviews_title:
        (formData.get("reviews_title")?.toString() || "").trim() || null,
      reviews_subtitle:
        (formData.get("reviews_subtitle")?.toString() || "").trim() || null,

      contact_eyebrow:
        (formData.get("contact_eyebrow")?.toString() || "").trim() || null,
      contact_title:
        (formData.get("contact_title")?.toString() || "").trim() || null,
      contact_subtitle:
        (formData.get("contact_subtitle")?.toString() || "").trim() || null,

      show_services: showServices,
      show_about: showAbout,
      show_brands: showBrands,
      show_pricing: showPricing,
      show_gallery: showGallery,
      show_venue: showVenue,
      show_reviews: showReviews,
      show_contact: showContact,

      updated_at: new Date().toISOString(),
    };

    const sb2 = supabaseServer();
    const { error } = await sb2
      .from("site_settings")
      .upsert(payload, { onConflict: "client_id" });
    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/settings`);
    redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=saved`);
  }

  async function uploadLogo(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const file = formData.get("logo_file") as File | null;
    if (!file || file.size <= 0) {
      revalidatePath(`/admin/${slug}/settings`);
      return redirect(
        `/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=missing_file`,
      );
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) throw new Error("File too large (max 5MB).");

    const sb2 = supabaseServer();

    const safeName = sanitizeFileName(file.name || "logo");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const path = `${clientId}/logo-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: true,
    });

    if (upErr) {
      revalidatePath(`/admin/${slug}/settings`);
      const msg = (upErr.message || "").toLowerCase();
      if (msg.includes("bucket") && msg.includes("not")) {
        return redirect(
          `/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=bucket_missing`,
        );
      }
      return redirect(
        `/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=upload_failed`,
      );
    }

    const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const { error } = await sb2
      .from("site_settings")
      .upsert(
        { client_id: clientId, logo_url: url, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      );

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/settings`);
    redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=logo_uploaded`);
  }

  async function removeLogo(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const oldUrl = (formData.get("old_logo_url")?.toString() || "").trim();
    const sb2 = supabaseServer();

    const { error } = await sb2
      .from("site_settings")
      .upsert(
        { client_id: clientId, logo_url: null, updated_at: new Date().toISOString() },
        { onConflict: "client_id" },
      );

    if (error) throw new Error(error.message);

    const oldPath = storagePathFromPublicUrl(oldUrl, BUCKET);
    if (oldPath) {
      await sb2.storage.from(BUCKET).remove([oldPath]);
    }

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/settings`);
    redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=logo_removed`);
  }

  const publicUrl = `/${slug}`;
  const s = settings || ({} as SiteSettingsRow);
  const features = normalizeHeroFeaturesForAdmin(s.hero_features);

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav
          slug={client.slug}
          businessName={`${client.business_name} — Settings`}
          keyParam={key}
          active="settings"
        />

        {toastText ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastText}
          </div>
        ) : null}

        <form action={save} className="space-y-4">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="client_id" value={client.id} />
          <input type="hidden" name="old_logo_url" value={s.logo_url || ""} />

          <Section title="Theme" subtitle="Preset, primary color, pricing layout" defaultOpen>
            <FieldSelect
              name="theme_preset"
              label="Theme preset"
              defaultValue={s.theme_preset || "minimal"}
              options={[
                { value: "luxe", label: "Luxe (женствен/лукс)" },
                { value: "minimal", label: "Minimal (чист/универсален)" },
              ]}
            />

            <ColorFieldClient
              name="primary_color"
              label="Primary color (CTA)"
              defaultValue={s.primary_color || "#dca263"}
            />

            <ColorFieldClient
              name="theme_bg"
              label="Theme BG (Minimal)"
              defaultValue={s.theme_bg || "#F3D8D4"}
            />

            <ColorFieldClient
              name="theme_surface"
              label="Theme Surface (Minimal)"
              defaultValue={s.theme_surface || "#F7EFEE"}
            />

            <ColorFieldClient
              name="theme_ink"
              label="Theme Ink/Text (Minimal)"
              defaultValue={s.theme_ink || "#1F2430"}
            />

            <Field
              name="cta_label"
              label='Текст на бутона “Запази”'
              defaultValue={s.cta_label || "Запази час"}
            />

            <Field
              name="call_label"
              label='Текст на бутона “Обади се”'
              defaultValue={s.call_label || "Обади се"}
            />

            <div className="text-xs text-gray-500">
              Линкът на “Запази” е фиксиран към #pricing.
            </div>

            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="show_header_cta" defaultChecked={s.show_header_cta ?? true} />
                Показвай “Запази час” в Header
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="show_hero_cta" defaultChecked={s.show_hero_cta ?? true} />
                Показвай “Запази час” в Hero
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="show_hero_call" defaultChecked={s.show_hero_call ?? true} />
                Показвай “Обади се” в Hero и За нас секциите (само ако има телефон)
              </label>
            </div>

            <FieldSelect
              name="pricing_layout"
              label="Pricing layout"
              defaultValue={s.pricing_layout || "v1"}
              options={[
                { value: "v1", label: "V1 – Pricing with image + Tabs" },
                { value: "v2", label: "V2 – App-style (no image)" },
              ]}
            />

            <div className="text-xs text-gray-500">Влияе на Minimal pricing секцията.</div>
          </Section>

          <Section title="Branding (Minimal)" subtitle="Text + circle OR logo only" defaultOpen>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">Logo</div>
                  <div className="text-xs text-gray-500">
                    Upload logo image за хедъра. Препоръчително: PNG/SVG с прозрачен фон.
                  </div>
                </div>
              </div>

              {s.logo_url ? (
                <div className="flex items-center gap-4 mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                  <div className="text-xs text-gray-500 break-all">{s.logo_url}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2">Няма качено лого.</div>
              )}

              <div className="space-y-2 mt-3">
                <input
                  type="file"
                  name="logo_file"
                  accept="image/*"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
                    formAction={uploadLogo}
                    type="submit"
                  >
                    Upload logo
                  </button>

                  {s.logo_url ? (
                    <button
                      className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold hover:bg-gray-100 transition"
                      formAction={removeLogo}
                      type="submit"
                    >
                      Remove logo
                    </button>
                  ) : null}

                  <div className="text-xs text-gray-500">Max 5MB. PNG/SVG/JPG.</div>
                </div>
              </div>
            </div>

            <FieldSelect
              name="brand_mode"
              label="Branding mode"
              defaultValue={(s.brand_mode || "text").toString()}
              options={[
                { value: "text", label: "Text + circle (recommended)" },
                { value: "logo", label: "Logo only" },
              ]}
            />
            <Field
              name="brand_text"
              label="Brand text (optional override)"
              defaultValue={s.brand_text || ""}
            />
            <Field
              name="brand_subtext"
              label="Brand subtext (optional; leave empty to hide)"
              defaultValue={s.brand_subtext || ""}
            />

            <div className="text-xs text-gray-500">
              “Logo only” показва само логото (ако има). При “Text” (или ако няма лого) ще има
              кръг с първа буква + текст.
            </div>
          </Section>

          <Section title="Основни" subtitle="Контакти и работно време" defaultOpen>
            <Field name="phone" label="Телефон" defaultValue={s.phone || ""} />
            <Field name="address" label="Адрес" defaultValue={s.address || ""} />
            <Field name="working_hours" label="Работно време" defaultValue={s.working_hours || ""} />
          </Section>

          <Section
            title="Hero Top Section (Minimal)"
            subtitle="Заглавия + feature cards (max 3)"
            defaultOpen
          >
            <Field
              name="category_label"
              label="Category label (над заглавието)"
              defaultValue={s.category_label || ""}
            />
            <Field name="hero_title" label="Hero title (H1)" defaultValue={s.hero_title || ""} />
            <TextArea
              name="hero_subtitle"
              label="Hero subtitle"
              defaultValue={s.hero_subtitle || ""}
              rows={4}
            />

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Hero feature cards (max 3)</div>
                  <div className="text-xs text-gray-500">
                    Икона + заглавие + текст.
                  </div>
                </div>
                <div className="text-xs text-gray-500">Minimal template</div>
              </div>

              <div className="mt-4 space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="pt-4 first:pt-0 border-t first:border-t-0 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-900">
                        Feature card #{i + 1}
                      </div>
                      <div className="text-xs text-gray-500">Shown in hero</div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <FieldSelect
                        name={`hf_${i}_icon`}
                        label="Icon"
                        defaultValue={features[i]?.icon || "star"}
                        options={[
                          { value: "star", label: "Star" },
                          { value: "broom", label: "Clean (Broom)" },
                          { value: "calendar-check", label: "Booking (Calendar)" },
                          { value: "hand-sparkles", label: "Care (Hands)" },
                          { value: "shield", label: "Trust (Shield)" },
                          { value: "gem", label: "Premium (Gem)" },
                          { value: "heart", label: "Love (Heart)" },
                          { value: "user-check", label: "Professional (User-check)" },
                          { value: "check-circle", label: "Approved (Check)" },
                          { value: "magic", label: "Magic" },
                        ]}
                      />

                      <Field
                        name={`hf_${i}_title`}
                        label="Title"
                        defaultValue={features[i]?.title || ""}
                      />

                      <Field
                        name={`hf_${i}_text`}
                        label="Text"
                        defaultValue={features[i]?.text || ""}
                      />
                    </div>

                    {/* Preview – без допълнителна карта */}
                    <div className="mt-3 flex items-start gap-3 text-sm text-gray-700">
                      <FaIconPreview
                        name={features[i]?.icon || "star"}
                        className="text-[18px] opacity-70 mt-[2px]"
                      />
                      <div>
                        <div className="font-semibold">
                          {features[i]?.title || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {features[i]?.text || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </Section>

          <Section
            title="Featured Services Section (Minimal)"
            subtitle="Заглавия за секцията Услуги"
            toggleName="show_services"
            toggleDefaultChecked={s.show_services ?? true}
            toggleLabel='Показвай секцията „Услуги“ на публичния сайт'
          >
            <Field name="services_eyebrow" label="Eyebrow" defaultValue={s.services_eyebrow || ""} />
            <Field name="services_title" label="Title" defaultValue={s.services_title || ""} />
            <TextArea
              name="services_subtitle"
              label="Subtitle"
              defaultValue={s.services_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section
            title="About Section (Minimal)"
            subtitle="За нас"
            toggleName="show_about"
            toggleDefaultChecked={s.show_about ?? false}
            toggleLabel='Показвай секцията „За нас“'
          >
            <Field name="about_eyebrow" label="Eyebrow" defaultValue={s.about_eyebrow || ""} />
            <Field name="about_title" label="Title" defaultValue={s.about_title || ""} />
            <Field name="about_cta_label" label="CTA button label" defaultValue={s.about_cta_label || ""} />
            <TextArea
              name="about_text"
              label="About text (дълъг текст)"
              defaultValue={s.about_text || ""}
              rows={7}
            />
          </Section>

          <Section
            title="Brands section (Minimal)"
            subtitle='Логата се качват в Gallery → section "brands"'
            toggleName="show_brands"
            toggleDefaultChecked={s.show_brands ?? true}
            toggleLabel='Показвай секцията „Марки“'
          >
            <Field name="brands_eyebrow" label="Eyebrow" defaultValue={s.brands_eyebrow || ""} />
            <Field name="brands_title" label="Title" defaultValue={s.brands_title || ""} />
            <TextArea
              name="brands_subtitle"
              label="Subtitle"
              defaultValue={s.brands_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section
            title="Pricing section (Minimal)"
            subtitle="Ценоразпис"
            toggleName="show_pricing"
            toggleDefaultChecked={s.show_pricing ?? true}
            toggleLabel='Показвай секцията „Цени“'
          >
            <Field name="pricing_eyebrow" label="Eyebrow" defaultValue={s.pricing_eyebrow || ""} />
            <Field name="pricing_title" label="Title" defaultValue={s.pricing_title || ""} />
            <TextArea
              name="pricing_subtitle"
              label="Subtitle"
              defaultValue={s.pricing_subtitle || ""}
              rows={3}
            />
            <Field name="pricing_badge" label="Badge text (shown in pricing v2)" defaultValue={s.pricing_badge || ""} />
          </Section>

          <Section
            title="Gallery section (Minimal)"
            subtitle="Основна галерия – снимки от работата + общи заглавия"
            toggleName="show_gallery"
            toggleDefaultChecked={s.show_gallery ?? true}
            toggleLabel='Показвай основната секция „Галерия“'
          >
            <Field name="gallery_eyebrow" label="Eyebrow" defaultValue={s.gallery_eyebrow || ""} />
            <Field name="gallery_title" label="Title (главна галерия)" defaultValue={s.gallery_title || ""} />
            <TextArea
              name="gallery_subtitle"
              label="Subtitle (главна галерия)"
              defaultValue={s.gallery_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section
            title="Venue gallery section (Minimal)"
            subtitle='„Галерия на обекта“ – използва снимки с section "venue"'
            toggleName="show_venue"
            toggleDefaultChecked={s.show_venue ?? true}
            toggleLabel='Показвай секцията „Галерия на обекта“'
          >
            <Field name="venue_gallery_eyebrow" label="Eyebrow" defaultValue={s.venue_gallery_eyebrow || ""} />
            <Field name="gallery_venue_title" label="Title (Галерия на обекта)" defaultValue={s.gallery_venue_title || ""} />
            <TextArea
              name="venue_gallery_subtitle"
              label="Subtitle (Галерия на обекта)"
              defaultValue={s.venue_gallery_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section
            title="Reviews section (Minimal)"
            subtitle="Отзиви"
            toggleName="show_reviews"
            toggleDefaultChecked={s.show_reviews ?? true}
            toggleLabel='Показвай секцията „Отзиви“'
          >
            <Field name="reviews_eyebrow" label="Eyebrow" defaultValue={s.reviews_eyebrow || ""} />
            <Field name="reviews_title" label="Title" defaultValue={s.reviews_title || ""} />
            <TextArea
              name="reviews_subtitle"
              label="Subtitle"
              defaultValue={s.reviews_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section
            title="Contact section (Minimal)"
            subtitle="Контакти"
            toggleName="show_contact"
            toggleDefaultChecked={s.show_contact ?? true}
            toggleLabel='Показвай секцията „Контакти“'
          >
            <Field name="contact_eyebrow" label="Eyebrow" defaultValue={s.contact_eyebrow || ""} />
            <Field name="contact_title" label="Title" defaultValue={s.contact_title || ""} />
            <TextArea
              name="contact_subtitle"
              label="Subtitle"
              defaultValue={s.contact_subtitle || ""}
              rows={3}
            />
          </Section>

          <Section title="Social + Maps" subtitle="Външни линкове">
            <TextArea
              name="google_maps_embed"
              label="Google Maps Embed (iframe или embed URL)"
              defaultValue={s.google_maps_url || ""}
              rows={4}
            />

            <div className="text-xs text-gray-500">
              Как да вземеш embed:
              <ol className="list-decimal ml-5 mt-1 space-y-1">
                <li>Отвори локацията в Google Maps</li>
                <li>
                  Натисни <strong>Share</strong> (Споделяне)
                </li>
                <li>
                  Избери таб <strong>Embed a map</strong>
                </li>
                <li>
                  Копирай целия <code>{`<iframe ...></iframe>`}</code> код и го постави тук
                </li>
              </ol>
              <div className="mt-2">
                Може да поставиш и директно embed URL, който започва с{" "}
                <code>https://www.google.com/maps/embed?</code>
              </div>
            </div>

            <Field name="instagram_url" label="Instagram URL" defaultValue={s.instagram_url || ""} />
            <Field name="facebook_url" label="Facebook URL" defaultValue={s.facebook_url || ""} />
            <Field name="tiktok_url" label="TikTok URL" defaultValue={s.tiktok_url || ""} />
            <Field name="youtube_url" label="YouTube URL" defaultValue={s.youtube_url || ""} />
          </Section>

          {/* Sticky Save Bar */}
          <div className="sticky bottom-3 z-20">
            <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Public:{" "}
                <Link className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                  {publicUrl}
                </Link>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
              >
                Save
              </button>
            </div>
          </div>
        </form>

        <p className="text-sm text-gray-500">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}

/* ---------------- UI helpers ---------------- */

function Section({
  title,
  subtitle,
  defaultOpen,
  children,
  toggleName,
  toggleDefaultChecked,
  toggleLabel,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  toggleName?: string;
  toggleDefaultChecked?: boolean | null;
  toggleLabel?: string;
}) {
  return (
    <details
      className="group rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      open={!!defaultOpen}
    >
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-start justify-between gap-4 p-6 bg-white border-b border-gray-100">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
          </div>

          <div className="flex flex-col items-end gap-2 w-[140px]">
            {toggleName ? (
              <SectionToggle
                name={toggleName}
                defaultChecked={toggleDefaultChecked ?? true}
                label={toggleLabel || "Показвай тази секция на сайта"}
              />
            ) : null}

            <div className="text-xs text-gray-400 group-open:hidden">Expand</div>
            <div className="text-xs text-gray-400 hidden group-open:block">Collapse</div>
          </div>
        </div>
      </summary>

      <div className="p-6 pt-5 bg-white">
        <div className="space-y-4 [&>*:first-child]:mt-1">{children}</div>
      </div>
    </details>
  );
}

function SectionToggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean | null;
}) {
  const checked = defaultChecked ?? true;

  return (
    <label className="inline-flex items-center justify-end select-none" title={label} aria-label={label}>
      <input type="checkbox" name={name} defaultChecked={checked} className="peer sr-only" />
      <span
        className="
          relative inline-flex h-6 w-11 items-center rounded-full
          bg-gray-300 transition-colors
          peer-checked:bg-emerald-500
          before:absolute before:h-4 before:w-4 before:rounded-full
          before:bg-white before:shadow-sm before:left-1
          before:transition-transform
          peer-checked:before:translate-x-5
        "
      />
    </label>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function FieldSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  rows,
}: {
  name: string;
  label: string;
  defaultValue: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows ?? 6}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

/* ---------------- utils ---------------- */

function pickColor(formData: FormData, name: string): string | null {
  const fromPicker = (formData.get(name)?.toString() || "").trim();
  const fromText = (formData.get(`${name}_text`)?.toString() || "").trim();

  const v = fromText || fromPicker;
  if (!v) return null;

  return /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

function storagePathFromPublicUrl(publicUrl: string, bucket: string) {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return u.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

function normalizeHeroFeaturesForAdmin(raw: any) {
  const fallback = [
    {
      icon: "star",
      title: "Професионално отношение",
      text: "Фокус върху качество и детайл.",
    },
    {
      icon: "broom",
      title: "Чистота и комфорт",
      text: "Уютна атмосфера и грижа за клиента.",
    },
    {
      icon: "calendar-check",
      title: "Лесно записване",
      text: "Онлайн букинг и бърза връзка.",
    },
  ];

  // няма данни → връщаме default трите карти
  if (!Array.isArray(raw)) return fallback;

  const cleaned = raw.slice(0, 3).map((x) => ({
    // важното: fallback icon е "star", не emoji
    icon: (x?.icon || "").toString().trim() || "star",
    title: (x?.title || "").toString().trim(),
    text: (x?.text || "").toString().trim(),
  }));

  // подсигуряваме 3 слота за UI
  while (cleaned.length < 3) cleaned.push({ icon: "star", title: "", text: "" });

  return cleaned.slice(0, 3);
}


function buildHeroFeaturesFromForm(formData: FormData) {
  const out: Array<{ icon?: string; title: string; text: string }> = [];
  for (let i = 0; i < 3; i++) {
    const icon = (formData.get(`hf_${i}_icon`)?.toString() || "").trim() || "star";
    const title = (formData.get(`hf_${i}_title`)?.toString() || "").trim();
    const text = (formData.get(`hf_${i}_text`)?.toString() || "").trim();
    if (title && text) out.push({ icon, title, text });
  }
  return out;
}

/**
 * Accepts:
 * - full <iframe ... src="..."></iframe>
 * - plain embed URL (preferred)
 * - plain google maps URL (fallback for "open in maps")
 * Stores ONLY the URL string in DB.
 */
function extractGoogleMapsEmbedSrc(input: string): string | null {
  const s = (input || "").trim();
  if (!s) return null;

  // If pasted full iframe, extract src=""
  const m = s.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (m?.[1]) return normalizeGoogleMapsUrl(m[1].trim());

  // If pasted plain URL
  return normalizeGoogleMapsUrl(s);
}

function normalizeGoogleMapsUrl(url: string): string | null {
  const u = (url || "").trim();
  if (!u) return null;

  // preferred: embed
  if (/^https:\/\/www\.google\.[a-z.]+\/maps\/embed/i.test(u)) return u;

  // fallback: normal maps link (frontend can render "open in maps")
  if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps/i.test(u)) return u;

  return null;
}
