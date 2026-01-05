// app/admin/[slug]/bookings/_components/BookingsCalendarControls.tsx
"use client";

export default function BookingsCalendarControls({
  mode,
  staff,
  staffOptions,
  onChangeMode,
  onChangeStaff,
}: {
  mode: "week" | "day";
  staff: string; // all | uuid
  staffOptions: { id: string; name: string }[];
  onChangeMode?: (mode: "week" | "day") => void;
  onChangeStaff?: (staff: string) => void;
}) {
  return (
    <div className="bookings-controls">
      {/* Desktop: buttons */}
      <div className="group desktop-only">
        <span className="label">Изглед:</span>
        <button
          type="button"
          className={`btn ${mode === "week" ? "btn-active" : ""}`}
          onClick={() => onChangeMode?.("week")}
        >
          Седмица
        </button>
        <button
          type="button"
          className={`btn ${mode === "day" ? "btn-active" : ""}`}
          onClick={() => onChangeMode?.("day")}
        >
          Ден
        </button>
      </div>

      {/* Mobile: dropdown for mode */}
      <div className="group mobile-only">
        <span className="label">Изглед:</span>
        <select
          className="select"
          value={mode}
          onChange={(e) => onChangeMode?.(e.target.value === "day" ? "day" : "week")}
        >
          <option value="week">Седмица</option>
          <option value="day">Ден</option>
        </select>
      </div>

      {/* Staff dropdown */}
      <div className="group">
        <span className="label">Специалист:</span>
        <select className="select" value={staff} onChange={(e) => onChangeStaff?.(e.target.value || "all")}>
          <option value="all">Всички</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
