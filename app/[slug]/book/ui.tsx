//app\[slug]\book\ui.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { AvailabilityResult, AvailabilitySlot, CreateBookingResult } from "./actions";
import { getAvailability, createBooking } from "./actions";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";


function formatDateBg(dateYMD?: string) {
  if (!dateYMD || typeof dateYMD !== "string" || !dateYMD.includes("-")) return "—";

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

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [uiError, setUiError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const timeZone = data?.timeZone || "Europe/Sofia";

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

  async function loadAvailability(nextDate: string) {
    setUiError(null);
    setSuccessId(null);
    setSelected(null);

    try {
      const res = await getAvailability({ slug, serviceId, date: nextDate });
      setData(res);
      setSlots(res.slots);
    } catch (e: any) {
      setData(null);
      setSlots([]);
      setUiError("Не успяхме да заредим свободните часове. Моля опитай отново.");
    }
  }

  useEffect(() => {
    startTransition(() => {
      loadAvailability(date);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    if (!data || !selected) return null;
    const startFmt = formatSofiaDateTime(selected.startIso, timeZone);
    return {
      where: data.businessName,
      when: `${startFmt.time}, ${startFmt.date}`,
      what: `${data.service.name}${data.service.price != null ? ` — ${data.service.price} ${data.service.currency}` : ""}`,
    };
  }, [data, selected, timeZone]);

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
      });

      if (result.ok) {
        setSuccessId(result.bookingId);
        setUiError(null);
        return;
      }

      // Slot just taken -> refresh availability and show message
      if (result.reason === "slot_taken") {
        setUiError(result.message);
        await loadAvailability(date);
        return;
      }

      setUiError(result.message);
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow space-y-2">
        <h1 className="text-2xl font-semibold">Запази час</h1>
        <p className="text-gray-700">
          Избери дата и свободен начален час. Резервацията се заплаща в обекта.
        </p>
      </div>

      {uiError && (
        <div className="bg-red-100 text-red-800 p-3 rounded">
          {uiError}
        </div>
      )}

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

    {/* Step 1: Date */}
    <div className="bg-white p-6 rounded shadow space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">1) Избери дата</h2>
        <div className="text-sm text-gray-600 whitespace-nowrap">{formatDateBg(date)}</div>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Calendar */}
        <div className="rounded border bg-white p-3">
          <DayPicker
            mode="single"
            weekStartsOn={1} // Понеделник
            selected={date ? new Date(`${date}T12:00:00`) : undefined}
            onSelect={(d) => {
              if (!d) return;
              const next = toYMD(d);
              setDate(next);
              startTransition(() => loadAvailability(next));
            }}
          />
        </div>

        {/* Info */}
        <div className="space-y-2">
          {isPending && <div className="text-sm text-gray-600">Зареждане…</div>}

          <div className="text-sm text-gray-600">
            Услуга: <span className="font-medium">{data?.service.name ?? "—"}</span>{" "}
            {data?.service.price != null && (
              <>
                • Цена:{" "}
                <span className="font-medium">
                  {data.service.price} {data.service.currency}
                </span>
              </>
            )}
            {data?.service.durationMinutes && (
              <>
                {" "}
                • Продължителност:{" "}
                <span className="font-medium">{data.service.durationMinutes} мин.</span>
              </>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Седмицата започва от <b>понеделник</b>.
          </div>
        </div>
      </div>
    </div>



      {/* Step 2: Slots */}
      <div className="bg-white p-6 rounded shadow space-y-4">
        <h2 className="text-lg font-semibold">2) Избери начален час</h2>

        {slots.length === 0 ? (
          <div className="text-gray-700">
            Няма свободни часове за избраната дата.
          </div>
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

      {/* Step 3: Confirmation */}
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
              <label className="block text-sm text-gray-700 mb-1">Бележка към резервацията (по желание)</label>
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
            </div>

            <div className="text-sm text-gray-700">
              С резервацията си вие приемате нашите Условия и Политики и си създавате регистрация.
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={isSubmitting || !selected}
              className={[
                "w-full rounded px-4 py-3 font-medium",
                isSubmitting || !selected ? "bg-gray-300 text-gray-700" : "bg-black text-white hover:opacity-90",
              ].join(" ")}
            >
              {isSubmitting ? "Записване..." : "Потвърждавам резервацията"}
            </button>

            <div className="text-sm text-gray-700">
              Заплаща се в обекта, след извършване на услугата.
            </div>

            <div className="text-sm text-gray-700">
              Имате право да отмените резервацията си най-късно {data?.meta?.cancellationCutoffHours ? (
                <>
                  <span className="font-medium">{data.meta.cancellationCutoffHours} часа</span> преди началния час
                  {cutoffText ? (
                    <> (не по-късно от <span className="font-medium">{cutoffText}</span>).</>
                  ) : (
                    "."
                  )}
                </>
              ) : (
                <>24 часа преди началния час.</>
              )}
            </div>

            <div className="text-xs text-gray-600">
              В повечето случаи специалистите работят за себе си и претърпяват сериозни загуби при всяка ненавременна
              отмяна на час или неявяване на клиент. Профилите на клиенти, които злоупотребят с времето на специалистите,
              се блокират.
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
