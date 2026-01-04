//app\admin\[slug]\settings\page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";

type SiteSettingsRow = {
  client_id: string;
  theme_preset?: string | null;
  primary_color?: string | null;

  phone?: string | null;
  booking_url?: string | null;
  address?: string | null;
  working_hours?: string | null;

  logo_url?: string | null;
  hero_image_url?: string | null;

  category_label?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;

  about_text?: string | null;

  google_maps_url?: string | null;

  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;

  brands?: unknown;

  // NEW:
  pricing_layout?: "v1" | "v2" | string | null;

  updated_at?: string | null;
};

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

  async function save(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const themePreset = (formData.get("theme_preset")?.toString() || "").trim() || "luxe";

    // NEW: services/pricing layout
    const rawPricingLayout = (formData.get("pricing_layout")?.toString() || "v1").trim().toLowerCase();
    const pricingLayout = rawPricingLayout === "v2" ? "v2" : "v1";

    const brandsRaw = formData.get("brands")?.toString() || "[]";
    let brands: any[] = [];
    try {
      const parsed = JSON.parse(brandsRaw);
      brands = Array.isArray(parsed) ? parsed : [];
    } catch {
      brands = [];
    }

    const payload: any = {
      client_id: clientId,

      // Hero copy
      category_label: (formData.get("category_label")?.toString() || "").trim() || null,
      hero_title: (formData.get("hero_title")?.toString() || "").trim() || null,
      hero_subtitle: (formData.get("hero_subtitle")?.toString() || "").trim() || null,

      // Theme
      theme_preset: themePreset,
      primary_color: (formData.get("primary_color")?.toString() || "").trim() || "#dca263",

      // Basics
      phone: (formData.get("phone")?.toString() || "").trim() || null,
      booking_url: (formData.get("booking_url")?.toString() || "").trim() || null,
      address: (formData.get("address")?.toString() || "").trim() || null,
      working_hours: (formData.get("working_hours")?.toString() || "").trim() || null,

      // Images
      logo_url: (formData.get("logo_url")?.toString() || "").trim() || null,
      hero_image_url: (formData.get("hero_image_url")?.toString() || "").trim() || null,

      // Long text
      about_text: (formData.get("about_text")?.toString() || "").trim() || null,

      // Maps + Social
      google_maps_url: (formData.get("google_maps_url")?.toString() || "").trim() || null,
      instagram_url: (formData.get("instagram_url")?.toString() || "").trim() || null,
      facebook_url: (formData.get("facebook_url")?.toString() || "").trim() || null,
      tiktok_url: (formData.get("tiktok_url")?.toString() || "").trim() || null,
      youtube_url: (formData.get("youtube_url")?.toString() || "").trim() || null,

      // JSON
      brands,

      // NEW
      pricing_layout: pricingLayout,

      updated_at: new Date().toISOString(),
    };

    const sb2 = supabaseServer();
    const { error } = await sb2.from("site_settings").upsert(payload, { onConflict: "client_id" });
    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/settings`);

    redirect(`/admin/${slug}/settings?key=${encodeURIComponent(key)}&toast=saved`);
  }

  const toastText =
    toast === "saved"
      ? "Saved successfully."
      : toast === "error"
      ? "Something went wrong."
      : null;

  const publicUrl = `/${slug}`;

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

        <form action={save} className="space-y-6">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="client_id" value={client.id} />

          <Card title="Theme">
            <label className="block space-y-1">
              <div className="text-sm text-gray-600">Theme preset</div>
              <select
                name="theme_preset"
                defaultValue={settings?.theme_preset || "luxe"}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="luxe">Luxe (женствен/лукс)</option>
                <option value="minimal">Minimal (чист/универсален)</option>
              </select>
            </label>

            {/* NEW */}
            <label className="block space-y-1">
              <div className="text-sm text-gray-600">Services / Pricing layout</div>
              <select
                name="pricing_layout"
                defaultValue={settings?.pricing_layout || "v1"}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="v1">V1 – Tabs (simple)</option>
                <option value="v2">V2 – Fancy (categories left on desktop)</option>
              </select>
              <div className="text-xs text-gray-500">
                Това управлява кой ServicesTabs компонент да се използва (v1/v2).
              </div>
            </label>
          </Card>

          <Card title="Основни">
            <Field
              name="primary_color"
              label="Primary color (#hex)"
              defaultValue={settings?.primary_color || "#dca263"}
            />
            <Field name="phone" label="Телефон" defaultValue={settings?.phone || ""} />
            <Field name="booking_url" label="Booking URL (временно)" defaultValue={settings?.booking_url || ""} />
            <Field name="address" label="Адрес" defaultValue={settings?.address || ""} />
            <Field name="working_hours" label="Работно време" defaultValue={settings?.working_hours || ""} />
          </Card>

          <Card title="Branding">
            <Field name="logo_url" label="Logo URL" defaultValue={settings?.logo_url || ""} />
            <Field
              name="hero_image_url"
              label="Hero Image URL (priority)"
              defaultValue={settings?.hero_image_url || ""}
            />

            <Field
              name="category_label"
              label="Category label (над заглавието)"
              defaultValue={settings?.category_label || ""}
            />
            <Field name="hero_title" label="Hero title (H1)" defaultValue={settings?.hero_title || ""} />

            <TextArea
              name="hero_subtitle"
              label="Hero subtitle (под заглавието)"
              defaultValue={settings?.hero_subtitle || ""}
              rows={4}
            />

            <TextArea
              name="about_text"
              label="About text (дълъг текст)"
              defaultValue={settings?.about_text || ""}
              rows={6}
            />
          </Card>

          <Card title="Social">
            <Field name="instagram_url" label="Instagram URL" defaultValue={settings?.instagram_url || ""} />
            <Field name="facebook_url" label="Facebook URL" defaultValue={settings?.facebook_url || ""} />
            <Field name="tiktok_url" label="TikTok URL" defaultValue={settings?.tiktok_url || ""} />
            <Field name="youtube_url" label="YouTube URL" defaultValue={settings?.youtube_url || ""} />
          </Card>

          <Card title="Maps + Brands">
            <Field name="google_maps_url" label="Google Maps URL" defaultValue={settings?.google_maps_url || ""} />
            <TextArea
              name="brands"
              label='Brands JSON (пример: ["OPI","CND","KODI"])'
              defaultValue={JSON.stringify(settings?.brands || [], null, 2)}
              rows={6}
            />
          </Card>

          <div className="flex items-center gap-3">
            <button className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
              Save
            </button>

            <div className="text-sm text-gray-500">
              Public:{" "}
              <Link className="underline" href={publicUrl} target="_blank" rel="noreferrer">
                {publicUrl}
              </Link>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="font-semibold">{title}</div>
      {children}
    </section>
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
