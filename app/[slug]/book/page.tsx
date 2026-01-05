//app\[slug]\book\page.tsx
import BookingClient from "./ui";

function todayYMD(timeZone = "Europe/Sofia") {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

  const initialDate = todayYMD("Europe/Sofia");

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-3xl mx-auto">
        <BookingClient slug={slug} serviceId={serviceId} initialDate={initialDate} />
      </div>
    </main>
  );
}
