// app/api/admin/[slug]/bookings/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { DateTime } from "luxon";

export const dynamic = "force-dynamic";

type ClientRow = { id: string };

type BookingRow = {
  id: string;
  client_id: string;
  staff_id: string;
  start_at: string;
  end_at: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_note: string | null;
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

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  display?: "auto" | "background";
  extendedProps: {
    type: "booking" | "timeoff";
    status?: string;
    booking?: {
      id: string;
      status: string;
      start_at: string;
      end_at: string;
      customer_name: string;
      customer_phone: string;
      customer_email: string;
      customer_note: string | null;
      service_name: string;
      staff_name?: string;
    };
    timeoff?: {
      reason: string | null;
      staff_name?: string;
    };
  };
};

const TZ = "Europe/Sofia";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normWeekMonday(dateISO: string, tz: string) {
  const d = DateTime.fromISO(dateISO, { zone: tz }).startOf("day");
  return d.minus({ days: (d.weekday + 6) % 7 }).startOf("day").toISODate()!;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  const modeRaw = (url.searchParams.get("mode") || "week").toLowerCase();
  const mode: "week" | "day" = modeRaw === "day" ? "day" : "week";
  const staff = url.searchParams.get("staff") || "all";

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (staff !== "all" && !UUID_RE.test(staff)) {
    return NextResponse.json({ error: "Invalid staff" }, { status: 400 });
  }

  const date = url.searchParams.get("date") || "";
  const safeDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : DateTime.now().setZone(TZ).toISODate()!;

  const normalizedDate = mode === "week" ? normWeekMonday(safeDate, TZ) : safeDate;

  const sb = supabaseServer();

  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const center = DateTime.fromISO(normalizedDate, { zone: TZ }).startOf("day");
  const rangeStart = center;
  const rangeEnd = mode === "day" ? rangeStart.plus({ days: 1 }) : rangeStart.plus({ days: 7 });

  const fromIso = rangeStart.toUTC().toISO()!;
  const toIso = rangeEnd.toUTC().toISO()!;

  // Overlap logic: start_at < toIso AND end_at > fromIso
  let qb = sb
    .from("bookings")
    .select(
      "id, client_id, staff_id, start_at, end_at, status, customer_name, customer_phone, customer_email, customer_note, service:services(name), staff:staff(name)"
    )
    .eq("client_id", client.id)
    .lt("start_at", toIso)
    .gt("end_at", fromIso);

  if (staff !== "all") qb = qb.eq("staff_id", staff);

  const { data: bookings, error: bookingsErr } = await qb
    .order("start_at", { ascending: true })
    .returns<BookingRow[]>();

  let qt = sb
    .from("staff_time_off")
    .select("id, client_id, staff_id, start_at, end_at, reason, staff:staff(name)")
    .eq("client_id", client.id)
    .lt("start_at", toIso)
    .gt("end_at", fromIso);

  if (staff !== "all") qt = qt.eq("staff_id", staff);

  const { data: timeOff, error: timeOffErr } = await qt
    .order("start_at", { ascending: true })
    .returns<TimeOffRow[]>();

  if (bookingsErr || timeOffErr) {
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }

  const events: CalendarEvent[] = [
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

  return NextResponse.json(
    { events, mode, date: normalizedDate, staff },
    { headers: { "Cache-Control": "no-store" } }
  );
}
