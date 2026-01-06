"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

import type {
  AvailabilityResult,
  AvailabilitySlot,
  CreateBookingResult,
  StaffOption,
} from "./actions";
import { getAvailability, createBooking, getServiceStaffOptions } from "./actions";

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateBg(dateYMD?: string) {
  if (!dateYMD || !dateYMD.includes("-")) return "—";
  const [y, m, d] = dateYMD.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return "—";
  const dt = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  return new Intl.DateTimeFormat("bg-BG", {
    timeZone: "Europe/Sofia",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
}

function formatSofiaDateTime(iso: string, timeZone: string) {
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

  return { time, date };
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export default function BookingClient({
  slug,
  serviceId,
  initialDate,
}: {
  slug: string;
  serviceId: string;
  initialDate: string; // YYYY-MM-DD
}) {
  const [date, setDate] = useState(() => initialDate || "");
  const [data, setData] = useState<AvailabilityResult | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);

  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState<string>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [uiError, setUiError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const timeZone = data?.timeZone || "Europe/Sofia";

  async function loadAvailability(nextDate: string, nextStaffId?: string) {
    setUiError(null);
    setSuccessId(null);
    setSelected(null);

    const sid = (nextStaffId ?? staffId).trim();
    // IMPORTANT: if staff selector exists and sid is empty, avoid calling
    // (backend can still fallback, but this prevents odd UI flickers)
    const staffArg = sid ? sid : undefined;

    try {
      const res = await getAvailability({
        slug,
        serviceId,
        date: nextDate,
        staffId: staffArg,
      });
      setData(res);
      setSlots(res.slots || []);
    } catch (e) {
      console.error("loadAvailability failed:", e);
      setData(null);
      setSlots([]);
      setUiError("Не успяхме да заредим свободните часове. Моля опитай отново.");
    }
  }

  // Initial load: staff options -> preselect -> availability
  useEffect(() => {
    startTransition(async () => {
      try {
        const opts = await getServiceStaffOptions({ slug, serviceId });
        setStaffOptions(opts);

        const preselected =
          opts.find((o) => o.is_default)?.id || opts[0]?.id || "";

        setStaffId(preselected);
        await loadAvailability(date, preselected);
      } catch (e) {
        console.error("init booking failed:", e);
        setData(null);
        setSlots([]);
        setUiError("Не успяхме да заредим свободните часове. Моля опитай отново.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    if (!data || !selected) return null;
    const startFmt = formatSofiaDateTime(selected.startIso, timeZone);
    return {
      where: data.businessName,
      when: `${startFmt.time}, ${startFmt.date}`,
      what: `${data.service.name}${
        data.service.price != null ? ` — ${data.service.price} ${data.service.currency}` : ""
      }`,
    };
  }, [data, selected, timeZone]);

  const cutoffText = useMemo(() => {
    if (!data?.meta?.cancellationCutoffHours || !selected) return null;
    const start = new Date(selected.startIso);
    const cutoff = addHours(start, -data.meta.cancellationCutoffHours);
    const cutoffTime = new Intl.DateTimeFormat("bg-BG", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(cutoff);
    const cutoffDate = new Intl.DateTimeFormat("bg-BG", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      weekday: "long",
    }).format(cutoff);
    return `${cutoffTime}, ${cutoffDate}`;
  }, [data?.meta?.cancellationCutoffHours, selected, timeZone]);

  async function submit() {
    if (!data || !selected) {
      setUiError("Моля изберете дата и начален час.");
      return;
    }
    setUiError(null);

    startSubmit(async () => {
      const result: CreateBookingResult = await createBooking({
        slug,
        serviceId,
        startIso: selected.startIso,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        customerNote: note,
        staffId: staffId.trim() || undefined,
      });

      if (result.ok) {
        setSuccessId(result.bookingId);
        return;
      }

      if (result.reason === "slot_taken") {
        setUiError(result.message);
        await loadAvailability(date);
        return;
      }

      setUiError(result.message);
    });
  }

  const showStaffStep = staffOptions.length > 1;
  const readyForAvailability = !showStaffStep || !!staffId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded shadow space-y-2">
        <h1 className="text-2xl font-semibold">Запази час</h1>
        <p className="text-gray-700">
          Избери дата и свободен начален час. Резервацията се заплаща в обекта.
        </p>
      </div>

      {uiError && <div className="bg-red-100 text-red-800 p-3 rounded">{uiError}</div>}

      {successId && data && selected && (
        <div className="bg-green-100 text-green-800 p-4 rounded space-y-2">
          <div className="font-semibold">Резервацията е създадена успешно.</div>
          <div className="text-sm">
            Номер: <span className="font-mono">{successId}</span>
          </div>
          <div className="text-sm">
            {summary?.where} • {summary?.when} • {summary?.what}
          </div>
          <a className="underline text-sm" href={`/${slug}`}>
            Обратно към сайта
          </a>
        </div>
      )}

      {/* Step 0: Staff */}
      {staffOptions.length > 1 ? (
        <div className="bg-white p-6 rounded shadow space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">0) Избери специалист</h2>
            <div className="text-sm text-gray-600">Влияе на свободните часове</div>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {staffOptions.map((st) => (
              <label
                key={st.id}
                className={[
                  "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer",
                  staffId === st.id ? "border-black bg-gray-50" : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="staff"
                  value={st.id}
                  checked={staffId === st.id}
                  onChange={() => {
                    setStaffId(st.id);
                    startTransition(() => loadAvailability(date, st.id));
                  }}
                />
                <span className="text-sm">
                  {st.name}{" "}
                  {st.is_default ? <span className="text-xs text-gray-500">(по подразбиране)</span> : null}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : staffOptions.length === 1 ? (
        <div className="bg-white p-6 rounded shadow">
          <div className="text-sm text-gray-700">
            Специалист: <span className="font-medium">{staffOptions[0].name}</span>
          </div>
        </div>
      ) : null}

      {/* Step 1: Date */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">1) Избери дата</h2>
          <div className="text-sm text-gray-600 whitespace-nowrap">{formatDateBg(date)}</div>
        </div>

        {!readyForAvailability ? (
          <div className="text-sm text-gray-600">Моля изберете специалист, за да видите свободните часове.</div>
        ) : (
          <div className="grid md:grid-cols-[320px_1fr] gap-6 items-start">
            <div className="rounded border bg-white p-3">
              <DayPicker
                mode="single"
                weekStartsOn={1}
                selected={date ? new Date(`${date}T12:00:00`) : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  const nextDate = toYMD(d);
                  setDate(nextDate);
                  startTransition(() => loadAvailability(nextDate));
                }}
              />
            </div>

            <div className="space-y-2">
              {isPending && <div className="text-sm text-gray-600">Зареждане…</div>}

              <div className="text-sm text-gray-600">
                Услуга: <span className="font-medium">{data?.service.name ?? "—"}</span>{" "}
                {data?.service.price != null && (
                  <>
                    • Цена: <span className="font-medium">{data.service.price} {data.service.currency}</span>
                  </>
                )}
                {data?.service.durationMinutes ? (
                  <>
                    {" "}
                    • Продължителност: <span className="font-medium">{data.service.durationMinutes} мин.</span>
                  </>
                ) : null}
              </div>

              <div className="text-xs text-gray-500">
                Седмицата започва от <b>понеделник</b>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Slots */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">2) Избери начален час</h2>

        {!readyForAvailability ? (
          <div className="text-gray-700">Първо избери специалист.</div>
        ) : slots.length === 0 ? (
          <div className="text-gray-700">Няма свободни часове за избраната дата.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((s) => {
              const active = selected?.startIso === s.startIso;
              return (
                <button
                  key={s.startIso}
                  type="button"
                  onClick={() => setSelected(s)}
                  className={[
                    "border rounded px-2 py-2 text-sm",
                    active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: Confirmation (оставям ти структурата, но давам работещо минимално) */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">3) Потвърждение</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Име и фамилия</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="въведете име и фамилия"
                className="border px-3 py-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Мобилен телефон</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="въведете своя мобилен телефон"
                className="border px-3 py-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Имейл</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="border px-3 py-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Бележка (по желание)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border px-3 py-2 rounded w-full min-h-[90px]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="border rounded p-4 bg-gray-50 space-y-2">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Къде?</span> {summary?.where ?? "—"}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Кога?</span> {summary?.when ?? "—"}
              </div>
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Какво?</span> {summary?.what ?? "—"}
              </div>
              {staffOptions.length ? (
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">Специалист:</span>{" "}
                  {staffOptions.find((s) => s.id === staffId)?.name ?? "—"}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting || !selected}
              className={[
                "w-full rounded px-4 py-3 font-medium",
                isSubmitting || !selected
                  ? "bg-gray-300 text-gray-700"
                  : "bg-black text-white hover:opacity-90",
              ].join(" ")}
            >
              {isSubmitting ? "Записване..." : "Потвърждавам резервацията"}
            </button>

            <div className="text-sm text-gray-700">
              Имате право да отмените резервацията най-късно{" "}
              {data?.meta?.cancellationCutoffHours ? (
                <>
                  <span className="font-medium">{data.meta.cancellationCutoffHours} часа</span> преди началния час
                  {cutoffText ? <> (не по-късно от <span className="font-medium">{cutoffText}</span>).</> : "."}
                </>
              ) : (
                <>24 часа преди началния час.</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Ако не виждаш свободни часове, провери работното време от админ панела или избери друга дата.
      </div>
    </div>
  );
}
