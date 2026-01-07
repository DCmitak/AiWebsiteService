// app/[slug]/book/page.tsx
import BookingClient from "./ui";

const TZ = "Europe/Sofia";

function todayYMDInSofia() {
  // Use Date.now() to avoid any weirdness with serverless snapshots
  const now = new Date(Date.now());

  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export default async function BookPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const [{ slug }, { serviceId }] = await Promise.all([props.params, props.searchParams]);

  if (!serviceId) {
    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
          <h1 className="text-xl font-semibold mb-2">Липсва услуга</h1>
          <p className="text-gray-700">
            Моля, отвори страницата с параметър <code>?serviceId=...</code>.
          </p>
        </div>
      </main>
    );
  }

  const initialDate = todayYMDInSofia();

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-3xl mx-auto">
        <BookingClient slug={slug} serviceId={serviceId} initialDate={initialDate} />
      </div>
    </main>
  );
}
