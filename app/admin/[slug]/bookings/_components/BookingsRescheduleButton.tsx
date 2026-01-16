// app/admin/[slug]/bookings/_components/BookingsRescheduleButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";

type Slot = { startIso: string; endIso: string; label: string };

export default function BookingsRescheduleButton(props: {
  slug: string;
  keyParam: string;
  bookingId: string;
  startAtIso: string; // UTC ISO from DB
  status: string;
}) {
  const { slug, keyParam, bookingId, startAtIso, status } = props;
  const tz = "Europe/Sofia";

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedStartIso, setSelectedStartIso] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCancelled = (status || "").toLowerCase() === "cancelled";

  const initialLocalDate = useMemo(() => {
    return DateTime.fromISO(startAtIso, { zone: "utc" }).setZone(tz).toISODate()!;
  }, [startAtIso]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setDate(initialLocalDate);
    setSelectedStartIso("");
  }, [open, initialLocalDate]);

  async function fetchSlots(forDate: string) {
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams();
      sp.set("key", keyParam);
      sp.set("bookingId", bookingId);
      sp.set("date", forDate);

      const res = await fetch(`/api/admin/${slug}/bookings/slots?${sp.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.message || "Failed");
      }

      const list: Slot[] = Array.isArray(json?.slots) ? json.slots : [];
      setSlots(list);
      setSelectedStartIso(list[0]?.startIso || "");
    } catch {
      setSlots([]);
      setSelectedStartIso("");
      setErr("Грешка при зареждане на свободни часове.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!selectedStartIso) return;

    setSaving(true);
    setErr(null);

    try {
      const sp = new URLSearchParams();
      sp.set("key", keyParam);

      const res = await fetch(`/api/admin/${slug}/bookings/reschedule?${sp.toString()}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ bookingId, newStartIso: selectedStartIso }),
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        if (json?.reason === "slot_taken") {
          setErr("Този час вече е зает. Избери друг.");
          // refresh slots to be safe
          await fetchSlots(date);
          return;
        }
        throw new Error(json?.message || "Failed");
      }

      setOpen(false);
      // simplest + reliable: reload the page so table reflects new time
      window.location.reload();
    } catch {
      setErr("Грешка при запазване.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="px-3 py-2 rounded border text-sm hover:bg-gray-50 disabled:opacity-50"
        disabled={isCancelled}
        onClick={() => {
          setOpen(true);
          // load slots immediately on open
          // (date is set in effect -> run after state update)
          setTimeout(() => fetchSlots(initialLocalDate), 0);
        }}
        title="Промени час"
      >
        ✎
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="p-5 border-b flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Промяна на час</div>
                <div className="text-sm text-gray-600">Избери дата и свободен слот.</div>
              </div>
              <button className="text-sm text-gray-600 hover:text-black" onClick={() => setOpen(false)}>
                Затвори
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <label className="block">
                <div className="text-gray-600 mb-1">Дата</div>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={date}
                  onChange={(e) => {
                    const d = e.target.value;
                    setDate(d);
                    fetchSlots(d);
                  }}
                  disabled={saving}
                />
              </label>

              <label className="block">
                <div className="text-gray-600 mb-1">Свободни часове</div>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={selectedStartIso}
                  onChange={(e) => setSelectedStartIso(e.target.value)}
                  disabled={saving || loading || slots.length === 0}
                >
                  {slots.length === 0 ? <option value="">Няма свободни слотове</option> : null}
                  {slots.map((s) => (
                    <option key={s.startIso} value={s.startIso}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              {loading ? <div className="text-gray-500">Зареждане…</div> : null}
              {err ? <div className="text-red-600">{err}</div> : null}
            </div>

            <div className="p-5 border-t flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Отказ
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded bg-gray-900 text-white text-sm hover:opacity-90 disabled:opacity-50"
                onClick={save}
                disabled={saving || !selectedStartIso}
              >
                Запази
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
