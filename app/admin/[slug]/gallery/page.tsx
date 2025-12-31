import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { revalidatePath } from "next/cache";

type GalleryRow = {
  id: string;
  client_id: string;
  image_url: string;
  sort_order: number | null;
};

export default async function AdminGallery(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ slug }, { key }] = await Promise.all([props.params, props.searchParams]);

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

  const { data: gallery, error: galleryErr } = await sb
    .from("gallery_images")
    .select("id, client_id, image_url, sort_order")
    .eq("client_id", client.id)
    .order("sort_order", { ascending: true });

  if (galleryErr) return <div className="p-8">DB error: {galleryErr.message}</div>;

  async function addImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const image_url = (formData.get("image_url")?.toString() || "").trim();
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    if (!image_url) throw new Error("image_url is required");

    const sb = supabaseServer();
    const { error } = await sb.from("gallery_images").insert({
      client_id: clientId,
      image_url,
      sort_order,
    });
    if (error) throw new Error(error.message);

    revalidatePath(`/admin/${slug}/gallery`);
    revalidatePath(`/${slug}`);
  }

  async function updateImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const image_url = (formData.get("image_url")?.toString() || "").trim();
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    if (!image_url) throw new Error("image_url is required");

    const sb = supabaseServer();
    const { error } = await sb
      .from("gallery_images")
      .update({ image_url, sort_order })
      .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath(`/admin/${slug}/gallery`);
    revalidatePath(`/${slug}`);
  }

  async function deleteImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const sb = supabaseServer();
    const { error } = await sb.from("gallery_images").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath(`/admin/${slug}/gallery`);
    revalidatePath(`/${slug}`);
  }

  async function moveUp(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id || !clientId) throw new Error("Missing params");

    const sb = supabaseServer();
    const { data: rows, error } = await sb
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const list = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = list.findIndex((x) => x.id === id);
    if (idx <= 0) return;

    const a = list[idx];
    const b = list[idx - 1];

    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? idx;

    const { error: e1 } = await sb.from("gallery_images").update({ sort_order: bOrder }).eq("id", a.id);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await sb.from("gallery_images").update({ sort_order: aOrder }).eq("id", b.id);
    if (e2) throw new Error(e2.message);

    revalidatePath(`/admin/${slug}/gallery`);
    revalidatePath(`/${slug}`);
  }

  async function moveDown(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id || !clientId) throw new Error("Missing params");

    const sb = supabaseServer();
    const { data: rows, error } = await sb
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const list = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1 || idx >= list.length - 1) return;

    const a = list[idx];
    const b = list[idx + 1];

    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? idx + 2;

    const { error: e1 } = await sb.from("gallery_images").update({ sort_order: bOrder }).eq("id", a.id);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await sb.from("gallery_images").update({ sort_order: aOrder }).eq("id", b.id);
    if (e2) throw new Error(e2.message);

    revalidatePath(`/admin/${slug}/gallery`);
    revalidatePath(`/${slug}`);
  }

  const settingsUrl = `/admin/${slug}/settings?key=${encodeURIComponent(key)}`;
  const servicesUrl = `/admin/${slug}/services?key=${encodeURIComponent(key)}`;
  const galleryUrl = `/admin/${slug}/gallery?key=${encodeURIComponent(key)}`;

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Gallery: {client.business_name}</h1>
            <div className="text-sm text-gray-500">slug: {client.slug}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={settingsUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Settings →
            </Link>
            <Link
              href={servicesUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Services →
            </Link>
            <Link
              href={galleryUrl}
              className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            >
              Gallery
            </Link>
            <Link
              href={`/${slug}`}
              className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
            >
              View public →
            </Link>
          </div>
        </div>

        {/* ADD NEW */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Add image</div>

          <form action={addImage} className="grid md:grid-cols-6 gap-3">
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="client_id" value={client.id} />

            <Field name="image_url" label="Image URL" placeholder="https://..." className="md:col-span-5" />
            <Field name="sort_order" label="Sort" placeholder="1" className="md:col-span-1" />

            <div className="md:col-span-6">
              <button className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
                Add
              </button>
            </div>
          </form>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Current gallery</div>

          <div className="grid md:grid-cols-2 gap-4">
            {(gallery as GalleryRow[]).map((g) => (
              <div key={g.id} className="rounded-xl border border-gray-200 p-4">
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image_url} alt="" className="w-full h-52 object-cover" />
                </div>

                <form className="grid grid-cols-6 gap-3 mt-4">
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="client_id" value={client.id} />

                  <Input name="image_url" label="URL" defaultValue={g.image_url} className="col-span-6" />
                  <Input name="sort_order" label="Sort" defaultValue={g.sort_order ?? ""} className="col-span-2" />

                  <div className="col-span-4 flex items-end justify-end gap-2">
                    <button
                      formAction={moveUp}
                      className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                      title="Move up"
                      type="submit"
                    >
                      ↑
                    </button>
                    <button
                      formAction={moveDown}
                      className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                      title="Move down"
                      type="submit"
                    >
                      ↓
                    </button>

                    <button
                      formAction={updateImage}
                      className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                      type="submit"
                    >
                      Save
                    </button>

                    <button
                      formAction={deleteImage}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                      type="submit"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

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
