// app/[slug]/book/actions.ts
"use server";

import { supabaseServer } from "@/lib/supabase-server";
import { sendMail } from "@/lib/mailer";
import crypto from "node:crypto";

/**
 * Debug logging (enable with DEBUG_BOOKING=1 in .env, only in non-prod).
 */
const DEBUG = process.env.NODE_ENV !== "production" && process.env.DEBUG_BOOKING === "1";
const dbg = (...a: any[]) => (DEBUG ? console.log(...a) : undefined);

/**
 * Time helpers (Europe/Sofia by default).
 * We generate UTC Date objects from a local Sofia date/time.
 */
function parseHHMM(hhmm: string) {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return { h, m };
}

function toHHMM(date: Date, timeZone = "Europe/Sofia") {
  const fmt = new Intl.DateTimeFormat("bg-BG", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date);
}

// Returns offset minutes for a timezone at a given UTC date.
function getTimeZoneOffsetMinutes(timeZone: string, utcDate: Date): number {
  const getTzName = (timeZoneName: "shortOffset" | "short") => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(utcDate);

    return parts.find((p) => p.type === "timeZoneName")?.value || "GMT+0";
  };

  let tz = "GMT+0";
  try {
    tz = getTzName("shortOffset"); // Node 20+ usually
  } catch {
    tz = getTzName("short"); // fallback
  }

  const m = tz.match(/([+-]\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return 0;

  const hours = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;

  return hours * 60 + (hours >= 0 ? mins : -mins);
}

// Build a UTC Date from local date + time ("YYYY-MM-DD", "HH:MM") in a timezone
function makeUtcFromLocal(dateYMD: string, hhmm: string, timeZone = "Europe/Sofia"): Date {
  const [Y, M, D] = dateYMD.split("-").map((x) => parseInt(x, 10));
  const { h, m } = parseHHMM(hhmm);

  const approxUtc = new Date(Date.UTC(Y, M - 1, D, h, m, 0));
  const offsetMin = getTimeZoneOffsetMinutes(timeZone, approxUtc);

  return new Date(approxUtc.getTime() - offsetMin * 60_000);
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

function weekdayKeyForDate(dateYMD: string, timeZone = "Europe/Sofia"): number {
  const [Y, M, D] = dateYMD.split("-").map(Number);

  const utcNoon = new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(utcNoon);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[w] ?? 0;
}

/**
 * Types returned to UI
 */
export type AvailabilitySlot = {
  startIso: string; // UTC ISO
  endIso: string; // UTC ISO
  label: string; // "10:00" in client TZ
};

export type AvailabilityResult = {
  clientId: string;
  staffId: string;
  businessName: string;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: number | null;
    currency: string;
  };
  date: string; // YYYY-MM-DD
  timeZone: string;
  slots: AvailabilitySlot[];
  meta: {
    slotStepMinutes: number;
    minNoticeMinutes: number;
    maxDaysAhead: number;
    cancellationCutoffHours: number;
  };
};

type ClientRow = { id: string; slug: string; business_name: string; is_active?: boolean | null };
type StaffRow = { id: string; client_id: string; is_default: boolean; is_active: boolean };
type SettingsRow = {
  timezone: string;
  slot_step_minutes: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  cancellation_cutoff_hours: number;
};
type WorkingHoursRow = { weekday: number; start_time: string; end_time: string; is_closed: boolean };
type BookingBlockRow = { start_at: string; end_at: string; status: string };
type TimeOffRow = { start_at: string; end_at: string };

type ServiceRow = {
  id: string;
  client_id: string;
  name: string;
  price_from: number | null;
  duration_min: number | null;
};

type SB = ReturnType<typeof supabaseServer>;

/**
 * Shared helpers (reduce duplication)
 */
async function resolveClientBySlug(sb: SB, slug: string): Promise<ClientRow> {
  const { data: client, error } = await sb
    .from("clients")
    .select("id, slug, business_name, is_active")
    .eq("slug", slug)
    .maybeSingle<ClientRow>();

  if (error || !client) throw new Error("Client not found");
  if (client.is_active === false) throw new Error("Client inactive");

  return client;
}

async function resolveStaffId(sb: SB, args: { clientId: string; staffId?: string }): Promise<string> {
  const wanted = (args.staffId || "").trim();

  if (wanted) {
    const { data: st } = await sb
      .from("staff")
      .select("id, client_id, is_active")
      .eq("id", wanted)
      .maybeSingle<{ id: string; client_id: string; is_active: boolean }>();

    if (!st || st.client_id !== args.clientId || !st.is_active) {
      throw new Error("Invalid staff");
    }
    return st.id;
  }

  // 1) Default staff
  const { data: def } = await sb
    .from("staff")
    .select("id")
    .eq("client_id", args.clientId)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (def?.id) return def.id;

  // 2) First active staff (edge case)
  const { data: one } = await sb
    .from("staff")
    .select("id")
    .eq("client_id", args.clientId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (one?.id) return one.id;

  throw new Error("No active staff");
}

async function ensureSeedWorkingHours(sb: SB, args: { clientId: string; staffId: string }) {
  const { data: anyHours } = await sb
    .from("staff_working_hours")
    .select("weekday")
    .eq("client_id", args.clientId)
    .eq("staff_id", args.staffId)
    .limit(1);

  if (anyHours && anyHours.length > 0) return;

  const weekdays = [1, 2, 3, 4, 5, 6, 0];
  const seed = weekdays.map((weekday) => ({
    client_id: args.clientId,
    staff_id: args.staffId,
    weekday,
    start_time: "09:00",
    end_time: "18:00",
    is_closed: weekday === 0 || weekday === 6,
  }));

  await sb.from("staff_working_hours").insert(seed);
}

/**
 * Availability
 */
export async function getAvailability(args: {
  slug: string;
  serviceId: string;
  date: string; // YYYY-MM-DD (local date in client TZ)
  staffId?: string;
}): Promise<AvailabilityResult> {
  const sb = supabaseServer();

  // 1) Client
  const client = await resolveClientBySlug(sb, args.slug);
  const clientId = client.id;
  const businessName = client.business_name;

  // 2) Settings
  const { data: settings } = await sb
    .from("booking_settings")
    .select("timezone, slot_step_minutes, min_notice_minutes, max_days_ahead, cancellation_cutoff_hours")
    .eq("client_id", clientId)
    .maybeSingle<SettingsRow>();

  const timeZone = settings?.timezone || "Europe/Sofia";
  const slotStepMinutes = settings?.slot_step_minutes ?? 15;
  const minNoticeMinutes = settings?.min_notice_minutes ?? 60;
  const maxDaysAhead = settings?.max_days_ahead ?? 60;
  const cancellationCutoffHours = settings?.cancellation_cutoff_hours ?? 24;

  // 3) Resolve staff (default -> first active)
  const staffId = await resolveStaffId(sb, { clientId, staffId: args.staffId });

  // IMPORTANT: ensure this staff has working hours (fixes "no slots" for newly added staff)
  await ensureSeedWorkingHours(sb, { clientId, staffId });

  // 4) Service
  const { data: service, error: svcErr } = await sb
    .from("services")
    .select("id, client_id, name, price_from, duration_min")
    .eq("id", args.serviceId)
    .eq("client_id", clientId)
    .maybeSingle<ServiceRow>();

  if (svcErr || !service) throw new Error("Service not found");

  const durationMinutes = service.duration_min || 60;
  const price = service.price_from;
  const currency = "EUR";

  // 5) Working hours for weekday
  const weekday = weekdayKeyForDate(args.date, timeZone);

  const { data: wh } = await sb
    .from("staff_working_hours")
    .select("weekday, start_time, end_time, is_closed")
    .eq("client_id", clientId)
    .eq("staff_id", staffId)
    .eq("weekday", weekday)
    .maybeSingle<WorkingHoursRow>();

  if (!wh || wh.is_closed) {
    return {
      clientId,
      staffId,
      businessName,
      service: { id: service.id, name: service.name, durationMinutes, price, currency },
      date: args.date,
      timeZone,
      slots: [],
      meta: { slotStepMinutes, minNoticeMinutes, maxDaysAhead, cancellationCutoffHours },
    };
  }

  // Day boundaries (local->UTC)
  const dayStartUtc = makeUtcFromLocal(args.date, "00:00", timeZone);
  const dayEndUtc = makeUtcFromLocal(args.date, "23:59", timeZone);

  // 6) Blocks (OVERLAP filter - fixed)
  const { data: timeOff } = await sb
    .from("staff_time_off")
    .select("start_at, end_at")
    .eq("staff_id", staffId)
    .gt("end_at", dayStartUtc.toISOString())
    .lt("start_at", dayEndUtc.toISOString())
    .returns<TimeOffRow[]>();

  const { data: bookings } = await sb
    .from("bookings")
    .select("start_at, end_at, status")
    .eq("staff_id", staffId)
    .in("status", ["confirmed", "pending"])
    .gt("end_at", dayStartUtc.toISOString())
    .lt("start_at", dayEndUtc.toISOString())
    .returns<BookingBlockRow[]>();

  const blocks: Array<{ start: Date; end: Date }> = [];
  for (const t of timeOff || []) blocks.push({ start: new Date(t.start_at), end: new Date(t.end_at) });
  for (const b of bookings || []) blocks.push({ start: new Date(b.start_at), end: new Date(b.end_at) });

  // 7) Window
  const startHHMM = String(wh.start_time || "").slice(0, 5);
  const endHHMM = String(wh.end_time || "").slice(0, 5);

  const windowStartUtc = makeUtcFromLocal(args.date, startHHMM, timeZone);
  const windowEndUtc = makeUtcFromLocal(args.date, endHHMM, timeZone);

  // Notice / maxDaysAhead
  const now = new Date();
  const minStart = addMinutes(now, minNoticeMinutes);
  const maxAllowedUtc = addMinutes(now, maxDaysAhead * 24 * 60);

  const slots: AvailabilitySlot[] = [];

  for (
    let cur = new Date(windowStartUtc);
    addMinutes(cur, durationMinutes) <= windowEndUtc;
    cur = addMinutes(cur, slotStepMinutes)
  ) {
    const slotStart = cur;
    const slotEnd = addMinutes(slotStart, durationMinutes);

    if (slotStart < minStart) continue;
    if (slotStart > maxAllowedUtc) continue;

    let ok = true;
    for (const bl of blocks) {
      if (overlaps(slotStart, slotEnd, bl.start, bl.end)) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    slots.push({
      startIso: slotStart.toISOString(),
      endIso: slotEnd.toISOString(),
      label: toHHMM(slotStart, timeZone),
    });
  }

  return {
    clientId,
    staffId,
    businessName,
    service: { id: service.id, name: service.name, durationMinutes, price, currency },
    date: args.date,
    timeZone,
    slots,
    meta: { slotStepMinutes, minNoticeMinutes, maxDaysAhead, cancellationCutoffHours },
  };
}

/**
 * Booking creation
 */
export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: "slot_taken" | "invalid" | "server_error"; message: string };

export async function createBooking(args: {
  slug: string;
  serviceId: string;
  startIso: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote?: string | null;
  staffId?: string;
}): Promise<CreateBookingResult> {
  const sb = supabaseServer();

  // 1) Client
  let clientId = "";
  try {
    const client = await resolveClientBySlug(sb, args.slug);
    clientId = client.id;
  } catch {
    return { ok: false, reason: "invalid", message: "Невалиден или неактивен клиент." };
  }

  // 2) Resolve staff (default -> first active)
  let staffId = "";
  try {
    staffId = await resolveStaffId(sb, { clientId, staffId: args.staffId });
  } catch {
    return { ok: false, reason: "invalid", message: "Невалиден специалист." };
  }

  // 3) Load service duration
  const { data: service } = await sb
    .from("services")
    .select("id, duration_min")
    .eq("id", args.serviceId)
    .eq("client_id", clientId)
    .maybeSingle<{ id: string; duration_min: number | null }>();

  if (!service) return { ok: false, reason: "invalid", message: "Услугата не е намерена." };

  const durationMinutes = service.duration_min || 60;

  // 4) Parse start/end
  const start = new Date(args.startIso);
  if (Number.isNaN(start.getTime())) return { ok: false, reason: "invalid", message: "Невалиден начален час." };

  const end = addMinutes(start, durationMinutes);

  // 5) Validate customer
  const name = (args.customerName || "").trim();
  const phone = (args.customerPhone || "").trim();
  const email = (args.customerEmail || "").trim();

  if (name.length < 2 || phone.length < 6 || !email.includes("@")) {
    return { ok: false, reason: "invalid", message: "Моля попълни коректно име, телефон и имейл." };
  }

  // 6) Insert booking (DB enforces no overlap)
  const cancelToken = crypto.randomUUID();

  const { data: inserted, error } = await sb
    .from("bookings")
    .insert({
      client_id: clientId,
      staff_id: staffId,
      service_id: args.serviceId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      customer_note: (args.customerNote || "").trim() || null,
      cancel_token: cancelToken,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const msg = (error.message || "").toLowerCase();
    const code = (error as any).code as string | undefined;

    if (code === "23P01" || msg.includes("bookings_no_overlap_per_staff")) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "Този час току-що беше зает. Моля изберете друг свободен час.",
      };
    }

    return { ok: false, reason: "server_error", message: "Грешка при създаване на резервация." };
  }

  // 7) Email (best effort)
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const cancelUrl = `${baseUrl}/${args.slug}/cancel?token=${cancelToken}`;

    await sendMail({
      to: email,
      subject: `Заявка за резервация – ${args.slug}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5">
          <h2 style="margin:0 0 10px 0;">Заявка за резервация</h2>
          <p style="margin:0 0 10px 0;">Здравей, <b>${name}</b>.</p>
          <p style="margin:0 0 10px 0;">Получихме вашата заявка. Ще получите потвърждение от салона.</p>
          <p style="margin:0 0 10px 0;">Ако искате да отмените, използвайте линка:</p>
          <p style="margin:0 0 10px 0;"><a href="${cancelUrl}">${cancelUrl}</a></p>
          <p style="color:#666; font-size: 12px; margin:20px 0 0 0;">Ако не сте правили тази резервация, игнорирайте този имейл.</p>
        </div>
      `,
      text: `Отказ: ${cancelUrl}`,
    });
  } catch (e) {
    console.error("sendMail failed:", e);
  }

  return { ok: true, bookingId: inserted.id };
}

/**
 * Staff options for UI (staff dropdown)
 */
export type StaffOption = { id: string; name: string; is_default: boolean };

export async function getServiceStaffOptions(args: { slug: string; serviceId: string }): Promise<StaffOption[]> {
  const sb = supabaseServer();

  dbg("[getServiceStaffOptions] args:", args);

  // client
  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, is_active")
    .eq("slug", args.slug)
    .maybeSingle<{ id: string; is_active: boolean | null }>();

  dbg("[getServiceStaffOptions] client:", client, "clientErr:", clientErr);

  if (!client || client.is_active === false) return [];
  const clientId = client.id;

  // validate service belongs to client
  const { data: svc, error: svcErr } = await sb
    .from("services")
    .select("id")
    .eq("id", args.serviceId)
    .eq("client_id", clientId)
    .maybeSingle<{ id: string }>();

  dbg("[getServiceStaffOptions] svc:", svc, "svcErr:", svcErr);

  if (!svc) return [];

  // assignments
  const { data: rows, error: rowsErr } = await sb
    .from("service_staff")
    .select("staff_id")
    .eq("client_id", clientId)
    .eq("service_id", args.serviceId)
    .eq("is_active", true)
    .returns<{ staff_id: string }[]>();

  dbg("[getServiceStaffOptions] service_staff rows:", rows, "rowsErr:", rowsErr);

  const staffIds = (rows || []).map((r) => r.staff_id);
  dbg("[getServiceStaffOptions] staffIds:", staffIds);

  // If assignments exist -> only those staff
  if (staffIds.length) {
    const { data: staff, error: staffErr } = await sb
      .from("staff")
      .select("id, name, is_default")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .in("id", staffIds)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true })
      .returns<{ id: string; name: string; is_default: boolean }[]>();

    dbg("[getServiceStaffOptions] staff (filtered):", staff, "staffErr:", staffErr);

    return (staff || []).map((s) => ({ id: s.id, name: s.name, is_default: !!s.is_default }));
  }

  // No assignments -> fallback to default staff ONLY (not all staff)
  const { data: def, error: defErr } = await sb
    .from("staff")
    .select("id, name, is_default")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle<{ id: string; name: string; is_default: boolean }>();

  dbg("[getServiceStaffOptions] DEF fallback:", def, "defErr:", defErr);

  if (def) return [{ id: def.id, name: def.name, is_default: true }];

  // If no default (edge case) -> return first active staff
  const { data: one, error: oneErr } = await sb
    .from("staff")
    .select("id, name, is_default")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; name: string; is_default: boolean }>();

  dbg("[getServiceStaffOptions] ONE fallback:", one, "oneErr:", oneErr);

  return one ? [{ id: one.id, name: one.name, is_default: !!one.is_default }] : [];
}
