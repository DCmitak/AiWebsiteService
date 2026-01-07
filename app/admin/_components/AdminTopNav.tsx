// app/admin/_components/AdminTopNav.tsx
import Link from "next/link";

type ActiveKey =
  | "dashboard"
  | "settings"
  | "services"
  | "gallery"
  | "reviews"
  | "bookings"
  | "availability"
  | "staff";

export default function AdminTopNav({
  slug,
  businessName,
  keyParam,
  active,
}: {
  slug: string;
  businessName: string;
  keyParam: string;
  active: ActiveKey;
}) {
  const adminBase = `/admin/${slug}`;
  const q = `?key=${encodeURIComponent(keyParam)}`;

  const items: Array<{ key: ActiveKey; label: string; href: string }> = [
    { key: "dashboard", label: "Dashboard", href: `${adminBase}${q}` },
    { key: "settings", label: "Settings", href: `${adminBase}/settings${q}` },
    { key: "services", label: "Services", href: `${adminBase}/services${q}` },
    { key: "staff", label: "Staff", href: `${adminBase}/staff${q}` },
    { key: "gallery", label: "Gallery", href: `${adminBase}/gallery${q}` },
    { key: "reviews", label: "Reviews", href: `${adminBase}/reviews${q}` },
    { key: "bookings", label: "Bookings", href: `${adminBase}/bookings${q}` },
    { key: "availability", label: "Availability", href: `${adminBase}/availability${q}` },
  ];

  const publicUrl = `/${slug}`;

  const pill = (isActive: boolean) =>
    isActive
      ? "bg-black text-white border-black"
      : "bg-white text-gray-900 border-gray-300 hover:bg-gray-100";

  const menuItem = (isActive: boolean) =>
    isActive
      ? "bg-gray-900 text-white"
      : "bg-white text-gray-900 hover:bg-gray-100";

  const activeLabel = items.find((x) => x.key === active)?.label || "Menu";

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      {/* Left: Title */}
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold truncate">{businessName}</h1>
        <div className="text-sm text-gray-500">slug: {slug}</div>
      </div>

      {/* Right: Desktop nav */}
      <div className="hidden md:flex gap-2 flex-wrap justify-end">
        {/* Optional: keep Dashboard as a “back” action */}
        <Link
          href={`${adminBase}${q}`}
          className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
        >
          ← Dashboard
        </Link>

        {items
          .filter((x) => x.key !== "dashboard")
          .map((x) => (
            <Link
              key={x.key}
              href={x.href}
              className={`px-4 py-2 rounded-lg border font-semibold transition ${pill(active === x.key)}`}
            >
              {x.label}
            </Link>
          ))}

        <a
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition"
        >
          View public →
        </a>
      </div>

      {/* Mobile nav (no JS): hamburger dropdown via <details> */}
      <div className="md:hidden w-full">
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`${adminBase}${q}`}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
          >
            Dashboard
          </Link>

          <details className="relative">
            <summary className="list-none cursor-pointer select-none px-4 py-2 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
              ☰ {activeLabel}
            </summary>

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden z-30">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-xs text-gray-500">Admin menu</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{slug}</div>
              </div>

              <div className="p-2 space-y-1">
                {items
                  .filter((x) => x.key !== "dashboard")
                  .map((x) => (
                    <Link
                      key={x.key}
                      href={x.href}
                      className={`block px-3 py-2 rounded-lg text-sm font-semibold transition ${menuItem(
                        active === x.key
                      )}`}
                    >
                      {x.label}
                    </Link>
                  ))}

                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 rounded-lg text-sm font-semibold bg-gray-50 text-gray-900 hover:bg-gray-100 transition"
                >
                  View public →
                </a>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
