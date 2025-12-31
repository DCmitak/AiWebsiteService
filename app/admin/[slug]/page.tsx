import { supabaseServer } from "@/lib/supabase-server";

export default async function AdminHome(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ slug }, { key }] = await Promise.all([props.params, props.searchParams]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  const { data: client, error } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) return <div className="p-8">DB error: {error.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  const adminBase = `/admin/${client.slug}`;
  const settingsUrl = `${adminBase}/settings?key=${encodeURIComponent(key)}`;
  const servicesUrl = `${adminBase}/services?key=${encodeURIComponent(key)}`;
  const galleryUrl = `${adminBase}/gallery?key=${encodeURIComponent(key)}`;
  const publicUrl = `/${client.slug}`;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{client.business_name}</h1>
          <p className="opacity-70">Admin dashboard • slug: {client.slug}</p>
        </div>

        <div className="grid gap-3">
          <a
            className="px-5 py-4 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            href={settingsUrl}
          >
            ⚙️ Settings
            <div className="text-sm opacity-80 font-normal">
              текстове, линкове, hero, цветове
            </div>
          </a>

          <a
            className="px-5 py-4 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            href={servicesUrl}
          >
            💅 Services
            <div className="text-sm opacity-80 font-normal">
              услуги, цени, време
            </div>
          </a>

          <a
            className="px-5 py-4 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            href={galleryUrl}
          >
            🖼️ Gallery
            <div className="text-sm opacity-80 font-normal">
              снимки, подредба, showcase
            </div>
          </a>

          <a
            className="px-5 py-4 rounded-lg bg-white border border-gray-300 text-black font-semibold hover:bg-gray-100 transition"
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
          >
            👁️ View public page →
          </a>
        </div>

        <p className="text-sm opacity-60">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}
