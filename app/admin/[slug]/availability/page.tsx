import { supabaseServer } from "@/lib/supabase-server";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ClientRow = {
  id: string;
  slug: string;
  business_name: string;
};

type StaffRow = {
  id: string;
  client_id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
};

type WorkingHoursRow = {
  id: string;
  client_id: string;
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_closed: boolean;
};

type TimeOffRow = {
  id: string;
  client_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

const WEEKDAYS = [
  { key: 1, label: "Понеделник" },
  { key: 2, label: "Вторник" },
  { key: 3, label: "Сряда" },
  { key: 4, label: "Четвъртък" },
  { key: 5, label: "Петък" },
  { key: 6, label: "Събота" },
  { key: 0, label: "Неделя" },
];

function toHHMM(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5); // "09:00:00" -> "09:00"
}

export default async function AdminAvailability(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; toast?: string }>;
}) {
  const [{ slug }, { key, toast }] = await Promise.all([props.params, props.searchParams]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  // ---- Load client
  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr) return <div className="p-8">Error loading client</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  // Snapshot primitives (TS-safe for server actions)
  const clientId = client.id;
  const businessName = client.business_name;
  const keyParam = key;

  // ---- Seed booking_settings
  await sb.from("booking_settings").upsert({ client_id: clientId }, { onConflict: "client_id" });

  // ---- Default staff
  let { data: staff, error: staffErr } = await sb
    .from("staff")
    .select("id, client_id, name, is_active, is_default")
    .eq("client_id", clientId)
    .eq("is_default", true)
    .maybeSingle<StaffRow>();

  if (staffErr) return <div className="p-8">Error loading staff</div>;

  if (!staff) {
    const { data: created, error: createErr } = await sb
      .from("staff")
      .insert({
        client_id: clientId,
        name: businessName,
        is_default: true,
      })
      .select("id, client_id, name, is_active, is_default")
      .single<StaffRow>();

    if (createErr || !created) return <div className="p-8">Error creating default staff</div>;
    staff = created;
  }

  const staffId = staff.id;

  // ---- Seed working hours if missing
  const { data: existingHours, error: existingErr } = await sb
    .from("staff_working_hours")
    .select("weekday")
    .eq("staff_id", staffId);

  if (existingErr) return <div className="p-8">Error loading working hours</div>;

  if (!existingHours || existingHours.length === 0) {
    const rows = WEEKDAYS.map((d) => ({
      client_id: clientId,
      staff_id: staffId,
      weekday: d.key,
      start_time: "09:00",
      end_time: "18:00",
      is_closed: d.key === 0 || d.key === 6, // Sat/Sun closed
    }));

    const { error: seedErr } = await sb.from("staff_working_hours").insert(rows);
    if (seedErr) return <div className="p-8">Error seeding working hours</div>;
  }

  // ---- Load working hours
  const { data: workingHours, error: whErr } = await sb
    .from("staff_working_hours")
    .select("id, client_id, staff_id, weekday, start_time, end_time, is_closed")
    .eq("staff_id", staffId)
    .order("weekday")
    .returns<WorkingHoursRow[]>();

  if (whErr) return <div className="p-8">Error loading working hours</div>;

  // ---- Load time off
  const { data: timeOff, error: toErr } = await sb
    .from("staff_time_off")
    .select("id, client_id, staff_id, start_at, end_at, reason")
    .eq("staff_id", staffId)
    .order("start_at")
    .returns<TimeOffRow[]>();

  if (toErr) return <div className="p-8">Error loading time off</div>;

  // ======================
  // SERVER ACTIONS
  // ======================
  async function saveHours(formData: FormData) {
    "use server";
    const sb = supabaseServer();

    for (const day of WEEKDAYS) {
      const closed = formData.get(`closed_${day.key}`) === "on";
      const start = (formData.get(`start_${day.key}`) as string) || "09:00";
      const end = (formData.get(`end_${day.key}`) as string) || "18:00";

      await sb.from("staff_working_hours").upsert(
        {
          client_id: clientId,
          staff_id: staffId,
          weekday: day.key,
          start_time: start,
          end_time: end,
          is_closed: closed,
        },
        { onConflict: "staff_id,weekday" }
      );
    }

    revalidatePath(`/admin/${slug}/availability`);
    redirect(`/admin/${slug}/availability?key=${keyParam}&toast=saved`);
  }

  async function addTimeOff(formData: FormData) {
    "use server";
    const sb = supabaseServer();

    const start_at = formData.get("start_at") as string | null;
    const end_at = formData.get("end_at") as string | null;
    const reason = (formData.get("reason") as string | null) || null;

    if (!start_at || !end_at) {
      redirect(`/admin/${slug}/availability?key=${keyParam}&toast=error`);
    }

    await sb.from("staff_time_off").insert({
      client_id: clientId,
      staff_id: staffId,
      start_at,
      end_at,
      reason,
    });

    revalidatePath(`/admin/${slug}/availability`);
    redirect(`/admin/${slug}/availability?key=${keyParam}&toast=added`);
  }

  async function deleteTimeOff(formData: FormData) {
    "use server";
    const sb = supabaseServer();

    const id = formData.get("id") as string | null;
    if (!id) {
      redirect(`/admin/${slug}/availability?key=${keyParam}&toast=error`);
    }

    await sb.from("staff_time_off").delete().eq("id", id);

    revalidatePath(`/admin/${slug}/availability`);
    redirect(`/admin/${slug}/availability?key=${keyParam}&toast=deleted`);
  }

  // ======================
  // RENDER
  // ======================
  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav slug={slug} businessName={businessName} keyParam={keyParam} active="dashboard" />

        <div>
          <h1 className="text-2xl font-semibold">Работно време</h1>
          <p className="text-sm text-gray-600">
            Настрой часовете по дни. Събота и неделя са почивни по подразбиране.
          </p>
        </div>

        {toast === "saved" && (
          <div className="bg-green-100 text-green-800 p-3 rounded">Работното време е запазено.</div>
        )}
        {toast === "added" && (
          <div className="bg-green-100 text-green-800 p-3 rounded">Периодът е блокиран.</div>
        )}
        {toast === "deleted" && (
          <div className="bg-green-100 text-green-800 p-3 rounded">Блокировката е премахната.</div>
        )}
        {toast === "error" && (
          <div className="bg-red-100 text-red-800 p-3 rounded">Възникна грешка. Моля опитай отново.</div>
        )}

        {/* WORKING HOURS */}
        <form action={saveHours} className="space-y-4 bg-white p-6 rounded shadow">
          <h2 className="text-lg font-semibold">Седмичен график</h2>

          {WEEKDAYS.map((day) => {
            const row = workingHours?.find((w) => w.weekday === day.key);
            const startDefault = toHHMM(row?.start_time, "09:00");
            const endDefault = toHHMM(row?.end_time, "18:00");

            return (
              <div key={day.key} className="flex items-center gap-4 flex-wrap">
                <div className="w-32 font-medium">{day.label}</div>

                <label className="flex items-center gap-2">
                  <input type="checkbox" name={`closed_${day.key}`} defaultChecked={row?.is_closed ?? false} />
                  Почивен
                </label>

                <input type="time" name={`start_${day.key}`} defaultValue={startDefault} className="border px-2 py-1 rounded" />
                <span>–</span>
                <input type="time" name={`end_${day.key}`} defaultValue={endDefault} className="border px-2 py-1 rounded" />
              </div>
            );
          })}

          <button className="bg-black text-white px-4 py-2 rounded">Запази</button>
        </form>

        {/* TIME OFF */}
        <div className="bg-white p-6 rounded shadow space-y-4">
          <h2 className="text-lg font-semibold">Блокирай период</h2>

          <form action={addTimeOff} className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">От</label>
              <input type="datetime-local" name="start_at" required className="border px-2 py-1 rounded" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-600">До</label>
              <input type="datetime-local" name="end_at" required className="border px-2 py-1 rounded" />
            </div>

            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-sm text-gray-600">Причина (по желание)</label>
              <input
                type="text"
                name="reason"
                placeholder="напр. личен ангажимент"
                className="border px-2 py-1 rounded"
              />
            </div>

            <div className="flex items-end">
              <button className="bg-black text-white px-4 py-2 rounded">Блокирай</button>
            </div>
          </form>

          {timeOff && timeOff.length > 0 ? (
            <ul className="space-y-2">
              {timeOff.map((t) => (
                <li key={t.id} className="flex justify-between items-start gap-4 border p-3 rounded">
                  <div>
                    <div className="font-medium">
                      {new Date(t.start_at).toLocaleString("bg-BG")} – {new Date(t.end_at).toLocaleString("bg-BG")}
                    </div>
                    {t.reason && <div className="text-sm text-gray-700">{t.reason}</div>}
                  </div>

                  <form action={deleteTimeOff}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-red-600 hover:underline">Изтрий</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-600">Няма блокирани периоди.</div>
          )}
        </div>
      </div>
    </main>
  );
}
