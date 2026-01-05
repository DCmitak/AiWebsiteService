// app/admin/[slug]/bookings/_components/BookingsCalendar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import luxonPlugin from "@fullcalendar/luxon3";
import { DateTime } from "luxon";

import "./BookingsCalendar.css";
import BookingsCalendarControls from "./BookingsCalendarControls";

type BookingStatus = "pending" | "confirmed" | "cancelled" | string;

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  display?: "auto" | "background";
  extendedProps: {
    type: "booking" | "timeoff";
    status?: BookingStatus;
    booking?: {
      id: string;
      status: BookingStatus;
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

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const calc = () => setIsMobile(window.innerWidth < breakpoint);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [breakpoint]);
  return isMobile;
}

function formatRangeTitle(mode: "week" | "day", date: string, tz: string) {
  const d = DateTime.fromISO(date, { zone: tz }).startOf("day");

  if (mode === "day") {
    return d.setLocale("bg").toFormat("cccc, dd.LL.yyyy") + " г.";
  }

  const monday = d.minus({ days: (d.weekday + 6) % 7 }).startOf("day");
  const sunday = monday.plus({ days: 6 });
  return `Седмица ${monday.toFormat("dd")} – ${sunday.toFormat("dd.LL.yyyy")} г.`;
}

function fmtHM(iso: string, tz: string) {
  return DateTime.fromISO(iso, { zone: tz }).toFormat("HH:mm");
}

function normWeekMonday(dateISO: string, tz: string) {
  const d = DateTime.fromISO(dateISO, { zone: tz }).startOf("day");
  return d.minus({ days: (d.weekday + 6) % 7 }).startOf("day").toISODate()!;
}

function buildCalendarUrl({
  slug,
  keyParam,
  mode,
  date,
  staff,
}: {
  slug: string;
  keyParam: string;
  mode: "week" | "day";
  date: string;
  staff: string;
}) {
  const sp = new URLSearchParams();
  sp.set("key", keyParam);
  sp.set("view", "calendar");
  sp.set("mode", mode);
  sp.set("date", date);
  sp.set("staff", staff);
  return `/admin/${slug}/bookings?${sp.toString()}`;
}

export default function BookingsCalendar({
  slug,
  keyParam,
  mode,
  date,
  staff,
  initialEvents,
  returnToBase,
  confirmAction,
  cancelAction,
  staffOptions = [],
}: {
  slug: string;
  keyParam: string;
  mode: "week" | "day";
  date: string; // YYYY-MM-DD
  staff: string; // "all" | uuid
  initialEvents: CalendarEvent[];
  returnToBase: string;
  confirmAction: (formData: FormData) => void;
  cancelAction: (formData: FormData) => void;
  staffOptions?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const tz = "Europe/Sofia";
  const isMobile = useIsMobile(768);

  const [open, setOpen] = useState<CalendarEvent["extendedProps"]["booking"] | null>(null);

  // Local state drives the calendar (no SSR reload)
  const [modeState, setModeState] = useState<"week" | "day">(mode);
  const [dateState, setDateState] = useState<string>(date);
  const [staffState, setStaffState] = useState<string>(staff);

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents || []);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const calRef = useRef<FullCalendar | null>(null);
  const syncingRef = useRef(false);

  // FullCalendar header (required, otherwise TS complains if referenced)
  const headerToolbar = useMemo(
    () => ({
      left: "prev,next today",
      center: "title",
      right: "",
    }),
    []
  );

  const normDate = useMemo(() => {
    const d = DateTime.fromISO(dateState, { zone: tz }).startOf("day");
    if (modeState === "day") return d.toISODate()!;
    return normWeekMonday(d.toISODate()!, tz);
  }, [dateState, modeState, tz]);

  const viewName = modeState === "day" ? "timeGridDay" : "timeGridWeek";
  const rangeTitle = useMemo(() => formatRangeTitle(modeState, normDate, tz), [modeState, normDate, tz]);

  // Keep URL in sync (no navigation flicker)
  useEffect(() => {
    const url = buildCalendarUrl({
      slug,
      keyParam,
      mode: modeState,
      date: normDate,
      staff: staffState,
    });
    router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeState, normDate, staffState]);

  // Fetch events when mode/date/staff changes
  useEffect(() => {
    const ac = new AbortController();

    async function run() {
      setLoading(true);
      setLoadError(null);

      try {
        const sp = new URLSearchParams();
        sp.set("key", keyParam);
        sp.set("mode", modeState);
        sp.set("date", normDate);
        sp.set("staff", staffState);

        const res = await fetch(`/api/admin/${slug}/bookings/events?${sp.toString()}`, {
          method: "GET",
          signal: ac.signal,
          headers: { accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const json = await res.json();
        const nextEvents: CalendarEvent[] = Array.isArray(json?.events) ? json.events : [];
        setEvents(nextEvents);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setLoadError("Грешка при зареждане на календара.");
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => ac.abort();
  }, [slug, keyParam, modeState, normDate, staffState]);

  // URL/state -> FullCalendar sync (desktop)
  useEffect(() => {
    if (isMobile) return;
    const api = calRef.current?.getApi?.();
    if (!api) return;

    syncingRef.current = true;

    const t = window.setTimeout(() => {
      try {
        if (api.view?.type !== viewName) api.changeView(viewName);

        const currentIso = DateTime.fromJSDate(api.getDate(), { zone: tz }).toISODate();
        if (currentIso !== normDate) api.gotoDate(normDate);
      } finally {
        window.setTimeout(() => {
          syncingRef.current = false;
        }, 0);
      }
    }, 0);

    return () => window.clearTimeout(t);
  }, [isMobile, viewName, normDate, tz]);

  // FullCalendar -> state (desktop)
  function onDatesSet(arg: any) {
    if (isMobile) return;
    if (syncingRef.current) return;

    const nextMode: "week" | "day" = arg?.view?.type === "timeGridDay" ? "day" : "week";
    const start: Date | undefined = arg?.start;
    const nextBase = start
      ? DateTime.fromJSDate(start, { zone: tz }).startOf("day")
      : DateTime.fromISO(normDate, { zone: tz }).startOf("day");

    const nextDate = nextMode === "week" ? normWeekMonday(nextBase.toISODate()!, tz) : nextBase.toISODate()!;
    setModeState(nextMode);
    setDateState(nextDate);
  }

  function onEventClick(arg: any) {
    const props = arg?.event?.extendedProps;
    if (props?.type === "booking" && props.booking) setOpen(props.booking);
  }

  function renderEventContent(info: any) {
    const props = info?.event?.extendedProps;
    if (props?.type === "timeoff") return null;

    const b = props?.booking;
    if (!b) {
      return (
        <div className="fc-ev">
          <div className="fc-ev-time">{info.timeText}</div>
          <div className="fc-ev-title">{info.event.title}</div>
        </div>
      );
    }

    const s = fmtHM(b.start_at, tz);
    const e = fmtHM(b.end_at, tz);

    return (
      <div className="fc-ev">
        <div className="fc-ev-time">
          {s} – {e}
        </div>
        <div className="fc-ev-title">
          {b.service_name} • {b.customer_name}
        </div>
      </div>
    );
  }

  const controls = (
    <BookingsCalendarControls
      mode={modeState}
      staff={staffState}
      staffOptions={staffOptions}
      onChangeMode={(m) => {
        setModeState(m);
        setDateState((prev) => (m === "week" ? normWeekMonday(prev, tz) : prev));
      }}
      onChangeStaff={(s) => setStaffState(s)}
    />
  );

  // Mobile list (cards)
  const mobileList = useMemo(() => {
    if (!isMobile) return [];
    const list = (events || []).filter((e) => e.display !== "background");

    const map = new Map<string, { label: string; items: CalendarEvent[] }>();
    for (const ev of list) {
      const dayIso = DateTime.fromISO(ev.start, { zone: tz }).toISODate()!;
      const label = DateTime.fromISO(ev.start, { zone: tz }).setLocale("bg").toFormat("cccc, dd.LL");
      if (!map.has(dayIso)) map.set(dayIso, { label, items: [] });
      map.get(dayIso)!.items.push(ev);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        key,
        label: v.label,
        items: v.items.sort((a, b) => a.start.localeCompare(b.start)),
      }));
  }, [isMobile, events, tz]);

  const mobileNav = {
    prev: () => {
      const base = DateTime.fromISO(normDate, { zone: tz }).startOf("day");
      const next = modeState === "week" ? base.minus({ days: 7 }) : base.minus({ days: 1 });
      setDateState(modeState === "week" ? normWeekMonday(next.toISODate()!, tz) : next.toISODate()!);
    },
    next: () => {
      const base = DateTime.fromISO(normDate, { zone: tz }).startOf("day");
      const next = modeState === "week" ? base.plus({ days: 7 }) : base.plus({ days: 1 });
      setDateState(modeState === "week" ? normWeekMonday(next.toISODate()!, tz) : next.toISODate()!);
    },
    today: () => {
      const today = DateTime.now().setZone(tz).startOf("day").toISODate()!;
      setDateState(modeState === "week" ? normWeekMonday(today, tz) : today);
    },
  };

  if (isMobile) {
    return (
      <div className="bc-mobile">
        {controls}

        <div className="bc-mobile-nav">
          <button type="button" className="bc-nav-btn" onClick={mobileNav.prev} aria-label="Prev">
            ‹
          </button>
          <button type="button" className="bc-nav-btn" onClick={mobileNav.next} aria-label="Next">
            ›
          </button>
          <button type="button" className="bc-today-btn" onClick={mobileNav.today}>
            today
          </button>
        </div>

        <div className="bc-range-title">{rangeTitle}</div>

        {loadError ? <div className="bc-empty">{loadError}</div> : null}

        {!loading && !loadError && mobileList.length === 0 ? (
          <div className="bc-empty">Няма резервации за този период.</div>
        ) : (
          <div className="bc-cards">
            {mobileList.map((day) => (
              <div key={day.key} className="bc-day">
                <div className="bc-day-title">{day.label}</div>

                <div className="bc-day-list">
                  {day.items.map((ev) => {
                    const b = ev.extendedProps?.booking;
                    const status = (ev.extendedProps?.status || "").toString().toLowerCase();
                    const s = b ? fmtHM(b.start_at, tz) : fmtHM(ev.start, tz);
                    const e = b ? fmtHM(b.end_at, tz) : fmtHM(ev.end, tz);
                    const title = b ? `${b.service_name}` : ev.title;
                    const sub = b ? `${b.customer_name}` : "";

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className={[
                          "bc-card",
                          status === "confirmed" ? "is-confirmed" : "",
                          status === "pending" ? "is-pending" : "",
                          status === "cancelled" ? "is-cancelled" : "",
                        ].join(" ")}
                        onClick={() => {
                          const booking = ev.extendedProps?.booking;
                          if (booking) setOpen(booking);
                        }}
                      >
                        <div className="bc-card-time">
                          {s} – {e}
                        </div>
                        <div className="bc-card-title">{title}</div>
                        {sub ? <div className="bc-card-sub">{sub}</div> : null}
                        <div className="bc-card-status">{status || "—"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(null)} />
            <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-lg">
              <div className="p-5 border-b flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{open.service_name}</div>
                  <div className="text-sm text-gray-600">
                    {open.staff_name ? <>Специалист: {open.staff_name} • </> : null}
                    {fmtHM(open.start_at, tz)} – {fmtHM(open.end_at, tz)} • Статус:{" "}
                    <span className="font-medium">{open.status}</span>
                  </div>
                </div>
                <button className="text-sm text-gray-600 hover:text-black" onClick={() => setOpen(null)}>
                  Затвори
                </button>
              </div>

              <div className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-gray-500">Клиент</div>
                    <div className="font-medium">{open.customer_name}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Контакт</div>
                    <div>{open.customer_phone}</div>
                    <div className="text-gray-600">{open.customer_email}</div>
                  </div>
                </div>

                {open.customer_note ? (
                  <div className="rounded border bg-gray-50 p-3">
                    <div className="text-gray-500">Бележка</div>
                    <div className="mt-1 whitespace-pre-wrap">{open.customer_note}</div>
                  </div>
                ) : null}
              </div>

              <div className="p-5 border-t flex gap-2 justify-end flex-wrap">
                {open.status === "pending" ? (
                  <form action={confirmAction}>
                    <input type="hidden" name="booking_id" value={open.id} />
                    <input type="hidden" name="return_to" value={returnToBase} />
                    <button className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:opacity-90">
                      Confirm
                    </button>
                  </form>
                ) : null}

                {open.status !== "cancelled" ? (
                  <form action={cancelAction}>
                    <input type="hidden" name="booking_id" value={open.id} />
                    <input type="hidden" name="return_to" value={returnToBase} />
                    <button className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <span className="text-gray-500 text-sm">Вече е отказана.</span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Desktop
  return (
    <div className="space-y-4">
      {controls}

      <div className="rounded border bg-white p-4 bc-cal-wrap">
        {loading ? (
          <div className="bc-loading-overlay" aria-live="polite" aria-busy="true">
            <div className="bc-loading-pill">Зареждане…</div>
          </div>
        ) : null}

        {loadError ? <div className="bc-empty">{loadError}</div> : null}

        <FullCalendar
          ref={(r) => {
            calRef.current = r;
          }}
          plugins={[timeGridPlugin, interactionPlugin, luxonPlugin]}
          headerToolbar={headerToolbar}
          initialView={viewName}
          initialDate={normDate}
          height="auto"
          nowIndicator
          firstDay={1}
          locale="bg"
          timeZone={tz}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:15:00"
          events={events}
          datesSet={onDatesSet}
          eventClick={onEventClick}
          eventContent={renderEventContent}
          eventMinHeight={56}
          eventShortHeight={56}
          eventClassNames={(info) => {
            const t = info.event.extendedProps?.type;
            const s = info.event.extendedProps?.status;
            if (t === "timeoff") return ["fc-timeoff"];
            if (s === "pending") return ["fc-pending"];
            if (s === "confirmed") return ["fc-confirmed"];
            if (s === "cancelled") return ["fc-cancelled"];
            return ["fc-booking"];
          }}
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-lg">
            <div className="p-5 border-b flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{open.service_name}</div>
                <div className="text-sm text-gray-600">
                  {open.staff_name ? <>Специалист: {open.staff_name} • </> : null}
                  {fmtHM(open.start_at, tz)} – {fmtHM(open.end_at, tz)} • Статус:{" "}
                  <span className="font-medium">{open.status}</span>
                </div>
              </div>
              <button className="text-sm text-gray-600 hover:text-black" onClick={() => setOpen(null)}>
                Затвори
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-500">Клиент</div>
                  <div className="font-medium">{open.customer_name}</div>
                </div>
                <div>
                  <div className="text-gray-500">Контакт</div>
                  <div>{open.customer_phone}</div>
                  <div className="text-gray-600">{open.customer_email}</div>
                </div>
              </div>

              {open.customer_note ? (
                <div className="rounded border bg-gray-50 p-3">
                  <div className="text-gray-500">Бележка</div>
                  <div className="mt-1 whitespace-pre-wrap">{open.customer_note}</div>
                </div>
              ) : null}
            </div>

            <div className="p-5 border-t flex gap-2 justify-end flex-wrap">
              {open.status === "pending" ? (
                <form action={confirmAction}>
                  <input type="hidden" name="booking_id" value={open.id} />
                  <input type="hidden" name="return_to" value={returnToBase} />
                  <button className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:opacity-90">
                    Confirm
                  </button>
                </form>
              ) : null}

              {open.status !== "cancelled" ? (
                <form action={cancelAction}>
                  <input type="hidden" name="booking_id" value={open.id} />
                  <input type="hidden" name="return_to" value={returnToBase} />
                  <button className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:opacity-90">
                    Cancel
                  </button>
                </form>
              ) : (
                <span className="text-gray-500 text-sm">Вече е отказана.</span>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
