// app/admin/[slug]/staff/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ClientRow = { id: string; slug: string; business_name: string };

type StaffRow = {
  id: string;
  client_id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
};

export default async function AdminStaffPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; toast?: string }>;
}) {
  const [{ slug }, { key, toast }] = await Promise.all([props.params, props.searchParams]);

  if (!key || key !== process.env.ADMIN_KEY) return <div className="p-8">Unauthorized</div>;

  const sb = supabaseServer();

  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr) return <div className="p-8">DB error: {clientErr.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  const { data: staffRows, error: staffErr } = await sb
    .from("staff")
    .select("id, client_id, name, is_active, is_default, created_at")
    .eq("client_id", client.id)
    .order("is_default", { ascending: false })
    .order("is_active", { ascending: false })
    .order("name", { ascending: true })
    .returns<StaffRow[]>();

  if (staffErr) return <div className="p-8">DB error: {staffErr.message}</div>;

  const toastText =
    toast === "added"
      ? "Staff added."
      : toast === "saved"
      ? "Changes saved."
      : toast === "default_set"
      ? "Default staff updated."
      : toast === "deactivated"
      ? "Staff deactivated."
      : toast === "activated"
      ? "Staff activated."
      : toast === "error"
      ? "Action failed."
      : null;

  async function addStaff(formData: FormData) {
    "use server";

    const key = String(formData.get("key") || "");
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = String(formData.get("client_id") || "");
    const name = String(formData.get("name") || "").trim();
    const is_active = formData.get("is_active") ? true : false;
    const make_default = formData.get("make_default") ? true : false;

    if (!clientId || !name) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    const sb2 = supabaseServer();

    const { data: inserted, error: insErr } = await sb2
      .from("staff")
      .insert({ client_id: clientId, name, is_active, is_default: false })
      .select("id")
      .single<{ id: string }>();

    if (insErr || !inserted) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    if (make_default) {
      await sb2.from("staff").update({ is_default: false }).eq("client_id", clientId);
      await sb2.from("staff").update({ is_default: true }).eq("id", inserted.id).eq("client_id", clientId);
    } else {
      const { data: anyDefault } = await sb2
        .from("staff")
        .select("id")
        .eq("client_id", clientId)
        .eq("is_default", true)
        .maybeSingle<{ id: string }>();

      if (!anyDefault) {
        await sb2.from("staff").update({ is_default: true }).eq("id", inserted.id).eq("client_id", clientId);
      }
    }

    revalidatePath(`/admin/${slug}/staff`);
    redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=added`);
  }

  async function updateStaff(formData: FormData) {
    "use server";

    const key = String(formData.get("key") || "");
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = String(formData.get("id") || "");
    const clientId = String(formData.get("client_id") || "");
    const name = String(formData.get("name") || "").trim();
    const is_active = formData.get("is_active") ? true : false;

    if (!id || !clientId || !name) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    const sb2 = supabaseServer();

    const { error } = await sb2.from("staff").update({ name, is_active }).eq("id", id).eq("client_id", clientId);

    if (error) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    revalidatePath(`/admin/${slug}/staff`);
    redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=saved`);
  }

  async function setDefaultStaff(formData: FormData) {
    "use server";

    const key = String(formData.get("key") || "");
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = String(formData.get("id") || "");
    const clientId = String(formData.get("client_id") || "");

    if (!id || !clientId) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    const sb2 = supabaseServer();

    const { data: st } = await sb2
      .from("staff")
      .select("id, client_id")
      .eq("id", id)
      .maybeSingle<{ id: string; client_id: string }>();

    if (!st || st.client_id !== clientId) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    await sb2.from("staff").update({ is_default: false }).eq("client_id", clientId);
    const { error } = await sb2.from("staff").update({ is_default: true }).eq("id", id).eq("client_id", clientId);

    if (error) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    revalidatePath(`/admin/${slug}/staff`);
    redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=default_set`);
  }

  async function toggleActiveStaff(formData: FormData) {
    "use server";

    const key = String(formData.get("key") || "");
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = String(formData.get("id") || "");
    const clientId = String(formData.get("client_id") || "");
    const nextActive = String(formData.get("next_active") || "") === "1";

    if (!id || !clientId) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    const sb2 = supabaseServer();

    const { error } = await sb2.from("staff").update({ is_active: nextActive }).eq("id", id).eq("client_id", clientId);

    if (error) redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=error`);

    revalidatePath(`/admin/${slug}/staff`);
    redirect(`/admin/${slug}/staff?key=${encodeURIComponent(key)}&toast=${nextActive ? "activated" : "deactivated"}`);
  }

  const staffList = staffRows || [];

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav
          slug={client.slug}
          businessName={`${client.business_name} — Staff`}
          keyParam={key}
          active="staff"
        />

        {toastText ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {toastText}
          </div>
        ) : null}

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <div className="font-semibold">Add staff</div>
            <div className="text-xs text-gray-500 mt-1">Create staff members (specialists) for bookings and schedule.</div>
          </div>

          <form action={addStaff} className="mt-5 grid md:grid-cols-6 gap-3">
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="client_id" value={client.id} />

            <label className="md:col-span-3 block space-y-1">
              <div className="text-sm text-gray-600">Name</div>
              <input
                name="name"
                placeholder="Пример: Мария Иванова"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                required
              />
            </label>

            <div className="md:col-span-3 rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
                <span className="text-sm font-semibold">Active</span>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" name="make_default" className="h-4 w-4" />
                <span className="text-sm font-semibold">Set as default</span>
              </label>

              <div className="text-xs text-gray-500">Default staff is used when booking does not specify staff.</div>
            </div>

            <div className="md:col-span-6">
              <button type="submit" className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
                Add
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Current staff</div>
              <div className="text-xs text-gray-500 mt-1">Deactivate instead of delete. Set exactly one Default.</div>
            </div>
            <div className="text-xs text-gray-500">{staffList.length ? `${staffList.length} staff` : "—"}</div>
          </div>

          {!staffList.length ? (
            <div className="mt-4 text-sm text-gray-600">No staff yet.</div>
          ) : (
            <div className="mt-6 space-y-4">
              {staffList.map((s, idx) => (
                <details
                  key={s.id}
                  className="group rounded-2xl border border-gray-200 bg-gray-50 shadow-sm overflow-hidden"
                  open={idx === 0}
                >
                  <summary className="cursor-pointer list-none select-none">
                    <div className="flex items-center justify-between gap-3 p-5 bg-white">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-[15px] font-semibold text-gray-900 truncate">{s.name}</div>

                          {s.is_default ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-black text-white">Default</span>
                          ) : null}

                          <span
                            className={[
                              "text-xs px-2 py-1 rounded-full border",
                              s.is_active
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-gray-200 bg-gray-100 text-gray-600",
                            ].join(" ")}
                          >
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          ID:{" "}
                          <code className="px-2 py-1 bg-gray-50 rounded border border-gray-200">
                            {s.id.slice(0, 8)}…
                          </code>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 group-open:hidden">Click to edit</div>
                      <div className="text-xs text-gray-500 hidden group-open:block">Click to collapse</div>
                    </div>
                  </summary>

                  <div className="p-5 border-t border-gray-200 space-y-4">
                    {/* UPDATE FORM */}
                    <form action={updateStaff} className="grid md:grid-cols-6 gap-3">
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="client_id" value={client.id} />

                      <label className="md:col-span-3 block space-y-1">
                        <div className="text-sm text-gray-600">Name</div>
                        <input
                          name="name"
                          defaultValue={s.name}
                          className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </label>

                      <div className="md:col-span-3 rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" name="is_active" defaultChecked={!!s.is_active} className="h-4 w-4" />
                          <span className="text-sm font-semibold">Active</span>
                        </label>

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
                        >
                          Save
                        </button>
                      </div>
                    </form>

                    {/* SET DEFAULT (separate form, not nested) */}
                    {!s.is_default ? (
                      <form action={setDefaultStaff} className="flex items-center gap-3">
                        <input type="hidden" name="key" value={key} />
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="client_id" value={client.id} />
                        <button type="submit" className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800">
                          Set default
                        </button>
                        <div className="text-xs text-gray-500">Makes this the default specialist for bookings.</div>
                      </form>
                    ) : (
                      <div className="text-xs text-gray-500">This staff is Default.</div>
                    )}

                    {/* TOGGLE ACTIVE (separate form) */}
                    <form action={toggleActiveStaff} className="flex items-center gap-3">
                      <input type="hidden" name="key" value={key} />
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="next_active" value={s.is_active ? "0" : "1"} />

                      <button
                        type="submit"
                        className={[
                          "px-4 py-2 rounded-lg font-semibold transition",
                          s.is_active ? "bg-gray-200 text-gray-900 hover:bg-gray-300" : "bg-green-600 text-white hover:bg-green-700",
                        ].join(" ")}
                      >
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>

                      {s.is_default && !s.is_active ? (
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Default staff is inactive. Booking may fail if it falls back to default.
                        </span>
                      ) : null}
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
