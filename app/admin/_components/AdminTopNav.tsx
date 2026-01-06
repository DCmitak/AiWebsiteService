// app/admin/_components/AdminTopNav.tsx
import Link from "next/link";

export default function AdminTopNav({
  slug,
  businessName,
  keyParam,
  active,
}: {
  slug: string;
  businessName: string;
  keyParam: string;
  active:
    | "dashboard"
    | "settings"
    | "services"
    | "gallery"
    | "reviews"
    | "bookings"
    | "availability"
    | "staff";
}) {
  const adminBase = `/admin/${slug}`;
  const q = `?key=${encodeURIComponent(keyParam)}`;

  const dashUrl = `${adminBase}${q}`;
  const settingsUrl = `${adminBase}/settings${q}`;
  const servicesUrl = `${adminBase}/services${q}`;
  const galleryUrl = `${adminBase}/gallery${q}`;
  const reviewsUrl = `${adminBase}/reviews${q}`;
  const bookingsUrl = `${adminBase}/bookings${q}`;
  const availabilityUrl = `${adminBase}/availability${q}`;
  const staffUrl = `${adminBase}/staff${q}`;

  const publicUrl = `/${slug}`;

  const pill = (isActive: boolean) =>
    isActive
      ? "bg-black text-white border-black"
      : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100";

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold">{businessName}</h1>
        <div className="text-sm text-gray-500">slug: {slug}</div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link
          href={dashUrl}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
        >
          ← Dashboard
        </Link>

        <Link href={settingsUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "settings")}`}>
          Settings
        </Link>

        <Link href={servicesUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "services")}`}>
          Services
        </Link>

        <Link href={staffUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "staff")}`}>
          Staff
        </Link>

        <Link href={galleryUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "gallery")}`}>
          Gallery
        </Link>

        <Link href={reviewsUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "reviews")}`}>
          Reviews
        </Link>

        <Link href={bookingsUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "bookings")}`}>
          Bookings
        </Link>

        <Link href={availabilityUrl} className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === "availability")}`}>
          Availability
        </Link>

        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
        >
          View public →
        </a>
      </div>
    </div>
  );
}
