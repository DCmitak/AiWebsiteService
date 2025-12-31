export default function MinimalTheme({
  client,
  settings,
  services,
  gallery,
  reviews,
}: {
  client: { business_name: string; city: string; slug: string };
  settings: any;
  services: any[];
  gallery: any[];
  reviews: any[];
}) {
  const primary = settings?.primary_color || "#111827";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{client.business_name}</div>
            <div className="text-sm text-gray-500">{client.city}</div>
          </div>
          <a
            href={settings?.booking_url || "#book"}
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{ background: primary }}
          >
            Запази час
          </a>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <h1 className="text-4xl font-semibold">{settings?.tagline || "Красота с внимание към детайла."}</h1>
        <p className="mt-4 text-gray-600 max-w-3xl">
          {settings?.about_text || "Добави about_text в Settings."}
        </p>
      </section>
    </main>
  );
}
