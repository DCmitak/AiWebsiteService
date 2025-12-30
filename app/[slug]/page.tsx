import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function PublicClientPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const { data: client, error } = await sb
    .from("clients")
    .select("id, business_name, city, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return <div className="p-8">DB error: {error.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;
  if (!client.is_active) return <div className="p-8">Not available</div>;

  const [{ data: settings }, { data: services }] = await Promise.all([
    sb.from("site_settings").select("*").eq("client_id", client.id).maybeSingle(),
    sb.from("services").select("*").eq("client_id", client.id).order("sort_order"),
  ]);

  const phone = settings?.phone || "";
  const booking = settings?.booking_url || "#";
  const instagram = settings?.instagram_url || "";
  const address = settings?.address || "";
  const hours = settings?.working_hours || "";
  const primary = settings?.primary_color || "#dca263";

  return (
    <main className="min-h-screen p-8" style={{ borderTop: `10px solid ${primary}` }}>
      <section className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">{client.business_name}</h1>
          <p className="opacity-70">{client.city}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <a className="px-4 py-2 rounded bg-white text-black font-medium" href={booking}>
              Запази час
            </a>
            {phone && (
              <a className="px-4 py-2 rounded border border-white/30" href={`tel:${phone}`}>
                {phone}
              </a>
            )}
            {instagram && (
              <a className="px-4 py-2 rounded border border-white/30" href={instagram}>
                Instagram
              </a>
            )}
          </div>
        </header>

        <hr className="border-white/10" />

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Услуги</h2>
          <ul className="space-y-2">
            {services?.map((s: any) => (
              <li key={s.id} className="flex justify-between border-b border-white/10 py-2">
                <span>{s.name}</span>
                <span className="opacity-70">
                  {s.price_from ? `от ${s.price_from} лв` : ""} {s.duration_min ? `• ${s.duration_min} мин` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {(address || hours) && (
          <>
            <hr className="border-white/10" />
            <section className="space-y-2 opacity-80">
              {address && <div>📍 {address}</div>}
              {hours && <div>🕒 {hours}</div>}
            </section>
          </>
        )}

        <footer className="pt-6 opacity-60 text-sm">
          © {new Date().getFullYear()} {client.business_name}
        </footer>
      </section>
    </main>
  );
}
