// app/admin/[slug]/services/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import { redirect } from "next/navigation";

type ClientRow = { id: string; slug: string; business_name: string };

type ServiceRow = {
  id: string;
  client_id: string;
  category: string | null;
  name: string;
  description: string | null;
  duration_min: number | null;
  price_from: number | null;
  sort_order: number | null;
  is_featured: boolean | null;
  featured_image_url: string | null;
};

type StaffRow = { id: string; name: string; is_active: boolean; is_default: boolean };

type ServiceStaffRow = {
  client_id: string;
  service_id: string;
  staff_id: string;
  is_active: boolean;
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

  // 1) Client
  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr) return <div className="p-8">DB error: {clientErr.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  const clientId = client.id;

  // 2) Staff options
  const { data: staffRows } = await sb
    .from("staff")
    .select("id, name, is_active, is_default")
    .eq("client_id", clientId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })
    .returns<StaffRow[]>();

  const staffOptions = (staffRows || []).filter((s) => s.is_active);

  // 3) Existing assignments
  const { data: ssRows } = await sb
    .from("service_staff")
    .select("client_id, service_id, staff_id, is_active")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .returns<ServiceStaffRow[]>();

  const assignedByService = new Map<string, Set<string>>();
  for (const r of ssRows || []) {
    if (!assignedByService.has(r.service_id)) assignedByService.set(r.service_id, new Set());
    assignedByService.get(r.service_id)!.add(r.staff_id);
  }

  // 4) Services
  const { data: services, error: servicesErr } = await sb
    .from("services")
    .select(
      "id, client_id, category, name, description, duration_min, price_from, sort_order, is_featured, featured_image_url"
    )
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true })
    .returns<ServiceRow[]>();

  if (servicesErr) return <div className="p-8">DB error: {servicesErr.message}</div>;

  const toastText =
    toast === "added"
      ? "Service added."
      : toast === "saved"
      ? "Changes saved."
      : toast === "deleted"
      ? "Service deleted."
      : toast === "upload_failed"
      ? "Upload failed."
      : toast === "error"
      ? "Action failed."
      : null;

  const BUCKET = "services";

  // ---------------- server actions ----------------

  async function addService(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const name = (formData.get("name")?.toString() || "").trim();
    if (!name) throw new Error("Name is required");

    const category = (formData.get("category")?.toString() || "").trim() || null;
    const description = (formData.get("description")?.toString() || "").trim() || null;
    const duration_min = parseInt(formData.get("duration_min")?.toString() || "", 10) || null;
    const price_from = parseFloat(formData.get("price_from")?.toString() || "") || null;
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    const is_featured = formData.get("is_featured") ? true : false;

    const file = formData.get("featured_file") as File | null;
    const featured_image_url_raw = (formData.get("featured_image_url")?.toString() || "").trim();
    let featured_image_url: string | null = featured_image_url_raw || null;

    // Upload (optional)
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

      if (upErr) {
        revalidatePath(`/admin/${slug}/services`);
        return redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=upload_failed`);
      }

      const { data: pub } = sb2.storage.from(BUCKET).getPublicUrl(path);
      featured_image_url = pub.publicUrl;
    }

    const sb3 = supabaseServer();

    // 1) Insert service and get id
    const { data: inserted, error } = await sb3
      .from("services")
      .insert({
        client_id: clientId,
        category,
        name,
        description,
        duration_min,
        price_from,
        sort_order,
        is_featured,
        featured_image_url,
      })
      .select("id")
      .single<{ id: string }>();

    if (error || !inserted) throw new Error(error?.message || "Insert failed");

    const serviceId = inserted.id;

    // 2) staff ids from form (checkboxes) + dedupe
    let staffIds = Array.from(
      new Set((formData.getAll("staff_ids") || []).map(String).filter(Boolean))
    );

    // ---- ТУК Е МЯСТОТО, където се "пъха" fallback-а ----
    // Ако нищо не е избрано -> 1) default staff
    if (!staffIds.length) {
      const { data: def } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .eq("is_default", true)
        .maybeSingle<{ id: string }>();

      if (def?.id) staffIds = [def.id];
    }

    // 2) ако няма default, вземи първия active
    if (!staffIds.length) {
      const { data: one } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (one?.id) staffIds = [one.id];
    }
    // ---- край на fallback-а ----

    // 3) Validate staff belongs to client & active + upsert mapping
    if (staffIds.length) {
      const { data: validStaff } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .in("id", staffIds)
        .returns<{ id: string }[]>();

      const validIds = new Set((validStaff || []).map((x) => x.id));

      const rows = staffIds
        .filter((sid) => validIds.has(sid))
        .map((staff_id) => ({
          client_id: clientId,
          service_id: serviceId,
          staff_id,
          is_active: true,
        }));

      if (rows.length) {
        const { error: ssErr } = await sb3
          .from("service_staff")
          .upsert(rows, { onConflict: "client_id,service_id,staff_id" });

        if (ssErr) throw new Error(ssErr.message);
      }
    }

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

    const name = (formData.get("name")?.toString() || "").trim();
    if (!name) throw new Error("Name is required");

    const category = (formData.get("category")?.toString() || "").trim() || null;
    const description = (formData.get("description")?.toString() || "").trim() || null;
    const duration_min = parseInt(formData.get("duration_min")?.toString() || "", 10) || null;
    const price_from = parseFloat(formData.get("price_from")?.toString() || "") || null;
    const sort_order = parseInt(formData.get("sort_order")?.toString() || "", 10) || 1;

    const is_featured = formData.get("is_featured") ? true : false;

    const oldFeaturedUrl = (formData.get("old_featured_image_url")?.toString() || "").trim();
    const featured_image_url_raw = (formData.get("featured_image_url")?.toString() || "").trim();
    let featured_image_url: string | null = featured_image_url_raw || null;

    const file = formData.get("featured_file") as File | null;

    const sb3 = supabaseServer();

    // Upload (optional)
    if (file && file.size > 0) {
      const MAX_BYTES = 10 * 1024 * 1024;
      if (file.size > MAX_BYTES) throw new Error("File too large (max 10MB).");

      const safeName = sanitizeFileName(file.name || "image");
      const ext = safeName.includes(".") ? safeName.split(".").pop() : "jpg";
      const path = `${clientId}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: upErr } = await sb3.storage.from(BUCKET).upload(path, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

      if (upErr) {
        revalidatePath(`/admin/${slug}/services`);
        return redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=upload_failed`);
      }

      const { data: pub } = sb3.storage.from(BUCKET).getPublicUrl(path);
      featured_image_url = pub.publicUrl;

      const oldPath = storagePathFromPublicUrl(oldFeaturedUrl, BUCKET);
      if (oldPath) await sb3.storage.from(BUCKET).remove([oldPath]);
    }

    // 1) Update service
    const { error } = await sb3
      .from("services")
      .update({
        category,
        name,
        description,
        duration_min,
        price_from,
        sort_order,
        is_featured,
        featured_image_url,
      })
      .eq("id", id)
      .eq("client_id", clientId);

    if (error) throw new Error(error.message);

    // 2) Staff assignments (dedupe)
    const staffIds = Array.from(
      new Set((formData.getAll("staff_ids") || []).map(String).filter(Boolean))
    );

    // Ако никой не е избран -> fallback към default staff
    if (!staffIds.length) {
      const { data: def } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .eq("is_default", true)
        .maybeSingle<{ id: string }>();

      if (def?.id) staffIds.push(def.id);
    }

    // Ако няма default -> fallback към първия active staff
    if (!staffIds.length) {
      const { data: one } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (one?.id) staffIds.push(one.id);
    }

    // Replace mapping (MVP safe)
    await sb3
      .from("service_staff")
      .delete()
      .eq("client_id", clientId)
      .eq("service_id", id);

    if (staffIds.length) {
      // Validate staff belongs to client & active
      const { data: validStaff } = await sb3
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .in("id", staffIds)
        .returns<{ id: string }[]>();

      const validIds = new Set((validStaff || []).map((x) => x.id));

      const rows = staffIds
        .filter((sid) => validIds.has(sid))
        .map((staff_id) => ({
          client_id: clientId,
          service_id: id,
          staff_id,
          is_active: true,
        }));

      if (rows.length) {
        const { error: ssErr } = await sb3
          .from("service_staff")
          .upsert(rows, { onConflict: "client_id,service_id,staff_id" });

        if (ssErr) throw new Error(ssErr.message);
      }
    }


    // 3) Revalidate + redirect
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

    const featuredUrl = (formData.get("featured_image_url")?.toString() || "").trim();

    const sb2 = supabaseServer();
    const { error } = await sb2.from("services").delete().eq("id", id).eq("client_id", clientId);
    if (error) throw new Error(error.message);

    const path = storagePathFromPublicUrl(featuredUrl, BUCKET);
    if (path) await sb2.storage.from(BUCKET).remove([path]);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/services`);
    redirect(`/admin/${slug}/services?key=${encodeURIComponent(key)}&toast=deleted`);
  }

  // ---------------- render ----------------

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
          <div>
            <div className="font-semibold">Add service</div>
            <div className="text-xs text-gray-500 mt-1">Create a new service entry for the public site.</div>
          </div>

          <form action={addService} className="mt-5 grid md:grid-cols-6 gap-3">
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

            <div className="md:col-span-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="is_featured" className="h-4 w-4" />
                  <span className="text-sm font-semibold">Featured (show on home)</span>
                </label>

                <div className="text-xs text-gray-500">
                  Featured services appear in the 3 cards at the top of the Minimal theme.
                </div>
              </div>

              <div className="mt-4 grid md:grid-cols-6 gap-3">
                <label className="md:col-span-3 block space-y-1">
                  <div className="text-sm text-gray-600">Featured image upload</div>
                  <input
                    type="file"
                    name="featured_file"
                    accept="image/*"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                  />
                  <div className="text-xs text-gray-500">Prefer upload. Max 10MB.</div>
                </label>

                <label className="md:col-span-3 block space-y-1">
                  <div className="text-sm text-gray-600">Featured image URL (optional)</div>
                  <input
                    name="featured_image_url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <div className="text-xs text-gray-500">Used only if no upload.</div>
                </label>
              </div>
            </div>

            {/* STAFF ASSIGNMENTS (ADD) */}
            <div className="md:col-span-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Assigned staff</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Ако не избереш никой, автоматично ще се върже към Default специалист (или първия активен).
                  </div>
                </div>
                <a className="text-xs underline text-gray-700" href={`/admin/${slug}/staff?key=${encodeURIComponent(key)}`}>
                  Manage staff →
                </a>
              </div>

              {staffOptions.length ? (
                <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {staffOptions.map((st) => (
                    <label key={st.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <input type="checkbox" name="staff_ids" value={st.id} defaultChecked={!!st.is_default} className="h-4 w-4" />
                      <span className="text-sm text-gray-900">
                        {st.name} {st.is_default ? <span className="text-xs text-gray-500">(default)</span> : null}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-gray-600">No active staff yet. Add staff first, then you can assign them to services.</div>
              )}
            </div>

            <div className="md:col-span-6">
              <button type="submit" className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
                Add
              </button>
            </div>
          </form>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Current services</div>
              <div className="text-xs text-gray-500 mt-1">Click a service to expand. Mark max 3 as Featured for the Minimal top cards.</div>
            </div>
            <div className="text-xs text-gray-500">{services?.length ? `${services.length} services` : "—"}</div>
          </div>

          {!services?.length ? (
            <div className="mt-4 text-sm text-gray-600">No services yet.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {services.map((s, idx) => (
                <details key={s.id} className="group rounded-2xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden" open={idx === 0}>
                  <summary className="cursor-pointer list-none select-none">
                    <div className="flex items-center justify-between gap-3 p-5 bg-white">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-[15px] font-semibold text-gray-900 truncate">{s.name}</div>

                          {s.category ? (
                            <span className="text-xs px-2 py-1 rounded-full border border-gray-300 bg-gray-50 text-gray-700">{s.category}</span>
                          ) : null}

                          {s.is_featured ? <span className="text-xs px-2 py-1 rounded-full bg-black text-white">Featured</span> : null}

                          <span className="text-xs px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">Sort: {s.sort_order ?? "—"}</span>
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          ID: <code className="px-2 py-1 bg-gray-50 rounded border border-gray-200">{s.id.slice(0, 8)}…</code>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 group-open:hidden">Click to edit</div>
                      <div className="text-xs text-gray-500 hidden group-open:block">Click to collapse</div>
                    </div>
                  </summary>

                  <div className="p-5 border-t border-gray-200">
                    <form className="grid md:grid-cols-6 gap-3">
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="service_id" value={s.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="old_featured_image_url" value={s.featured_image_url || ""} />

                      <Input name="category" label="Category" defaultValue={s.category || ""} className="md:col-span-1" />
                      <Input name="name" label="Name" defaultValue={s.name} className="md:col-span-2" />
                      <Input name="price_from" label="Price" defaultValue={s.price_from ?? ""} className="md:col-span-1" />
                      <Input name="duration_min" label="Minutes" defaultValue={s.duration_min ?? ""} className="md:col-span-1" />
                      <Input name="sort_order" label="Sort" defaultValue={s.sort_order ?? ""} className="md:col-span-1" />

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

                      <div className="md:col-span-6 rounded-xl border border-gray-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" name="is_featured" defaultChecked={!!s.is_featured} className="h-4 w-4" />
                            <span className="text-sm font-semibold">Featured</span>
                          </label>
                          <div className="text-xs text-gray-500">Upload replaces current image. Or set URL below.</div>
                        </div>

                        <div className="mt-4 grid md:grid-cols-6 gap-3">
                          <label className="md:col-span-3 block space-y-1">
                            <div className="text-sm text-gray-600">Replace featured image (upload)</div>
                            <input type="file" name="featured_file" accept="image/*" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3" />
                          </label>

                          <label className="md:col-span-3 block space-y-1">
                            <div className="text-sm text-gray-600">Featured image URL (optional override)</div>
                            <input
                              name="featured_image_url"
                              defaultValue={s.featured_image_url || ""}
                              placeholder="https://..."
                              className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                            />
                          </label>

                          {s.featured_image_url ? (
                            <div className="md:col-span-6">
                              <div className="text-xs text-gray-500 mb-2">Current featured image preview:</div>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.featured_image_url} alt="" className="h-44 w-full max-w-2xl object-cover rounded-xl border border-gray-200" />
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* STAFF ASSIGNMENTS (EDIT) */}
                      <div className="md:col-span-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">Assigned staff</div>
                            <div className="text-xs text-gray-500 mt-1">
                              If none is selected, booking falls back to Default staff (current MVP behavior).
                            </div>
                          </div>
                          <a className="text-xs underline text-gray-700" href={`/admin/${slug}/staff?key=${encodeURIComponent(key)}`}>
                            Manage staff →
                          </a>
                        </div>

                        {staffOptions.length ? (
                          <div className="mt-4 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {staffOptions.map((st) => {
                              const assigned = assignedByService.get(s.id)?.has(st.id) || false;
                              return (
                                <label key={st.id} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <input type="checkbox" name="staff_ids" value={st.id} defaultChecked={assigned} className="h-4 w-4" />
                                  <span className="text-sm text-gray-900">
                                    {st.name} {st.is_default ? <span className="text-xs text-gray-500">(default)</span> : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-gray-600">No active staff yet. Add staff first, then you can assign them to services.</div>
                        )}
                      </div>

                      <div className="md:col-span-6 flex items-center gap-3 pt-2">
                        <button type="submit" formAction={updateService} className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
                          Save
                        </button>

                        <button type="submit" formAction={deleteService} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition">
                          Delete
                        </button>

                        <div className="ml-auto text-xs text-gray-500">
                          Featured: <span className="font-semibold">{s.is_featured ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    </form>
                  </div>
                </details>
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

/* ---------------- helpers ---------------- */

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
