// app/admin/[slug]/bookings/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import AdminTopNav from "@/app/admin/_components/AdminTopNav";
import AdminToast from "@/app/admin/_components/AdminToast";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
};

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

export default async function AdminBookings(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string; toast?: string; status?: string }>;
}) {
  const [{ slug }, { key, toast, status }] = await Promise.all([props.params, props.searchParams]);

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

  // Filters
  const filter = (status || "pending").toLowerCase();
  const nowIso = new Date().toISOString();

  let q = sb
    .from("bookings")
    .select(
      "id, client_id, staff_id, service_id, start_at, end_at, status, customer_name, customer_phone, customer_email, customer_note, created_at, service:services(name)"
    )
    .eq("client_id", clientId);

  if (filter === "pending") {
    q = q.eq("status", "pending").order("start_at", { ascending: true });
  } else if (filter === "upcoming") {
    q = q.eq("status", "confirmed").gte("start_at", nowIso).order("start_at", { ascending: true });
  } else if (filter === "past") {
    q = q.eq("status", "confirmed").lt("start_at", nowIso).order("start_at", { ascending: false });
  } else if (filter === "cancelled") {
    q = q.eq("status", "cancelled").order("start_at", { ascending: false });
  } else {
    q = q.order("start_at", { ascending: false });
  }

  const { data: bookings, error: bookingsErr } = await q.returns<BookingRow[]>();
  const list = bookings || [];

  async function cancelBooking(formData: FormData) {
    "use server";
    const bookingId = String(formData.get("booking_id") || "");
    if (!bookingId) redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);

    const sb2 = supabaseServer();

    const { data: b } = await sb2
      .from("bookings")
      .select("id, client_id, status")
      .eq("id", bookingId)
      .maybeSingle<{ id: string; client_id: string; status: string }>();

    if (!b || b.client_id !== clientId) {
      redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);
    }

    if (b.status === "cancelled") {
      redirect(`/admin/${slug}/bookings?key=${key}&status=${filter}&toast=cancelled`);
    }

    const { error } = await sb2
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("client_id", clientId);

    if (error) {
      redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);
    }

    revalidatePath(`/admin/${slug}/bookings`);
    redirect(`/admin/${slug}/bookings?key=${key}&status=${filter}&toast=cancelled`);
  }

  async function confirmBooking(formData: FormData) {
    "use server";
    const bookingId = String(formData.get("booking_id") || "");
    if (!bookingId) redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);

    const sb2 = supabaseServer();

    const { data: b } = await sb2
      .from("bookings")
      .select("id, client_id, status")
      .eq("id", bookingId)
      .maybeSingle<{ id: string; client_id: string; status: string }>();

    if (!b || b.client_id !== clientId) {
      redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);
    }

    // If already confirmed -> just show toast
    if (b.status === "confirmed") {
      redirect(`/admin/${slug}/bookings?key=${key}&status=${filter}&toast=confirmed`);
    }

    // Do NOT allow confirm from cancelled
    if (b.status === "cancelled") {
      redirect(`/admin/${slug}/bookings?key=${key}&status=${filter}&toast=error`);
    }

    // Allow confirm only from pending
    const { error } = await sb2
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId)
      .eq("client_id", clientId)
      .eq("status", "pending");

    if (error) {
      redirect(`/admin/${slug}/bookings?key=${key}&toast=error`);
    }

    revalidatePath(`/admin/${slug}/bookings`);
    redirect(`/admin/${slug}/bookings?key=${key}&status=${filter}&toast=confirmed`);
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminTopNav slug={slug} businessName={client.business_name} keyParam={key} active="bookings" />

        {/* унифициран toast компонент */}
        <AdminToast toast={toast} />

        <div className="bg-white p-6 rounded shadow space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Резервации</h1>
              <div className="text-sm text-gray-600">Pending → Confirm / Cancel (soft cancel).</div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { id: "pending", label: "Чакащи" },
                { id: "upcoming", label: "Предстоящи" },
                { id: "past", label: "Минали" },
                { id: "cancelled", label: "Отказани" },
              ].map((t) => {
                const isActive = filter === t.id;
                const href = `/admin/${slug}/bookings?key=${key}&status=${t.id}`;
                return (
                  <a
                    key={t.id}
                    href={href}
                    className={[
                      "px-3 py-2 rounded border text-sm",
                      isActive ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {t.label}
                  </a>
                );
              })}
            </div>
          </div>

          {bookingsErr && (
            <div className="bg-red-100 text-red-800 p-3 rounded">Грешка при зареждане на резервациите.</div>
          )}

          {list.length === 0 ? (
            <div className="text-gray-700">Няма резервации за този филтър.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-3">Кога</th>
                    <th className="py-2 pr-3">Услуга</th>
                    <th className="py-2 pr-3">Клиент</th>
                    <th className="py-2 pr-3">Контакти</th>
                    <th className="py-2 pr-3">Статус</th>
                    <th className="py-2 pr-3">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => {
                    const isCancelled = b.status === "cancelled";
                    const isPending = b.status === "pending";
                    const when = fmtDT(b.start_at, "Europe/Sofia");
                    const serviceName = b.service?.name || "—";

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
                                : isPending
                                ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                                : "bg-green-50 text-green-700 border-green-200",
                            ].join(" ")}
                          >
                            {b.status}
                          </span>
                        </td>

                        <td className="py-3 pr-3">
                          {isCancelled ? (
                            <span className="text-gray-500">—</span>
                          ) : isPending ? (
                            <div className="flex gap-2 flex-wrap">
                              <form action={confirmBooking}>
                                <input type="hidden" name="booking_id" value={b.id} />
                                <button
                                  type="submit"
                                  className="px-3 py-2 rounded bg-green-600 text-white text-sm hover:opacity-90"
                                >
                                  Confirm
                                </button>
                              </form>

                              <form action={cancelBooking}>
                                <input type="hidden" name="booking_id" value={b.id} />
                                <button
                                  type="submit"
                                  className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90"
                                >
                                  Cancel
                                </button>
                              </form>
                            </div>
                          ) : (
                            <form action={cancelBooking}>
                              <input type="hidden" name="booking_id" value={b.id} />
                              <button
                                type="submit"
                                className="px-3 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90"
                              >
                                Cancel
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Cancel е soft: сменя <code>status</code> на <code>cancelled</code>, без да трие реда. Confirm сменя на{" "}
            <code>confirmed</code>.
          </div>
        </div>
      </div>
    </main>
  );
}
