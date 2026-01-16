// app\api\admin\[slug]\bookings\reschedule\route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { DateTime } from "luxon";

export const dynamic = "force-dynamic";

type ClientRow = { id: string };

type BookingRow = {
  id: string;
  client_id: string;
  staff_id: string;
  service_id: string;
  status: string;
};

function addMinutesISO(startIsoUtc: string, minutes: number) {
  const start = DateTime.fromISO(startIsoUtc, { zone: "utc" });
  return start.plus({ minutes }).toISO()!;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";

  if (!key || key !== process.env.ADMIN_KEY) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const bookingId = String(body?.bookingId || "");
  const newStartIso = String(body?.newStartIso || "");

  if (!bookingId || !newStartIso) {
    return NextResponse.json(
      { ok: false, reason: "invalid", message: "Missing bookingId/newStartIso" },
      { status: 400 }
    );
  }

  // Validate date
  const startDt = DateTime.fromISO(newStartIso, { zone: "utc" });
  if (!startDt.isValid) {
    return NextResponse.json({ ok: false, reason: "invalid", message: "Invalid newStartIso" }, { status: 400 });
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

  if ((booking.status || "").toLowerCase() === "cancelled") {
    return NextResponse.json({ ok: false, reason: "invalid", message: "Cannot move cancelled booking" }, { status: 400 });
  }

  // 3) Get duration from service
  const { data: svc } = await sb
    .from("services")
    .select("duration_min")
    .eq("id", booking.service_id)
    .eq("client_id", client.id)
    .maybeSingle<{ duration_min: number | null }>();

  const durationMinutes = svc?.duration_min || 60;
  const newEndIso = addMinutesISO(newStartIso, durationMinutes);

  // 4) Attempt update (DB overlap constraint enforces availability)
  const { error } = await sb
    .from("bookings")
    .update({ start_at: newStartIso, end_at: newEndIso })
    .eq("id", booking.id)
    .eq("client_id", client.id);

  if (error) {
    const msg = (error.message || "").toLowerCase();
    const code = (error as any).code as string | undefined;

    // Exclusion constraint violation -> slot taken
    if (code === "23P01" || msg.includes("bookings_no_overlap_per_staff")) {
      return NextResponse.json(
        { ok: false, reason: "slot_taken", message: "Slot is taken" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, reason: "server_error", message: "Update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
