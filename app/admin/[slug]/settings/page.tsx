// app/admin/[slug]/settings/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";

type SiteSettingsRow = {
  client_id: string;

  theme_preset?: string | null;
  primary_color?: string | null;

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
  gallery_work_title?: string | null;
  gallery_venue_title?: string | null;

  reviews_eyebrow?: string | null;
  reviews_title?: string | null;
  reviews_subtitle?: string | null;

  contact_eyebrow?: string | null;
  contact_title?: string | null;
  contact_subtitle?: string | null;

  updated_at?: string | null;
};

const BUCKET = "branding"; // make sure this bucket exists in Supabase Storage

export default async function AdminSettings(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; toast?: string }>;
}) {
  const [{ slug }, { key, toast }] = await Promise.all([props.params, props.searchParams]);

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

  if (settingsErr) return <div className="p-8">DB error: {settingsErr.message}</div>;

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

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const themePreset = (formData.get("theme_preset")?.toString() || "").trim() || "minimal";
    const primaryColor = (formData.get("primary_color")?.toString() || "").trim() || "#dca263";

    const rawPricingLayout = (formData.get("pricing_layout")?.toString() || "v1").trim().toLowerCase();
    const pricingLayout = rawPricingLayout === "v2" ? "v2" : "v1";

    const rawBrandMode = (formData.get("brand_mode")?.toString() || "text").trim().toLowerCase();
    const brandMode = rawBrandMode === "logo" ? "logo" : "text";

    const features = buildHeroFeaturesFromForm(formData);

    const payload: SiteSettingsRow = {
      client_id: clientId,

      theme_preset: themePreset,
      primary_color: primaryColor,
      pricing_layout: pricingLayout,

      brand_mode: brandMode,
      brand_text: (formData.get("brand_text")?.toString() || "").trim() || null,
      brand_subtext: (formData.get("brand_subtext")?.toString() || "").trim() || null,

      phone: (formData.get("phone")?.toString() || "").trim() || null,
      address: (formData.get("address")?.toString() || "").trim() || null,
      working_hours: (formData.get("working_hours")?.toString() || "").trim() || null,

      category_label: (formData.get("category_label")?.toString() || "").trim() || null,
      hero_title: (formData.get("hero_title")?.toString() || "").trim() || null,
      hero_subtitle: (formData.get("hero_subtitle")?.toString() || "").trim() || null,

      hero_features: features,

      about_text: (formData.get("about_text")?.toString() || "").trim() || null,

      google_maps_url: (formData.get("google_maps_url")?.toString() || "").trim() || null,
      instagram_url: (formData.get("instagram_url")?.toString() || "").trim() || null,
      facebook_url: (formData.get("facebook_url")?.toString() || "").trim() || null,
      tiktok_url: (formData.get("tiktok_url")?.toString() || "").trim() || null,
      youtube_url: (formData.get("youtube_url")?.toString() || "").trim() || null,

      services_eyebrow: (formData.get("services_eyebrow")?.toString() || "").trim() || null,
      services_title: (formData.get("services_title")?.toString() || "").trim() || null,
      services_subtitle: (formData.get("services_subtitle")?.toString() || "").trim() || null,

      about_eyebrow: (formData.get("about_eyebrow")?.toString() || "").trim() || null,
      about_title: (formData.get("about_title")?.toString() || "").trim() || null,
      about_cta_label: (formData.get("about_cta_label")?.toString() || "").trim() || null,

      brands_eyebrow: (formData.get("brands_eyebrow")?.toString() || "").trim() || null,
      brands_title: (formData.get("brands_title")?.toString() || "").trim() || null,
      brands_subtitle: (formData.get("brands_subtitle")?.toString() || "").trim() || null,

      pricing_eyebrow: (formData.get("pricing_eyebrow")?.toString() || "").trim() || null,
      pricing_title: (formData.get("pricing_title")?.toString() || "").trim() || null,
      pricing_subtitle: (formData.get("pricing_subtitle")?.toString() || "").trim() || null,
      pricing_badge: (formData.get("pricing_badge")?.toString() || "").trim() || null,

      gallery_eyebrow: (formData.get("gallery_eyebrow")?.toString() || "").trim() || null,
      gallery_title: (formData.get("gallery_title")?.toString() || "").trim() || null,
      gallery_subtitle: (formData.get("gallery_subtitle")?.toString() || "").trim() || null,
      gallery_work_title: (formData.get("gallery_work_title")?.toString() || "").trim() || null,
      gallery_venue_title: (formData.get("gallery_venue_title")?.toString() || "").trim() || null,

      reviews_eyebrow: (formData.get("reviews_eyebrow")?.toString() || "").trim() || null,
      reviews_title: (formData.get("reviews_title")?.toString() || "").trim() || null,
      reviews_subtitle: (formData.get("reviews_subtitle")?.toString() || "").trim() || null,

      contact_eyebrow: (formData.get("contact_eyebrow")?.toString() || "").trim() || null,
      contact_title: (formData.get("contact_title")?.toString() || "").trim() || null,
      contact_subtitle: (formData.get("contact_subtitle")?.toString() || "").trim() || null,

      updated_at: new Date().toISOString(),
    };

    const sb2 = supabaseServer();
    const { error } = await sb2.from("site_settings").upsert(payload, { onConflict: "client_id" });
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
      return redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=missing_file`);
    }

    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) throw new Error("File too large (max 5MB).");

    const sb2 = supabaseServer();

    // Upload
    const safeName = sanitizeFileName(file.name || "logo");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "png";
    const path = `${clientId}/logo-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: true, // safer for re-upload flows
    });

    // Most common cause: bucket missing or storage policy blocks anon uploads
    if (upErr) {
      revalidatePath(`/admin/${slug}/settings`);
      const msg = (upErr.message || "").toLowerCase();
      if (msg.includes("bucket") && msg.includes("not")) {
        return redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=bucket_missing`);
      }
      return redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=upload_failed`);
    }

    const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const { error } = await sb2
      .from("site_settings")
      .upsert({ client_id: clientId, logo_url: url, updated_at: new Date().toISOString() }, { onConflict: "client_id" });

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
      .upsert({ client_id: clientId, logo_url: null, updated_at: new Date().toISOString() }, { onConflict: "client_id" });

    if (error) throw new Error(error.message);

    const oldPath = storagePathFromPublicUrl(oldUrl, BUCKET);
    if (oldPath) {
      // remove best-effort
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
        <AdminTopNav slug={client.slug} businessName={`${client.business_name} — Settings`} keyParam={key} active="settings" />

        {toastText ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastText}
          </div>
        ) : null}

        {/* LOGO UPLOAD (separate forms) */}
        <Section
          title="Logo (upload)"
          subtitle="Upload logo image for header. Recommended: transparent PNG/SVG."
          defaultOpen
        >
          <div className="space-y-4">
            {s.logo_url ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                <div className="text-xs text-gray-500 break-all">{s.logo_url}</div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">No logo uploaded.</div>
            )}

            <form action={uploadLogo} className="space-y-2">
              <input type="hidden" name="key" value={key} />
              <input type="hidden" name="client_id" value={client.id} />
              <input
                type="file"
                name="logo_file"
                accept="image/*"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              />
              <div className="flex items-center gap-2">
                <button className="px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition" type="submit">
                  Upload logo
                </button>
                <div className="text-xs text-gray-500">Max 5MB. PNG/SVG/JPG.</div>
              </div>

              <div className="text-xs text-gray-500">
                If upload fails, it is almost always: missing bucket "{BUCKET}" or Storage policy blocks uploads (see SQL below).
              </div>
            </form>

            {s.logo_url ? (
              <form action={removeLogo}>
                <input type="hidden" name="key" value={key} />
                <input type="hidden" name="client_id" value={client.id} />
                <input type="hidden" name="old_logo_url" value={s.logo_url} />
                <button
                  className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                  type="submit"
                >
                  Remove logo
                </button>
              </form>
            ) : null}
          </div>
        </Section>

        {/* MAIN SETTINGS FORM */}
        <form action={save} className="space-y-4">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="client_id" value={client.id} />

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

            <Field name="primary_color" label="Primary color (#hex)" defaultValue={s.primary_color || "#dca263"} />

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

          <Section title="Header branding (Minimal)" subtitle="Text + circle OR logo only" defaultOpen>
            <FieldSelect
              name="brand_mode"
              label="Branding mode"
              defaultValue={(s.brand_mode || "text").toString()}
              options={[
                { value: "text", label: "Text + circle (recommended)" },
                { value: "logo", label: "Logo only" },
              ]}
            />
            <Field name="brand_text" label="Brand text (optional override)" defaultValue={s.brand_text || ""} />
            <Field name="brand_subtext" label="Brand subtext (optional; leave empty to hide)" defaultValue={s.brand_subtext || ""} />

            <div className="text-xs text-gray-500">
              “Logo only” показва само логото (ако има). При “Text” (или ако няма лого) ще има кръг с първа буква + текст.
            </div>
          </Section>

          <Section title="Основни" subtitle="Контакти и работно време" defaultOpen>
            <Field name="phone" label="Телефон" defaultValue={s.phone || ""} />
            <Field name="address" label="Адрес" defaultValue={s.address || ""} />
            <Field name="working_hours" label="Работно време" defaultValue={s.working_hours || ""} />
          </Section>

          <Section title="Hero (Minimal)" subtitle="Заглавия + feature cards (max 3)" defaultOpen>
            <Field name="category_label" label="Category label (над заглавието)" defaultValue={s.category_label || ""} />
            <Field name="hero_title" label="Hero title (H1)" defaultValue={s.hero_title || ""} />
            <TextArea name="hero_subtitle" label="Hero subtitle" defaultValue={s.hero_subtitle || ""} rows={4} />

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Hero feature cards (max 3)</div>
                  <div className="text-xs text-gray-500">Без JSON. Икона + заглавие + текст.</div>
                </div>
                <div className="text-xs text-gray-500">Minimal template</div>
              </div>

              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-sm font-semibold text-gray-900">Feature card #{i + 1}</div>
                    <div className="text-xs text-gray-500">Shown in hero</div>
                  </div>

                  <div className="grid md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <FieldSelect
                        name={`hf_${i}_icon`}
                        label="Icon"
                        defaultValue={features[i]?.icon || "✨"}
                        options={[
                          { value: "✨", label: "✨ Sparkle" },
                          { value: "🧼", label: "🧼 Clean" },
                          { value: "📅", label: "📅 Booking" },
                          { value: "💎", label: "💎 Premium" },
                          { value: "🕒", label: "🕒 Time" },
                          { value: "📍", label: "📍 Location" },
                          { value: "⭐", label: "⭐ Rating" },
                        ]}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Field name={`hf_${i}_title`} label="Title" defaultValue={features[i]?.title || ""} />
                    </div>

                    <div className="md:col-span-2">
                      <Field name={`hf_${i}_text`} label="Text" defaultValue={features[i]?.text || ""} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-start gap-3">
                    <div className="text-lg leading-none">{features[i]?.icon || "✨"}</div>
                    <div className="min-w-0">
                      <div className="font-semibold">{features[i]?.title || "—"}</div>
                      <div className="text-xs text-gray-500">{features[i]?.text || "—"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Services section (Minimal)" subtitle="Заглавия за секцията Услуги">
            <Field name="services_eyebrow" label="Eyebrow" defaultValue={s.services_eyebrow || ""} />
            <Field name="services_title" label="Title" defaultValue={s.services_title || ""} />
            <TextArea name="services_subtitle" label="Subtitle" defaultValue={s.services_subtitle || ""} rows={3} />
          </Section>

          <Section title="About section (Minimal)" subtitle="За нас">
            <Field name="about_eyebrow" label="Eyebrow" defaultValue={s.about_eyebrow || ""} />
            <Field name="about_title" label="Title" defaultValue={s.about_title || ""} />
            <Field name="about_cta_label" label="CTA button label" defaultValue={s.about_cta_label || ""} />
            <TextArea name="about_text" label="About text (дълъг текст)" defaultValue={s.about_text || ""} rows={7} />
          </Section>

          <Section title="Brands section (Minimal)" subtitle='Логата се качват в Gallery → section "brands"'>
            <Field name="brands_eyebrow" label="Eyebrow" defaultValue={s.brands_eyebrow || ""} />
            <Field name="brands_title" label="Title" defaultValue={s.brands_title || ""} />
            <TextArea name="brands_subtitle" label="Subtitle" defaultValue={s.brands_subtitle || ""} rows={3} />
          </Section>

          <Section title="Pricing section (Minimal)" subtitle="Ценоразпис">
            <Field name="pricing_eyebrow" label="Eyebrow" defaultValue={s.pricing_eyebrow || ""} />
            <Field name="pricing_title" label="Title" defaultValue={s.pricing_title || ""} />
            <TextArea name="pricing_subtitle" label="Subtitle" defaultValue={s.pricing_subtitle || ""} rows={3} />
            <Field name="pricing_badge" label="Badge text (shown in pricing v2)" defaultValue={s.pricing_badge || ""} />
          </Section>

          <Section title="Gallery section (Minimal)" subtitle="Секции и заглавия за галерията">
            <Field name="gallery_eyebrow" label="Eyebrow" defaultValue={s.gallery_eyebrow || ""} />
            <Field name="gallery_title" label="Title" defaultValue={s.gallery_title || ""} />
            <TextArea name="gallery_subtitle" label="Subtitle" defaultValue={s.gallery_subtitle || ""} rows={3} />
            <Field name="gallery_work_title" label="Work title" defaultValue={s.gallery_work_title || ""} />
            <Field name="gallery_venue_title" label="Venue title" defaultValue={s.gallery_venue_title || ""} />
          </Section>

          <Section title="Reviews section (Minimal)" subtitle="Отзиви">
            <Field name="reviews_eyebrow" label="Eyebrow" defaultValue={s.reviews_eyebrow || ""} />
            <Field name="reviews_title" label="Title" defaultValue={s.reviews_title || ""} />
            <TextArea name="reviews_subtitle" label="Subtitle" defaultValue={s.reviews_subtitle || ""} rows={3} />
          </Section>

          <Section title="Contact section (Minimal)" subtitle="Контакти">
            <Field name="contact_eyebrow" label="Eyebrow" defaultValue={s.contact_eyebrow || ""} />
            <Field name="contact_title" label="Title" defaultValue={s.contact_title || ""} />
            <TextArea name="contact_subtitle" label="Subtitle" defaultValue={s.contact_subtitle || ""} rows={3} />
          </Section>

          <Section title="Social + Maps" subtitle="Външни линкове">
            <Field name="google_maps_url" label="Google Maps URL" defaultValue={s.google_maps_url || ""} />
            <Field name="instagram_url" label="Instagram URL" defaultValue={s.instagram_url || ""} />
            <Field name="facebook_url" label="Facebook URL" defaultValue={s.facebook_url || ""} />
            <Field name="tiktok_url" label="TikTok URL" defaultValue={s.tiktok_url || ""} />
            <Field name="youtube_url" label="YouTube URL" defaultValue={s.youtube_url || ""} />
          </Section>

          {/* Sticky Save Bar (no scrolling to bottom) */}
          <div className="sticky bottom-3 z-20">
            <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                Public:{" "}
                <Link className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                  {publicUrl}
                </Link>
              </div>
              <button type="submit" className="px-5 py-2.5 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
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
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
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

          <div className="text-xs text-gray-500 group-open:hidden">Expand</div>
          <div className="text-xs text-gray-500 hidden group-open:block">Collapse</div>
        </div>
      </summary>

      {/* KEY FIX: padding-top + first child spacing */}
      <div className="p-6 pt-5 bg-white">
        <div className="space-y-4 [&>*:first-child]:mt-1">{children}</div>
      </div>
    </details>
  );
}


function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
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

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.\-_]/g, "");
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
    }));

  while (cleaned.length < 3) cleaned.push({ icon: "✨", title: "", text: "" });
  return cleaned.slice(0, 3);
}

function buildHeroFeaturesFromForm(formData: FormData) {
  const out: Array<{ icon?: string; title: string; text: string }> = [];
  for (let i = 0; i < 3; i++) {
    const icon = (formData.get(`hf_${i}_icon`)?.toString() || "").trim() || "✨";
    const title = (formData.get(`hf_${i}_title`)?.toString() || "").trim();
    const text = (formData.get(`hf_${i}_text`)?.toString() || "").trim();
    if (title && text) out.push({ icon, title, text });
  }
  return out;
}
