// app/admin/[slug]/bookings/_components/BookingsTableControls.tsx
"use client";

import { useRouter } from "next/navigation";

export default function BookingsTableControls({
  slug,
  keyParam,
  activeStatus,
}: {
  slug: string;
  keyParam: string;
  activeStatus: string; // pending|upcoming|past|cancelled|all
}) {
  const router = useRouter();

  const push = (nextStatus: string) => {
    const sp = new URLSearchParams();
    sp.set("key", keyParam);
    sp.set("view", "table");
    sp.set("status", nextStatus);
    router.push(`/admin/${slug}/bookings?${sp.toString()}`);
  };

  const status = (activeStatus || "pending").toLowerCase();

  return (
    <div className="bookings-controls" style={{ marginTop: 0 }}>
      {/* Desktop buttons */}
      <div className="group desktop-only">
        <span className="label">Филтър:</span>

        <button type="button" className={`btn ${status === "pending" ? "btn-active" : ""}`} onClick={() => push("pending")}>
          Чакащи
        </button>
        <button type="button" className={`btn ${status === "upcoming" ? "btn-active" : ""}`} onClick={() => push("upcoming")}>
          Предстоящи
        </button>
        <button type="button" className={`btn ${status === "past" ? "btn-active" : ""}`} onClick={() => push("past")}>
          Минали
        </button>
        <button type="button" className={`btn ${status === "cancelled" ? "btn-active" : ""}`} onClick={() => push("cancelled")}>
          Отказани
        </button>
        <button type="button" className={`btn ${status === "all" ? "btn-active" : ""}`} onClick={() => push("all")}>
          Всички
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className="group mobile-only">
        <span className="label">Филтър:</span>
        <select className="select" value={status} onChange={(e) => push(e.target.value)}>
          <option value="pending">Чакащи</option>
          <option value="upcoming">Предстоящи</option>
          <option value="past">Минали</option>
          <option value="cancelled">Отказани</option>
          <option value="all">Всички</option>
        </select>
      </div>
    </div>
  );
}
