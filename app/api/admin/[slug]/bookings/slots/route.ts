// app/api/admin/[slug]/bookings/slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { DateTime } from "luxon";

export const dynamic = "force-dynamic";

type ClientRow = { id: string };
type BookingRow = { id: string; client_id: string; staff_id: string; service_id: string; status: string };
type ServiceRow = { duration_min: number | null };
type SettingsRow = { timezone: string | null; slot_step_minutes: number | null };

type WorkingHoursRow = { weekday: number; start_time: string; end_time: string; is_closed: boolean };
type TimeOffRow = { start_at: string; end_at: string };
type BlockRow = { id: string; start_at: string; end_at: string; status: string };

function weekdayKeyForDate(dateYMD: string, timeZone: string): number {
  const [Y, M, D] = dateYMD.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));
  const w = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(utcNoon);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function makeUtcFromLocal(dateYMD: string, hhmm: string, timeZone: string): Date {
  const [Y, M, D] = dateYMD.split("-").map((x) => parseInt(x, 10));
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));

  // Luxon approach for correct tz->utc conversion
  const local = DateTime.fromObject({ year: Y, month: M, day: D, hour: h, minute: m }, { zone: timeZone });
  return new Date(local.toUTC().toISO()!);
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);

  const key = url.searchParams.get("key") || "";
  const bookingId = url.searchParams.get("bookingId") || "";
  const date = url.searchParams.get("date") || "";

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  if (!bookingId) {
    return NextResponse.json({ ok: false, reason: "invalid", message: "Missing bookingId" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, reason: "invalid", message: "Missing/invalid date" }, { status: 400 });
  }

  const sb = supabaseServer();

  // 1) Resolve client
  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (clientErr || !client) {
    return NextResponse.json({ ok: false, reason: "not_found", message: "Client not found" }, { status: 404 });
  }

  // 2) Load booking
  const { data: booking, error: bErr } = await sb
    .from("bookings")
    .select("id, client_id, staff_id, service_id, status")
    .eq("id", bookingId)
    .maybeSingle<BookingRow>();

  if (bErr || !booking || booking.client_id !== client.id) {
    return NextResponse.json({ ok: false, reason: "not_found", message: "Booking not found" }, { status: 404 });
  }

  // Optional: don’t offer slots for cancelled bookings
  if ((booking.status || "").toLowerCase() === "cancelled") {
    return NextResponse.json({ ok: true, slots: [], timeZone: "Europe/Sofia", date }, { status: 200 });
  }

  // 3) Settings (timezone + step)
  const { data: settings } = await sb
    .from("booking_settings")
    .select("timezone, slot_step_minutes")
    .eq("client_id", client.id)
    .maybeSingle<SettingsRow>();

  const timeZone = settings?.timezone || "Europe/Sofia";
  const slotStepMinutes = settings?.slot_step_minutes ?? 15;

  // 4) Service duration
  const { data: svc } = await sb
    .from("services")
    .select("duration_min")
    .eq("id", booking.service_id)
    .eq("client_id", client.id)
    .maybeSingle<ServiceRow>();

  const durationMinutes = svc?.duration_min || 60;

  // 5) Working hours for that weekday
  const weekday = weekdayKeyForDate(date, timeZone);

  const { data: wh } = await sb
    .from("staff_working_hours")
    .select("weekday, start_time, end_time, is_closed")
    .eq("client_id", client.id)
    .eq("staff_id", booking.staff_id)
    .eq("weekday", weekday)
    .maybeSingle<WorkingHoursRow>();

  if (!wh || wh.is_closed) {
    return NextResponse.json({ ok: true, slots: [], timeZone, date }, { status: 200 });
  }

  const startHHMM = String(wh.start_time || "").slice(0, 5);
  const endHHMM = String(wh.end_time || "").slice(0, 5);

  const windowStartUtc = makeUtcFromLocal(date, startHHMM, timeZone);
  const windowEndUtc = makeUtcFromLocal(date, endHHMM, timeZone);

  // Day range for overlap query
  const dayStartUtc = makeUtcFromLocal(date, "00:00", timeZone);
  const dayEndUtc = makeUtcFromLocal(date, "23:59", timeZone);

  // 6) Blocks: time off + other bookings (exclude the booking itself)
  const { data: timeOff } = await sb
    .from("staff_time_off")
    .select("start_at, end_at")
    .eq("staff_id", booking.staff_id)
    .gt("end_at", dayStartUtc.toISOString())
    .lt("start_at", dayEndUtc.toISOString())
    .returns<TimeOffRow[]>();

  const { data: bookings } = await sb
    .from("bookings")
    .select("id, start_at, end_at, status")
    .eq("staff_id", booking.staff_id)
    .in("status", ["confirmed", "pending"])
    .neq("id", booking.id) // IMPORTANT: exclude current booking
    .gt("end_at", dayStartUtc.toISOString())
    .lt("start_at", dayEndUtc.toISOString())
    .returns<BlockRow[]>();

  const blocks: Array<{ start: Date; end: Date }> = [];
  for (const t of timeOff || []) blocks.push({ start: new Date(t.start_at), end: new Date(t.end_at) });
  for (const b of bookings || []) blocks.push({ start: new Date(b.start_at), end: new Date(b.end_at) });

  const nowUtc = new Date();

  const slots: Array<{ startIso: string; endIso: string; label: string }> = [];

  for (
    let cur = new Date(windowStartUtc);
    addMinutes(cur, durationMinutes) <= windowEndUtc;
    cur = addMinutes(cur, slotStepMinutes)
  ) {
    const slotStart = cur;
    const slotEnd = addMinutes(slotStart, durationMinutes);

    // Don’t offer past slots (admin UX)
    if (slotStart < nowUtc) continue;

    let ok = true;
    for (const bl of blocks) {
      if (overlaps(slotStart, slotEnd, bl.start, bl.end)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const label = DateTime.fromJSDate(slotStart, { zone: "utc" }).setZone(timeZone).toFormat("HH:mm");

    slots.push({
      startIso: slotStart.toISOString(),
      endIso: slotEnd.toISOString(),
      label,
    });
  }

  return NextResponse.json({ ok: true, date, timeZone, slotStepMinutes, durationMinutes, slots }, { status: 200 });
}
