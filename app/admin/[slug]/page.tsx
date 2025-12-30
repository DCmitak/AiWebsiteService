import { supabaseServer } from "@/lib/supabase-server";

export default async function AdminEdit(props: {
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
    if (!key || key !== process.env.ADMIN_KEY) {
      throw new Error("Unauthorized");
    }

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const payload = {
      client_id: clientId,
      phone: formData.get("phone")?.toString() || null,
      instagram_url: formData.get("instagram_url")?.toString() || null,
      booking_url: formData.get("booking_url")?.toString() || null,
      address: formData.get("address")?.toString() || null,
      working_hours: formData.get("working_hours")?.toString() || null,
      primary_color: formData.get("primary_color")?.toString() || "#dca263",
      updated_at: new Date().toISOString(),
    };

    const sb = supabaseServer();
    const { error } = await sb.from("site_settings").upsert(payload);
    if (error) throw new Error(error.message);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Edit: {client.business_name}</h1>
        <p className="opacity-70">slug: {client.slug}</p>

        <form action={save} className="space-y-3">
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="client_id" value={client.id} />

          <Field name="phone" label="Телефон" defaultValue={settings?.phone || ""} />
          <Field name="instagram_url" label="Instagram URL" defaultValue={settings?.instagram_url || ""} />
          <Field name="booking_url" label="Booking URL" defaultValue={settings?.booking_url || ""} />
          <Field name="address" label="Адрес" defaultValue={settings?.address || ""} />
          <Field name="working_hours" label="Работно време" defaultValue={settings?.working_hours || ""} />
          <Field name="primary_color" label="Primary color (#hex)" defaultValue={settings?.primary_color || "#dca263"} />

          <button className="px-5 py-3 rounded bg-white text-black font-semibold">
            Save
          </button>
        </form>

        <p className="text-sm opacity-60">
          След Save, refresh на публичната страница: <code>/{slug}</code>
        </p>
      </div>
    </main>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block space-y-1">
      <div className="text-sm opacity-70">{label}</div>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full px-4 py-3 rounded bg-black border border-white/15"
      />
    </label>
  );
}
