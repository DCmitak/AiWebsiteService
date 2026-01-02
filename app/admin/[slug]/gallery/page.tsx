// app/admin/[slug]/gallery/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import { redirect } from "next/navigation";

type GalleryRow = {
  id: string;
  client_id: string;
  image_url: string;
  sort_order: number | null;
};

export default async function AdminGallery(props: {
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

  const { data: gallery, error: galleryErr } = await sb
    .from("gallery_images")
    .select("id, client_id, image_url, sort_order")
    .eq("client_id", client.id)
    .order("sort_order", { ascending: true });

  if (galleryErr) return <div className="p-8">DB error: {galleryErr.message}</div>;

  const toastText =
    toast === "added"
      ? "Image added."
      : toast === "saved"
      ? "Changes saved."
      : toast === "deleted"
      ? "Image deleted."
      : toast === "moved"
      ? "Order updated."
      : toast === "replaced"
      ? "Image replaced."
      : toast === "missing_file"
      ? "Please choose a file first."
      : toast === "upload_failed"
      ? "Upload failed."
      : null;

  const BUCKET = "gallery";

  async function addImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const file = formData.get("image_file") as File | null;

    const image_url_raw = (formData.get("image_url")?.toString() || "").trim();
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    let finalUrl = image_url_raw;

    // Prefer upload if file is provided
    if (file && file.size > 0) {
      const MAX_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_BYTES) throw new Error("File too large (max 10MB).");

      const sb2 = supabaseServer();

      const safeName = sanitizeFileName(file.name || "image");
      const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
      const path = `${clientId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (upErr) throw new Error(upErr.message);

      const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
      finalUrl = pub.publicUrl;
    }

    if (!finalUrl) throw new Error("Provide an Image URL or upload a file.");

    const sb3 = supabaseServer();
    const { error } = await sb3.from("gallery_images").insert({
      client_id: clientId,
      image_url: finalUrl,
      sort_order,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=added`);
  }

  async function updateImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const image_url = (formData.get("image_url")?.toString() || "").trim();
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    if (!image_url) throw new Error("image_url is required");

    const sb2 = supabaseServer();
    const { error } = await sb2
      .from("gallery_images")
      .update({ image_url, sort_order })
      .eq("id", id)
      .eq("client_id", clientId);

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=saved`);
  }

  async function replaceImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const oldUrl = (formData.get("old_image_url")?.toString() || "").trim();

    const file = formData.get("replace_file") as File | null;

    // ✅ No crash: show toast
    if (!file || file.size <= 0) {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=missing_file`);
    }

    const MAX_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_BYTES) throw new Error("File too large (max 10MB).");

    const sb2 = supabaseServer();

    const safeName = sanitizeFileName(file.name || "image");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
    const path = `${clientId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: updErr } = await sb2
      .from("gallery_images")
      .update({ image_url: newUrl })
      .eq("id", id)
      .eq("client_id", clientId);

    if (updErr) throw new Error(updErr.message);

    // Best-effort: remove old object if it is from our bucket
    const oldPath = storagePathFromPublicUrl(oldUrl, BUCKET);
    if (oldPath) {
      await sb2.storage.from(BUCKET).remove([oldPath]);
    }

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=replaced`);
  }

  async function deleteImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    if (!id) throw new Error("Missing id");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const imageUrl = (formData.get("image_url")?.toString() || "").trim();

    const sb2 = supabaseServer();

    const { error } = await sb2
      .from("gallery_images")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId);

    if (error) throw new Error(error.message);

    // Best-effort: remove storage object if it's our bucket URL
    const path = storagePathFromPublicUrl(imageUrl, BUCKET);
    if (path) {
      await sb2.storage.from(BUCKET).remove([path]);
    }

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=deleted`);
  }

  async function moveUp(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id || !clientId) throw new Error("Missing params");

    const sb2 = supabaseServer();
    const { data: rows, error } = await sb2
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const list = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = list.findIndex((x) => x.id === id);

    if (idx <= 0) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
    }

    const a = list[idx];
    const b = list[idx - 1];

    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? idx;

    const { error: e1 } = await sb2
      .from("gallery_images")
      .update({ sort_order: bOrder })
      .eq("id", a.id)
      .eq("client_id", clientId);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await sb2
      .from("gallery_images")
      .update({ sort_order: aOrder })
      .eq("id", b.id)
      .eq("client_id", clientId);
    if (e2) throw new Error(e2.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
  }

  async function moveDown(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id || !clientId) throw new Error("Missing params");

    const sb2 = supabaseServer();
    const { data: rows, error } = await sb2
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const list = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = list.findIndex((x) => x.id === id);

    if (idx === -1 || idx >= list.length - 1) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
    }

    const a = list[idx];
    const b = list[idx + 1];

    const aOrder = a.sort_order ?? idx + 1;
    const bOrder = b.sort_order ?? idx + 2;

    const { error: e1 } = await sb2
      .from("gallery_images")
      .update({ sort_order: bOrder })
      .eq("id", a.id)
      .eq("client_id", clientId);
    if (e1) throw new Error(e1.message);

    const { error: e2 } = await sb2
      .from("gallery_images")
      .update({ sort_order: aOrder })
      .eq("id", b.id)
      .eq("client_id", clientId);
    if (e2) throw new Error(e2.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);

    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav
          slug={client.slug}
          businessName={`${client.business_name} — Gallery`}
          keyParam={key}
          active="gallery"
        />

        {toastText ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastText}
          </div>
        ) : null}

        {/* ADD NEW */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="font-semibold mb-4">Add image</div>

          <form action={addImage} className="grid md:grid-cols-6 gap-3">
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="client_id" value={client.id} />

            <label className="block space-y-1 md:col-span-6">
              <div className="text-sm text-gray-600">Upload image</div>
              <input
                type="file"
                name="image_file"
                accept="image/*"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              />
              <div className="text-xs text-gray-500">Prefer upload. If empty, Image URL below will be used.</div>
            </label>

            <Field name="image_url" label="Image URL (optional)" placeholder="https://..." className="md:col-span-5" />
            <Field name="sort_order" label="Sort" placeholder="1" className="md:col-span-1" />

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
          <div className="font-semibold mb-4">Current gallery</div>

          {!gallery?.length ? (
            <div className="text-sm text-gray-600">No images yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(gallery as GalleryRow[]).map((g) => (
                <div key={g.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image_url} alt="" className="w-full h-52 object-cover" />
                  </div>

                  {/* Replace image */}
                  <form action={replaceImage} className="mt-4 rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="old_image_url" value={g.image_url} />

                    <div className="text-sm font-semibold mb-2">Replace image</div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block space-y-1">
                          <div className="text-xs text-gray-600">Upload new file</div>
                          <input
                            type="file"
                            name="replace_file"
                            accept="image/*"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                          />
                        </label>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                      >
                        Replace
                      </button>
                    </div>
                  </form>

                  {/* Edit / reorder / delete */}
                  <form className="grid grid-cols-6 gap-3 mt-4">
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="image_url" value={g.image_url} />

                    <Input name="image_url" label="URL" defaultValue={g.image_url} className="col-span-6" />
                    <Input name="sort_order" label="Sort" defaultValue={g.sort_order ?? ""} className="col-span-2" />

                    <div className="col-span-4 flex items-end justify-end gap-2">
                      <button
                        formAction={moveUp}
                        type="submit"
                        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                        title="Move up"
                        aria-label="Move up"
                      >
                        ↑
                      </button>

                      <button
                        formAction={moveDown}
                        type="submit"
                        className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                        title="Move down"
                        aria-label="Move down"
                      >
                        ↓
                      </button>

                      <button
                        formAction={updateImage}
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                      >
                        Save
                      </button>

                      <button
                        formAction={deleteImage}
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
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

/* ---------------- Gallery helpers ---------------- */

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9.\-_]/g, "");
}

function storagePathFromPublicUrl(publicUrl: string, bucket: string) {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return u.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
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
