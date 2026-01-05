// app/admin/[slug]/bookings/_components/BookingsPrimaryNav.tsx
import Link from "next/link";

export default function BookingsPrimaryNav({
  tableHref,
  calendarHref,
  activeView,
}: {
  tableHref: string;
  calendarHref: string;
  activeView: "table" | "calendar";
}) {
  return (
    <div className="bookings-primary">
      <Link className={`tab ${activeView === "table" ? "tab-active" : ""}`} href={tableHref}>
        Таблица
      </Link>
      <Link className={`tab ${activeView === "calendar" ? "tab-active" : ""}`} href={calendarHref}>
        Календар
      </Link>
    </div>
  );
}
