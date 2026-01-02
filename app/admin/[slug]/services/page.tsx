// app/admin/[slug]/services/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import { redirect } from "next/navigation";

type ServiceRow = {
  id: string;
  client_id: string;
  category: string | null;
  name: string;
  description: string | null;
  duration_min: number | null;
  price_from: number | null;
  sort_order: number | null;
};

export default async function AdminServices(props: {
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
    .maybeSingle();

  if (clientErr) return <div className="p-8">DB error: {clientErr.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  const { data: services, error: servicesErr } = await sb
    .from("services")
    .select("id, client_id, category, name, description, duration_min, price_from, sort_order")
    .eq("client_id", client.id)
    .order("sort_order", { ascending: true });

  if (servicesErr) return <div className="p-8">DB error: {servicesErr.message}</div>;

  const toastText =
    toast === "added"
      ? "Service added."
      : toast === "saved"
      ? "Changes saved."
      : toast === "deleted"
      ? "Service deleted."
      : null;

  async function addService(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const payload = {
      client_id: clientId,
      category: (formData.get("category")?.toString() || "").trim() || null,
      name: (formData.get("name")?.toString() || "").trim(),
      description: (formData.get("description")?.toString() || "").trim() || null,
      duration_min: parseInt(formData.get("duration_min")?.toString() || "", 10) || null,
      price_from: parseFloat(formData.get("price_from")?.toString() || "") || null,
      sort_order: parseInt(formData.get("sort_order")?.toString() || "", 10) || 1,
    };

    if (!payload.name) throw new Error("Name is required");

    const sb2 = supabaseServer();
    const { error } = await sb2.from("services").insert(payload);
    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/services`);

    redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=added`);
  }

  async function updateService(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const payload = {
      category: (formData.get("category")?.toString() || "").trim() || null,
      name: (formData.get("name")?.toString() || "").trim(),
      description: (formData.get("description")?.toString() || "").trim() || null,
      duration_min: parseInt(formData.get("duration_min")?.toString() || "", 10) || null,
      price_from: parseFloat(formData.get("price_from")?.toString() || "") || null,
      sort_order: parseInt(formData.get("sort_order")?.toString() || "", 10) || 1,
    };

    if (!payload.name) throw new Error("Name is required");

    const sb2 = supabaseServer();
    const { error } = await sb2
      .from("services")
      .update(payload)
      .eq("id", id)
      .eq("client_id", clientId); // ✅ safety + no TS nullable issue

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/services`);

    redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=saved`);
  }

  async function deleteService(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const sb2 = supabaseServer();
    const { error } = await sb2
      .from("services")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId); // ✅ safety + no TS nullable issue

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/services`);

    redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=deleted`);
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav
          slug={client.slug}
          businessName={`${client.business_name} — Services`}
          keyParam={key}
          active="services"
        />

        {toastText ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastText}
          </div>
        ) : null}

        {/* ADD NEW */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Add service</div>

          <form action={addService} className="grid md:grid-cols-6 gap-3">
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="client_id" value={client.id} />

            <Field name="category" label="Category" placeholder="Гел лак" className="md:col-span-1" />
            <Field name="name" label="Name" placeholder="Маникюр с гел лак" className="md:col-span-2" />
            <Field name="price_from" label="Price" placeholder="50" className="md:col-span-1" />
            <Field name="duration_min" label="Minutes" placeholder="60" className="md:col-span-1" />
            <Field name="sort_order" label="Sort" placeholder="1" className="md:col-span-1" />

            <div className="md:col-span-6">
              <label className="block space-y-1">
                <div className="text-sm text-gray-600">Description</div>
                <textarea
                  name="description"
                  placeholder="кратко описание (по желание)"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </label>
            </div>

            <div className="md:col-span-6">
              <button
                type="submit"
                className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
              >
                Add
              </button>
            </div>
          </form>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Current services</div>

          {!services?.length ? (
            <div className="text-sm text-gray-600">No services yet.</div>
          ) : (
            <div className="space-y-4">
              {(services as ServiceRow[]).map((s) => (
                <div key={s.id} className="rounded-xl border border-gray-200 p-4">
                  <form className="grid md:grid-cols-6 gap-3">
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="client_id" value={client.id} />

                    <Input name="category" label="Category" defaultValue={s.category || ""} className="md:col-span-1" />
                    <Input name="name" label="Name" defaultValue={s.name} className="md:col-span-2" />
                    <Input
                      name="price_from"
                      label="Price"
                      defaultValue={s.price_from ?? ""}
                      className="md:col-span-1"
                    />
                    <Input
                      name="duration_min"
                      label="Minutes"
                      defaultValue={s.duration_min ?? ""}
                      className="md:col-span-1"
                    />
                    <Input
                      name="sort_order"
                      label="Sort"
                      defaultValue={s.sort_order ?? ""}
                      className="md:col-span-1"
                    />

                    <div className="md:col-span-6">
                      <label className="block space-y-1">
                        <div className="text-sm text-gray-600">Description</div>
                        <textarea
                          name="description"
                          defaultValue={s.description || ""}
                          rows={2}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </label>
                    </div>

                    <div className="md:col-span-6 flex items-center gap-3">
                      <button
                        type="submit"
                        formAction={updateService}
                        className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                      >
                        Save
                      </button>

                      <button
                        type="submit"
                        formAction={deleteService}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                      >
                        Delete
                      </button>

                      <div className="text-sm text-gray-500 ml-auto">
                        ID: <code className="px-2 py-1 bg-gray-100 rounded">{s.id.slice(0, 8)}…</code>
                      </div>
                    </div>
                  </form>
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

/* ---------------- UI helpers ---------------- */

function Field({
  name,
  label,
  placeholder,
  className,
}: {
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className || ""}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function Input({
  name,
  label,
  defaultValue,
  className,
}: {
  name: string;
  label: string;
  defaultValue: any;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className || ""}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <input
        name={name}
        defaultValue={String(defaultValue ?? "")}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}
