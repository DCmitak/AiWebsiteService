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

  const { data: services } = await sb
    .from("services")
    .select("*")
    .eq("client_id", client.id)
    .order("sort_order");

  return (
    <main className="min-h-screen p-8">
      <section className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold">{client.business_name}</h1>
        <p className="opacity-70">{client.city}</p>

        <h2 className="text-2xl font-semibold mt-8">Услуги</h2>
        <ul className="space-y-2">
          {services?.map((s: any) => (
            <li key={s.id} className="flex justify-between border-b py-2">
              <span>{s.name}</span>
              <span className="opacity-70">{s.price_from ? `от ${s.price_from} лв` : ""}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
