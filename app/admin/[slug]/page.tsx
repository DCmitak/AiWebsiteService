// app/admin/[slug]/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";

export default async function AdminClientDashboard(props: {
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

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Unified header */}
        <AdminTopNav
          slug={client.slug}
          businessName={`${client.business_name} — Dashboard`}
          keyParam={key}
          active="dashboard"
        />

        {/* Tiles */}
        <section className="grid gap-3 md:grid-cols-2">
          <a
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50 transition"
            href={`/admin/${client.slug}/settings?key=${encodeURIComponent(key)}`}
          >
            <div className="font-semibold text-lg">Settings</div>
            <div className="text-sm text-gray-600 mt-1">
              текстове, hero, линкове, цветове, социални
            </div>
          </a>

          <a
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50 transition"
            href={`/admin/${client.slug}/services?key=${encodeURIComponent(key)}`}
          >
            <div className="font-semibold text-lg">Services</div>
            <div className="text-sm text-gray-600 mt-1">услуги, цени, време, подредба</div>
          </a>

          <a
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50 transition"
            href={`/admin/${client.slug}/gallery?key=${encodeURIComponent(key)}`}
          >
            <div className="font-semibold text-lg">Gallery</div>
            <div className="text-sm text-gray-600 mt-1">снимки, подредба, showcase</div>
          </a>

          <a
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:bg-gray-50 transition"
            href={`/admin/${client.slug}/reviews?key=${encodeURIComponent(key)}`}
          >
            <div className="font-semibold text-lg">Reviews</div>
            <div className="text-sm text-gray-600 mt-1">клиентски отзиви</div>
          </a>
        </section>

        {/* Public */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-semibold">Public page</div>
              <div className="text-sm text-gray-600">Отвори сайта в нов таб.</div>
            </div>

            <a
              className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
              href={`/${client.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              View public →
            </a>
          </div>
        </section>

        <p className="text-sm text-gray-500">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}
