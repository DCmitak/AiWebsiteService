import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";

export default async function AdminHome(props: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await props.searchParams;

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();
  const { data: clients, error } = await sb
    .from("clients")
    .select("slug, business_name, city, is_active")
    .order("created_at", { ascending: false });

  if (error) return <div className="p-8">DB error: {error.message}</div>;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-sm text-gray-600">Отвори конкретен клиент за редакция.</p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Clients ({clients?.length || 0})</div>

          {!clients?.length ? (
            <div className="text-sm text-gray-600">Няма клиенти.</div>
          ) : (
            <div className="divide-y">
              {clients.map((c: any) => (
                <div key={c.slug} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.business_name}</div>
                    <div className="text-sm text-gray-600">
                      {c.slug} • {c.city || "—"} {c.is_active === false ? "• inactive" : ""}
                    </div>
                  </div>

                  <Link
                    className="shrink-0 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                    href={`/admin/${c.slug}?key=${encodeURIComponent(key)}`}
                  >
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-sm text-gray-500">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}
