"use client";

import { useRouter } from "next/navigation";

type StaffOpt = { id: string; name: string };

export default function BookingsTableControls({
  slug,
  keyParam,
  activeStatus,
  staff,
  staffOptions,
}: {
  slug: string;
  keyParam: string;
  activeStatus: string; // pending|upcoming|past|cancelled|all
  staff: string; // "all" | uuid
  staffOptions: StaffOpt[];
}) {
  const router = useRouter();

  const status = (activeStatus || "pending").toLowerCase();
  const staffValue = (staff || "all").toLowerCase();

  const go = (next: { status?: string; staff?: string }) => {
    const sp = new URLSearchParams();
    sp.set("key", keyParam);
    sp.set("view", "table");
    sp.set("status", (next.status ?? status).toLowerCase());
    sp.set("staff", (next.staff ?? staffValue) || "all");
    router.push(`/admin/${slug}/bookings?${sp.toString()}`);
  };

  return (
    <div className="bookings-controls">
      {/* Desktop */}
      <div className="group desktop-only">
        <span className="label">Филтър:</span>

        <button type="button" className={`btn ${status === "pending" ? "btn-active" : ""}`} onClick={() => go({ status: "pending" })}>
          Чакащи
        </button>
        <button type="button" className={`btn ${status === "upcoming" ? "btn-active" : ""}`} onClick={() => go({ status: "upcoming" })}>
          Предстоящи
        </button>
        <button type="button" className={`btn ${status === "past" ? "btn-active" : ""}`} onClick={() => go({ status: "past" })}>
          Минали
        </button>
        <button type="button" className={`btn ${status === "cancelled" ? "btn-active" : ""}`} onClick={() => go({ status: "cancelled" })}>
          Отказани
        </button>
        <button type="button" className={`btn ${status === "all" ? "btn-active" : ""}`} onClick={() => go({ status: "all" })}>
          Всички
        </button>

        <div className="spacer" />

        <label className="label">Специалист:</label>
        <select className="select" value={staffValue} onChange={(e) => go({ staff: e.target.value })}>
          <option value="all">Всички специалисти</option>
          {(staffOptions || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mobile */}
      <div className="group mobile-only">
        <div className="row">
          <span className="label">Филтър:</span>
          <select className="select" value={status} onChange={(e) => go({ status: e.target.value })}>
            <option value="pending">Чакащи</option>
            <option value="upcoming">Предстоящи</option>
            <option value="past">Минали</option>
            <option value="cancelled">Отказани</option>
            <option value="all">Всички</option>
          </select>
        </div>

        <div className="row">
          <span className="label">Специалист:</span>
          <select className="select" value={staffValue} onChange={(e) => go({ staff: e.target.value })}>
            <option value="all">Всички специалисти</option>
            {(staffOptions || []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
