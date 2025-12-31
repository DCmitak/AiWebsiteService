import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function AdminSettings(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ slug }, { key }] = await Promise.all([props.params, props.searchParams]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  const { data: client } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!client) return <div className="p-8">Client not found</div>;

  const { data: settings } = await sb
    .from("site_settings")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle();

  async function save(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    // theme_preset is NOT NULL in your DB -> always send a value
    const themePreset = (formData.get("theme_preset")?.toString() || "").trim() || "luxe";

    const brandsRaw = formData.get("brands")?.toString() || "[]";
    let brands: any = [];
    try {
      brands = JSON.parse(brandsRaw);
      if (!Array.isArray(brands)) brands = [];
    } catch {
      brands = [];
    }

    const payload: any = {
      client_id: clientId,

      theme_preset: themePreset, // IMPORTANT: never null
      primary_color: (formData.get("primary_color")?.toString() || "").trim() || "#dca263",

      phone: (formData.get("phone")?.toString() || "").trim() || null,
      booking_url: (formData.get("booking_url")?.toString() || "").trim() || null,

      address: (formData.get("address")?.toString() || "").trim() || null,
      working_hours: (formData.get("working_hours")?.toString() || "").trim() || null,

      logo_url: (formData.get("logo_url")?.toString() || "").trim() || null,
      hero_image_url: (formData.get("hero_image_url")?.toString() || "").trim() || null,

      tagline: (formData.get("tagline")?.toString() || "").trim() || null,
      about_text: (formData.get("about_text")?.toString() || "").trim() || null,

      google_maps_url: (formData.get("google_maps_url")?.toString() || "").trim() || null,

      instagram_url: (formData.get("instagram_url")?.toString() || "").trim() || null,
      facebook_url: (formData.get("facebook_url")?.toString() || "").trim() || null,
      tiktok_url: (formData.get("tiktok_url")?.toString() || "").trim() || null,
      youtube_url: (formData.get("youtube_url")?.toString() || "").trim() || null,

      brands,
      updated_at: new Date().toISOString(),
    };

    const sb = supabaseServer();
    const { error } = await sb.from("site_settings").upsert(payload, { onConflict: "client_id" });
    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/settings`);
  }

  const publicUrl = `/${slug}`;
  const servicesUrl = `/admin/${slug}/services?key=${encodeURIComponent(key)}`;
  const galleryUrl = `/admin/${slug}/gallery?key=${encodeURIComponent(key)}`;

  return (
    <main className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Settings: {client.business_name}</h1>
            <div className="text-sm text-gray-500">slug: {client.slug}</div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href={`${publicUrl}`}
              className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            >
              View public →
            </Link>
            <Link
              href={servicesUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Services →
            </Link>
            <Link
              href={galleryUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Gallery →
            </Link>
          </div>
        </div>

        <form action={save} className="space-y-6">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="client_id" value={client.id} />

          <Card title="Theme">
            <Field
              name="theme_preset"
              label='Theme preset (NOT NULL) — пример: "luxe"'
              defaultValue={settings?.theme_preset || "luxe"}
            />
          </Card>

          <Card title="Основни">
            <Field name="primary_color" label="Primary color (#hex)" defaultValue={settings?.primary_color || "#dca263"} />
            <Field name="phone" label="Телефон" defaultValue={settings?.phone || ""} />
            <Field name="booking_url" label="Booking URL (временно)" defaultValue={settings?.booking_url || ""} />
            <Field name="address" label="Адрес" defaultValue={settings?.address || ""} />
            <Field name="working_hours" label="Работно време" defaultValue={settings?.working_hours || ""} />
          </Card>

          <Card title="Branding">
            <Field name="logo_url" label="Logo URL" defaultValue={settings?.logo_url || ""} />
            <Field name="hero_image_url" label="Hero Image URL" defaultValue={settings?.hero_image_url || ""} />
            <Field name="tagline" label="Tagline (кратко под заглавието)" defaultValue={settings?.tagline || ""} />
            <TextArea name="about_text" label="About text (дълъг текст)" defaultValue={settings?.about_text || ""} />
          </Card>

          <Card title="Social">
            <Field name="instagram_url" label="Instagram URL" defaultValue={settings?.instagram_url || ""} />
            <Field name="facebook_url" label="Facebook URL" defaultValue={settings?.facebook_url || ""} />
            <Field name="tiktok_url" label="TikTok URL" defaultValue={settings?.tiktok_url || ""} />
            <Field name="youtube_url" label="YouTube URL" defaultValue={settings?.youtube_url || ""} />
          </Card>

          <Card title="Maps + Brands">
            <Field name="google_maps_url" label="Google Maps embed URL" defaultValue={settings?.google_maps_url || ""} />
            <TextArea
              name="brands"
              label='Brands JSON (пример: ["OPI","CND","KODI"])'
              defaultValue={JSON.stringify(settings?.brands || [], null, 2)}
            />
          </Card>

          <div className="flex items-center gap-3">
            <button className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
              Save
            </button>
            <div className="text-sm text-gray-500">
              След Save: refresh на <code className="px-2 py-1 bg-gray-100 rounded">{publicUrl}</code>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

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

function TextArea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={6}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}
