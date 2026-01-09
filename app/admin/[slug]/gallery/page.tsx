// app/admin/[slug]/gallery/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import AdminToast from "@/app/admin/_components/AdminToast";
import { redirect } from "next/navigation";

type GalleryRow = {
  id: string;
  client_id: string;
  image_url: string;
  sort_order: number | null;
  section: string | null;
};

const BUCKET = "gallery";

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
    .select("id, client_id, image_url, sort_order, section")
    .eq("client_id", client.id)
    .order("section", { ascending: true })
    .order("sort_order", { ascending: true });

  if (galleryErr) return <div className="p-8">DB error: {galleryErr.message}</div>;

  const list = (gallery || []) as GalleryRow[];
  const normalized = list.map((x) => ({ ...x, section: (x.section || "work").toLowerCase() }));

  const hero = normalized.filter((x) => x.section === "hero");
  const about = normalized.filter((x) => x.section === "about");
  const pricing = normalized.filter((x) => x.section === "pricing");
  const work = normalized.filter((x) => x.section === "work");
  const venue = normalized.filter((x) => x.section === "venue");
  const brands = normalized.filter((x) => x.section === "brands");

  // ---------- helpers ----------
  const SINGLE_SECTIONS = new Set(["hero", "about", "pricing"]);
  const MAX_BYTES = 10 * 1024 * 1024;

  async function addImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const sectionRaw = (formData.get("section")?.toString() || "work").trim().toLowerCase();
    const section = sectionRaw || "work";

    const file = formData.get("image_file") as File | null;

    const sort_order_raw = parseInt(formData.get("sort_order")?.toString() || "", 10);
    let sort_order = Number.isFinite(sort_order_raw) && sort_order_raw > 0 ? sort_order_raw : 0;

    if (!file || file.size <= 0) {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=missing_file`);
    }

    if (file.size > MAX_BYTES) {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=file_too_large`);
    }

    const sb2 = supabaseServer();

    const safeName = sanitizeFileName(file.name || "image");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
    const path = `${clientId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload with safe toast redirect on failure
    try {
      const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (upErr) {
        revalidatePath(`/admin/${slug}/gallery`);
        return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=upload_failed`);
      }
    } catch {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=upload_failed`);
    }

    const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
    const finalUrl = pub.publicUrl;

    const sb3 = supabaseServer();

    // single section enforcement: move old -> work
    if (SINGLE_SECTIONS.has(section)) {
      await sb3
        .from("gallery_images")
        .update({ section: "work" })
        .eq("client_id", clientId)
        .eq("section", section);
    }

    if (!sort_order) {
      const { data: maxRows } = await sb3
        .from("gallery_images")
        .select("sort_order")
        .eq("client_id", clientId)
        .eq("section", section)
        .order("sort_order", { ascending: false })
        .limit(1);

      const last = (maxRows?.[0]?.sort_order as number | null) ?? 0;
      sort_order = (last || 0) + 1;
    }

    const { error } = await sb3.from("gallery_images").insert({
      client_id: clientId,
      image_url: finalUrl,
      sort_order,
      section,
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

    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;
    const sectionRaw = (formData.get("section")?.toString() || "work").trim().toLowerCase();
    const section = sectionRaw || "work";

    const sb2 = supabaseServer();

    if (SINGLE_SECTIONS.has(section)) {
      await sb2
        .from("gallery_images")
        .update({ section: "work" })
        .eq("client_id", clientId)
        .eq("section", section)
        .neq("id", id);
    }

    const { error } = await sb2
      .from("gallery_images")
      .update({ sort_order, section })
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

    const file = formData.get("replace_file") as File | null;

    if (!file || file.size <= 0) {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=missing_file`);
    }

    if (file.size > MAX_BYTES) {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=file_too_large`);
    }

    const sb2 = supabaseServer();

    // Source of truth for old URL: DB (not form)
    const { data: row, error: readErr } = await sb2
      .from("gallery_images")
      .select("image_url")
      .eq("id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Image not found");

    const oldUrl = (row.image_url || "").trim();

    const safeName = sanitizeFileName(file.name || "image");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
    const path = `${clientId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload with safe toast redirect on failure
    try {
      const { error: upErr } = await sb2.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (upErr) {
        revalidatePath(`/admin/${slug}/gallery`);
        return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=upload_failed`);
      }
    } catch {
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=upload_failed`);
    }

    const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
    const newUrl = pub.publicUrl;

    const { error: updErr } = await sb2
      .from("gallery_images")
      .update({ image_url: newUrl })
      .eq("id", id)
      .eq("client_id", clientId);

    if (updErr) throw new Error(updErr.message);

    // Remove old file from storage using DB oldUrl
    const oldPath = storagePathFromPublicUrl(oldUrl, BUCKET);
    if (oldPath) await sb2.storage.from(BUCKET).remove([oldPath]);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/gallery`);
    redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=replaced`);
  }

  async function deleteImage(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id || !clientId) throw new Error("Missing params");

    const sb = supabaseServer();

    // 1) Read current row (source of truth)
    const { data: row, error: readErr } = await sb
      .from("gallery_images")
      .select("image_url")
      .eq("id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Image not found");

    // 2) Delete DB row
    const { error: delErr } = await sb
      .from("gallery_images")
      .delete()
      .eq("id", id)
      .eq("client_id", clientId);

    if (delErr) throw new Error(delErr.message);

    // 3) Delete storage object using DB url
    const path = storagePathFromPublicUrl(row.image_url, BUCKET);
    if (path) await sb.storage.from(BUCKET).remove([path]);

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
    const sectionRaw = (formData.get("section")?.toString() || "work").trim().toLowerCase();
    const section = sectionRaw || "work";

    if (!id || !clientId) throw new Error("Missing params");

    const sb2 = supabaseServer();
    const { data: rows, error } = await sb2
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .eq("section", section)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const arr = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = arr.findIndex((x) => x.id === id);

    if (idx <= 0) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
    }

    const a = arr[idx];
    const b = arr[idx - 1];

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
    const sectionRaw = (formData.get("section")?.toString() || "work").trim().toLowerCase();
    const section = sectionRaw || "work";

    if (!id || !clientId) throw new Error("Missing params");

    const sb2 = supabaseServer();
    const { data: rows, error } = await sb2
      .from("gallery_images")
      .select("id, sort_order")
      .eq("client_id", clientId)
      .eq("section", section)
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);

    const arr = (rows || []) as { id: string; sort_order: number | null }[];
    const idx = arr.findIndex((x) => x.id === id);

    if (idx === -1 || idx >= arr.length - 1) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/admin/${slug}/gallery`);
      return redirect(`/admin/${slug}/gallery?key=${encodeURIComponent(key)}&toast=moved`);
    }

    const a = arr[idx];
    const b = arr[idx + 1];

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

        <AdminToast toast={toast} />

        {/* ADD NEW */}
        <section className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/70 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-black text-white grid place-items-center text-lg">+</div>
            <div>
              <div className="font-semibold">Add new image</div>
              <div className="text-xs text-gray-500">Upload an image and assign it to a section</div>
            </div>
          </div>

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
              <div className="text-xs text-gray-500">Only uploads are supported.</div>
            </label>

            <label className="block space-y-1 md:col-span-3">
              <div className="text-sm text-gray-600">Section</div>
              <select
                name="section"
                defaultValue="work"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="hero">Hero (1 image)</option>
                <option value="about">About (1 image – За нас)</option>
                <option value="pricing">Pricing (1 image – for Pricing v1)</option>
                <option value="work">Work (Снимки от работата)</option>
                <option value="venue">Venue (Галерия на обекта)</option>
                <option value="brands">Brands (logos)</option>
              </select>
              <div className="text-xs text-gray-500">
                Hero/About/Pricing keep only 1 image. Previous is moved to work.
              </div>
            </label>

            <Field name="sort_order" label="Sort (optional)" placeholder="auto" className="md:col-span-3" />

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

        <GallerySection
          title="Hero image — 1 image"
          subtitle="Used only if Settings → hero_image_url is empty."
          items={hero}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <GallerySection
          title="About image (За нас) — 1 image"
          subtitle="Used in About section image on the public site."
          items={about}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <GallerySection
          title="Pricing image — 1 image"
          subtitle="Used in Pricing layout v1 (image on the left)."
          items={pricing}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <GallerySection
          title="Снимки от работата ни (work)"
          subtitle="Used for featured cards + gallery section on the public site."
          items={work}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <GallerySection
          title="Галерия на обекта (venue)"
          subtitle="Photos of the salon/studio/clinic – used in gallery + fallbacks."
          items={venue}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <GallerySection
          title="Brands (logos)"
          subtitle="Logos shown in a grid section on the public site."
          items={brands}
          keyParam={key}
          clientId={client.id}
          onUpdate={updateImage}
          onReplace={replaceImage}
          onDelete={deleteImage}
          onUp={moveUp}
          onDown={moveDown}
          allowSectionChange
        />

        <p className="text-sm text-gray-500">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}

function GallerySection(props: {
  title: string;
  subtitle?: string;
  items: GalleryRow[];
  keyParam?: string;
  clientId: string;
  allowSectionChange?: boolean;
  onUpdate: (fd: FormData) => Promise<void>;
  onReplace: (fd: FormData) => Promise<void>;
  onDelete: (fd: FormData) => Promise<void>;
  onUp: (fd: FormData) => Promise<void>;
  onDown: (fd: FormData) => Promise<void>;
}) {
  const { title, subtitle, items, keyParam, clientId, allowSectionChange, onUpdate, onReplace, onDelete, onUp, onDown } =
    props;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-gray-600">{subtitle}</div> : null}
        </div>
        <div className="text-sm text-gray-500">{items.length ? `${items.length} images` : "No images"}</div>
      </div>

      {!items.length ? (
        <div className="mt-4 text-sm text-gray-600">No images in this section yet.</div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          {items.map((g) => (
            <div key={g.id} className="rounded-xl border border-gray-200 p-4">
              <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.image_url} alt="" className="w-full h-52 object-cover" />
              </div>

              <form action={onReplace} className="mt-4 rounded-lg border border-gray-200 p-3 bg-gray-50">
                <input type="hidden" name="key" value={keyParam} />
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="client_id" value={clientId} />
                {/* kept for convenience, but NOT used on server (server reads DB) */}
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

              <form className="grid grid-cols-6 gap-3 mt-4">
                <input type="hidden" name="key" value={keyParam} />
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="image_url" value={g.image_url} />

                <Input name="sort_order" label="Sort" defaultValue={g.sort_order ?? ""} className="col-span-2" />

                {allowSectionChange ? (
                  <label className="block space-y-1 col-span-4">
                    <div className="text-sm text-gray-600">Section</div>
                    <select
                      name="section"
                      defaultValue={g.section || "work"}
                      className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                    >
                      <option value="hero">hero</option>
                      <option value="about">about</option>
                      <option value="pricing">pricing</option>
                      <option value="work">work</option>
                      <option value="venue">venue</option>
                      <option value="brands">brands</option>
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="section" value={g.section || "work"} />
                )}

                <div className="col-span-6 flex items-end justify-end gap-2">
                  <button
                    formAction={onUp}
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                    title="Move up"
                    aria-label="Move up"
                  >
                    ↑
                  </button>

                  <button
                    formAction={onDown}
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                    title="Move down"
                    aria-label="Move down"
                  >
                    ↓
                  </button>

                  <button
                    formAction={onUpdate}
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                  >
                    Save
                  </button>

                  <button
                    formAction={onDelete}
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </form>

              <div className="mt-2 text-xs text-gray-500">Reorder works inside the selected section.</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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
