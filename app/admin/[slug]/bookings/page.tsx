// app/admin/[slug]/bookings/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import AdminToast from "@/app/admin/_components/AdminToast";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DateTime } from "luxon";

import BookingsCalendar, { type CalendarEvent } from "./_components/BookingsCalendar";
import BookingsPrimaryNav from "./_components/BookingsPrimaryNav";
import BookingsTableControls from "./_components/BookingsTableControls";
import BookingsRescheduleButton from "./_components/BookingsRescheduleButton";

import "./_components/BookingsToolbar.css";

type ClientRow = { id: string; slug: string; business_name: string };

type BookingRow = {
  id: string;
  client_id: string;
  staff_id: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "cancelled" | string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_note: string | null;
  created_at: string;
  service?: { name: string } | null;
  staff?: { name: string } | null;
};

type TimeOffRow = {
  id: string;
  client_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  staff?: { name: string } | null;
};

type StaffRow = { id: string; name: string; is_active: boolean; is_default: boolean };

function fmtDT(iso: string, timeZone = "Europe/Sofia") {
  const dt = new Date(iso);

  const time = new Intl.DateTimeFormat("bg-BG", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);

  const date = new Intl.DateTimeFormat("bg-BG", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "long",
  }).format(dt);

  return `${time}, ${date}`;
}

function buildBaseReturnTo({
  slug,
  key,
  view,
  mode,
  date,
  staff,
  status,
}: {
  slug: string;
  key: string;
  view: string;
  mode?: string;
  date?: string;
  staff?: string;
  status?: string;
}) {
  const sp = new URLSearchParams();
  sp.set("key", key);
  sp.set("view", view || "table");

  if (view === "calendar") {
    sp.set("mode", (mode || "week").toLowerCase());
    if (date) sp.set("date", date);
    if (staff) sp.set("staff", staff);
  } else {
    sp.set("status", (status || "pending").toLowerCase());
    if (staff) sp.set("staff", staff);
  }

  return `/admin/${slug}/bookings?${sp.toString()}`;
}

function normWeekMonday(dateISO: string, tz: string) {
  const d = DateTime.fromISO(dateISO, { zone: tz }).startOf("day");
  const monday = d.minus({ days: (d.weekday + 6) % 7 }).startOf("day");
  return monday.toISODate()!;
}

export default async function AdminBookings(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    key?: string;
    toast?: string;
    status?: string;
    view?: string;
    mode?: string;
    date?: string;
    staff?: string;
  }>;
}) {
  const [{ slug }, { key, toast, status, view, mode, date, staff }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr || !client) {
    return <div className="p-8">Client not found</div>;
  }

  const clientId = client.id;
  const tz = "Europe/Sofia";

  const activeView = (view || "table").toLowerCase() === "calendar" ? "calendar" : "table";
  const activeMode = ((mode || "week").toLowerCase() === "day" ? "day" : "week") as "week" | "day";
  const activeStaff = staff || "all";
  const filter = (status || "pending").toLowerCase();

  const safeCalendarDate =
    (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : DateTime.now().setZone(tz).toISODate()!)!;

  const normalizedCalendarDate = activeMode === "week" ? normWeekMonday(safeCalendarDate, tz) : safeCalendarDate;

  const tableHref = `/admin/${slug}/bookings?key=${key}&view=table&status=${encodeURIComponent(
    filter || "pending"
  )}&staff=${encodeURIComponent(activeStaff)}`;
  const calendarHref = `/admin/${slug}/bookings?key=${key}&view=calendar&mode=${activeMode}&date=${normalizedCalendarDate}&staff=${encodeURIComponent(
    activeStaff
  )}`;

  const returnToBase = buildBaseReturnTo({
    slug,
    key,
    view: activeView,
    mode: activeMode,
    date: normalizedCalendarDate,
    staff: activeStaff,
    status: filter,
  });

  async function cancelBooking(formData: FormData) {
    "use server";
    const bookingId = String(formData.get("booking_id") || "");
    const returnTo = String(formData.get("return_to") || returnToBase);

    if (!bookingId) redirect(`${returnTo}&toast=error`);

    const sb2 = supabaseServer();

    const { data: b } = await sb2
      .from("bookings")
      .select("id, client_id, status")
      .eq("id", bookingId)
      .maybeSingle<{ id: string; client_id: string; status: string }>();

    if (!b || b.client_id !== clientId) redirect(`${returnTo}&toast=error`);
    if (b.status === "cancelled") redirect(`${returnTo}&toast=cancelled`);

    const { error } = await sb2
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("client_id", clientId);

    if (error) redirect(`${returnTo}&toast=error`);

    revalidatePath(`/admin/${slug}/bookings`);
    redirect(`${returnTo}&toast=cancelled`);
  }

  async function confirmBooking(formData: FormData) {
    "use server";
    const bookingId = String(formData.get("booking_id") || "");
    const returnTo = String(formData.get("return_to") || returnToBase);

    if (!bookingId) redirect(`${returnTo}&toast=error`);

    const sb2 = supabaseServer();

    const { data: b } = await sb2
      .from("bookings")
      .select("id, client_id, status")
      .eq("id", bookingId)
      .maybeSingle<{ id: string; client_id: string; status: string }>();

    if (!b || b.client_id !== clientId) redirect(`${returnTo}&toast=error`);
    if (b.status === "confirmed") redirect(`${returnTo}&toast=confirmed`);
    if (b.status === "cancelled") redirect(`${returnTo}&toast=error`);

    const { error } = await sb2
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .eq("client_id", clientId)
      .eq("status", "pending");

    if (error) redirect(`${returnTo}&toast=error`);

    revalidatePath(`/admin/${slug}/bookings`);
    redirect(`${returnTo}&toast=confirmed`);
  }

  // staff options
  const { data: staffRows } = await sb
    .from("staff")
    .select("id, name, is_active, is_default")
    .eq("client_id", clientId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })
    .returns<StaffRow[]>();

  const staffOptions = (staffRows || []).filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name }));

  // ---------------- CALENDAR VIEW ----------------
  if (activeView === "calendar") {
    const center = DateTime.fromISO(normalizedCalendarDate, { zone: tz }).startOf("day");
    const rangeStart = center;
    const rangeEnd = activeMode === "day" ? rangeStart.plus({ days: 1 }) : rangeStart.plus({ days: 7 });

    const fromIso = rangeStart.toUTC().toISO()!;
    const toIso = rangeEnd.toUTC().toISO()!;

    let qb = sb
      .from("bookings")
      .select(
        "id, client_id, staff_id, service_id, start_at, end_at, status, customer_name, customer_phone, customer_email, customer_note, created_at, service:services(name), staff:staff(name)"
      )
      .eq("client_id", clientId)
      .gte("start_at", fromIso)
      .lt("start_at", toIso);

    if (activeStaff !== "all") qb = qb.eq("staff_id", activeStaff);

    const { data: bookings } = await qb.order("start_at", { ascending: true }).returns<BookingRow[]>();

    let qt = sb
      .from("staff_time_off")
      .select("id, client_id, staff_id, start_at, end_at, reason, staff:staff(name)")
      .eq("client_id", clientId)
      .gte("start_at", fromIso)
      .lt("start_at", toIso);

    if (activeStaff !== "all") qt = qt.eq("staff_id", activeStaff);

    const { data: timeOff } = await qt.order("start_at", { ascending: true }).returns<TimeOffRow[]>();

    const initialEvents: CalendarEvent[] = [
      ...(timeOff || []).map((t) => ({
        id: `timeoff:${t.id}`,
        title: t.reason ? `Blocked: ${t.reason}` : "Blocked",
        start: t.start_at,
        end: t.end_at,
        display: "background" as const,
        extendedProps: {
          type: "timeoff" as const,
          timeoff: { reason: t.reason, staff_name: t.staff?.name || undefined },
        },
      })),
      ...(bookings || []).map((b) => ({
        id: `booking:${b.id}`,
        title: b.service?.name || "Услуга",
        start: b.start_at,
        end: b.end_at,
        extendedProps: {
          type: "booking" as const,
          status: b.status,
          booking: {
            id: b.id,
            status: b.status,
            start_at: b.start_at,
            end_at: b.end_at,
            customer_name: b.customer_name,
            customer_phone: b.customer_phone,
            customer_email: b.customer_email,
            customer_note: b.customer_note,
            service_name: b.service?.name || "—",
            staff_name: b.staff?.name || undefined,
          },
        },
      })),
    ];

    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-6xl mx-auto space-y-6">
          <AdminTopNav slug={slug} businessName={client.business_name} keyParam={key} active="bookings" />
          <AdminToast toast={toast} />

          <div className="bg-white p-6 rounded shadow space-y-4">
            <div className="bookings-headbar">
              <div className="left">
                <div className="title">Резервации</div>
                <div className="subtitle">Преглед и управление на резервации.</div>
              </div>

              <BookingsPrimaryNav tableHref={tableHref} calendarHref={calendarHref} activeView="calendar" />
            </div>

            <BookingsCalendar
              slug={slug}
              keyParam={key}
              mode={activeMode}
              date={normalizedCalendarDate}
              staff={activeStaff}
              initialEvents={initialEvents}
              staffOptions={staffOptions}
              returnToBase={returnToBase}
              confirmAction={confirmBooking}
              cancelAction={cancelBooking}
            />
          </div>
        </div>
      </main>
    );
  }

  // ---------------- TABLE VIEW ----------------
  const nowIso = DateTime.now().setZone(tz).toUTC().toISO()!;

  function isPastUnaccepted(b: BookingRow) {
    if (b.status !== "pending") return false;
    const startUtc = DateTime.fromISO(b.start_at).toUTC();
    const nowUtc = DateTime.fromISO(nowIso).toUTC();
    return startUtc < nowUtc;
  }

  function isPast(b: BookingRow) {
    const startUtc = DateTime.fromISO(b.start_at).toUTC();
    const nowUtc = DateTime.fromISO(nowIso).toUTC();
    return startUtc < nowUtc;
  }

  function statusLabel(b: BookingRow) {
    if (isPastUnaccepted(b)) return "неприета";
    if (b.status === "pending") return "чакаща";
    if (b.status === "confirmed") return "потвърдена";
    if (b.status === "cancelled") return "отказана";
    return String(b.status || "—");
  }

  let q = sb
    .from("bookings")
    .select(
      "id, client_id, staff_id, service_id, start_at, end_at, status, customer_name, customer_phone, customer_email, customer_note, created_at, service:services(name), staff:staff(name)"
    )
    .eq("client_id", clientId);

  if (activeStaff !== "all") q = q.eq("staff_id", activeStaff);

  if (filter === "pending") {
    q = q.eq("status", "pending").gte("end_at", nowIso).order("start_at", { ascending: true });
  } else if (filter === "upcoming") {
    q = q.eq("status", "confirmed").gte("start_at", nowIso).order("start_at", { ascending: true });
  } else if (filter === "past") {
    q = q.in("status", ["confirmed", "pending"]).lt("start_at", nowIso).order("start_at", { ascending: false });
  } else if (filter === "cancelled") {
    q = q.eq("status", "cancelled").order("start_at", { ascending: false });
  } else {
    q = q.order("start_at", { ascending: false });
  }

  const { data: bookings, error: bookingsErr } = await q.returns<BookingRow[]>();
  const list = bookings || [];

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav slug={slug} businessName={client.business_name} keyParam={key} active="bookings" />
        <AdminToast toast={toast} />

        <div className="bg-white p-6 rounded shadow space-y-4">
          <div className="bookings-headbar">
            <div className="left">
              <div className="title">Резервации</div>
              <div className="subtitle">Преглед и управление на резервации.</div>
            </div>

            <BookingsPrimaryNav tableHref={tableHref} calendarHref={calendarHref} activeView="table" />
          </div>

          <BookingsTableControls slug={slug} keyParam={key} activeStatus={filter} staff={activeStaff} staffOptions={staffOptions} />

          {bookingsErr ? <div className="bg-red-100 text-red-800 p-3 rounded">Грешка при зареждане.</div> : null}

          {list.length === 0 ? (
            <div className="text-gray-700">Няма резервации за този филтър.</div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="bookings-table-mobile">
                {list.map((b) => {
                  const when = fmtDT(b.start_at, tz);
                  const serviceName = b.service?.name || "—";
                  const unaccepted = isPastUnaccepted(b);
                  const label = statusLabel(b);

                  return (
                    <div key={b.id} className="bookings-card">
                      <div className="bookings-card-top">
                        <div className="bookings-card-when">{when}</div>
                        <div className={`bookings-chip bookings-chip--${String(b.status || "").toLowerCase()}`}>{label}</div>
                      </div>

                      <div className="bookings-card-title">{serviceName}</div>

                      {activeStaff === "all" ? <div className="bookings-card-sub">Специалист: {b.staff?.name || "—"}</div> : null}

                      <div className="bookings-card-sub">{b.customer_name}</div>
                      <div className="bookings-card-sub">{b.customer_phone}</div>
                      <div className="bookings-card-sub">{b.customer_email}</div>

                      {b.customer_note ? (
                        <div className="bookings-card-note">
                          <span>Бележка:</span> {b.customer_note}
                        </div>
                      ) : null}

                      <div className="bookings-card-actions">
                        {isPast(b) ? null : (
                          <>
                            {!unaccepted && b.status !== "cancelled" ? (
                              <BookingsRescheduleButton
                                slug={slug}
                                keyParam={key}
                                bookingId={b.id}
                                startAtIso={b.start_at}
                                status={b.status}
                              />
                            ) : null}

                            {b.status === "pending" && !unaccepted ? (
                              <>
                                <form action={confirmBooking}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <input type="hidden" name="return_to" value={returnToBase} />
                                  <button type="submit" className="px-3 py-2 rounded bg-green-600 text-white text-sm hover:opacity-90">
                                    Confirm
                                  </button>
                                </form>

                                <form action={cancelBooking}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <input type="hidden" name="return_to" value={returnToBase} />
                                  <button type="submit" className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90">
                                    Cancel
                                  </button>
                                </form>
                              </>
                            ) : b.status !== "cancelled" ? (
                              <form action={cancelBooking}>
                                <input type="hidden" name="booking_id" value={b.id} />
                                <input type="hidden" name="return_to" value={returnToBase} />
                                <button type="submit" className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90">
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <span className="text-gray-500 text-sm">Отказана.</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="bookings-table-desktop overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-2 pr-3">Кога</th>
                      <th className="py-2 pr-3">Услуга</th>
                      {activeStaff === "all" ? <th className="py-2 pr-3">Специалист</th> : null}
                      <th className="py-2 pr-3">Клиент</th>
                      <th className="py-2 pr-3">Контакти</th>
                      <th className="py-2 pr-3">Статус</th>
                      <th className="py-2 pr-3">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((b) => {
                      const isCancelled = b.status === "cancelled";
                      const unaccepted = isPastUnaccepted(b);
                      const when = fmtDT(b.start_at, tz);
                      const serviceName = b.service?.name || "—";
                      const label = statusLabel(b);

                      return (
                        <tr key={b.id} className="border-b align-top">
                          <td className="py-3 pr-3 whitespace-nowrap">{when}</td>

                          <td className="py-3 pr-3">
                            <div className="font-medium">{serviceName}</div>
                            {b.customer_note ? (
                              <div className="text-gray-600 mt-1">
                                <span className="font-medium">Бележка:</span> {b.customer_note}
                              </div>
                            ) : null}
                          </td>

                          {activeStaff === "all" ? (
                            <td className="py-3 pr-3">
                              <div className="font-medium">{b.staff?.name || "—"}</div>
                            </td>
                          ) : null}

                          <td className="py-3 pr-3">{b.customer_name}</td>

                          <td className="py-3 pr-3">
                            <div>{b.customer_phone}</div>
                            <div className="text-gray-600">{b.customer_email}</div>
                          </td>

                          <td className="py-3 pr-3">
                            <span
                              className={[
                                "inline-block px-2 py-1 rounded text-xs border",
                                isCancelled
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : unaccepted
                                  ? "bg-gray-50 text-gray-700 border-gray-200"
                                  : b.status === "pending"
                                  ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                                  : "bg-green-50 text-green-700 border-green-200",
                              ].join(" ")}
                            >
                              {label}
                            </span>
                          </td>

                          <td className="py-3 pr-3">
                            {isPast(b) ? (
                              <span className="text-gray-400 text-sm">—</span>
                            ) : isCancelled ? (
                              <span className="text-gray-500 text-sm">—</span>
                            ) : b.status === "pending" && !unaccepted ? (
                              <div className="bookings-actions-row">
                                <BookingsRescheduleButton
                                  slug={slug}
                                  keyParam={key}
                                  bookingId={b.id}
                                  startAtIso={b.start_at}
                                  status={b.status}
                                />

                                <form action={confirmBooking}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <input type="hidden" name="return_to" value={returnToBase} />
                                  <button className="px-3 py-2 rounded bg-green-600 text-white text-sm">Confirm</button>
                                </form>

                                <form action={cancelBooking}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <input type="hidden" name="return_to" value={returnToBase} />
                                  <button className="px-3 py-2 rounded bg-red-600 text-white text-sm">Cancel</button>
                                </form>
                              </div>
                            ) : b.status === "confirmed" ? (
                              <div className="bookings-actions-row">
                                <BookingsRescheduleButton
                                  slug={slug}
                                  keyParam={key}
                                  bookingId={b.id}
                                  startAtIso={b.start_at}
                                  status={b.status}
                                />

                                <form action={cancelBooking}>
                                  <input type="hidden" name="booking_id" value={b.id} />
                                  <input type="hidden" name="return_to" value={returnToBase} />
                                  <button className="px-3 py-2 rounded bg-red-600 text-white text-sm">Cancel</button>
                                </form>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="text-xs text-gray-500">
            Чакащи показва само бъдещи заявки. Минали включва потвърдени + неприети (pending, но вече минали). Cancel е soft: сменя{" "}
            <code>status</code> на <code>cancelled</code>.
          </div>
        </div>
      </div>
    </main>
  );
}
