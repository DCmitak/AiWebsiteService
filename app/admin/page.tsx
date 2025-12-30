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
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="opacity-70">
          Отвори конкретен клиент за редакция.
        </p>

        <ul className="space-y-2">
          {clients?.map((c: any) => (
            <li key={c.slug} className="flex items-center justify-between border-b border-white/10 py-2">
              <div>
                <div className="font-medium">{c.business_name}</div>
                <div className="text-sm opacity-60">{c.slug} • {c.city}</div>
              </div>
              <Link
                className="px-3 py-2 rounded border border-white/15"
                href={`/admin/${c.slug}?key=${encodeURIComponent(key)}`}
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
