// app/admin/[slug]/reviews/page.tsx
import { supabaseServer } from "@/lib/supabase-server";
import Link from "next/link";
import { revalidatePath } from "next/cache";

type ReviewRow = {
  id: string;
  client_id: string;
  author: string;
  rating: number;
  text: string;
  created_at: string;
};

export default async function AdminReviews(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const [{ slug }, { key }] = await Promise.all([props.params, props.searchParams]);

  if (!key || key !== process.env.ADMIN_KEY) {
    return <div className="p-8">Unauthorized</div>;
  }

  const sb = supabaseServer();

  // 1) Get client by slug
  const { data: client, error: clientErr } = await sb
    .from("clients")
    .select("id, slug, business_name")
    .eq("slug", slug)
    .maybeSingle();

  if (clientErr) return <div className="p-8">DB error: {clientErr.message}</div>;
  if (!client) return <div className="p-8">Client not found</div>;

  // 2) Load reviews for this client
  const { data: reviews, error: reviewsErr } = await sb
    .from("reviews")
    .select("id, client_id, author, rating, text, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (reviewsErr) return <div className="p-8">DB error: {reviewsErr.message}</div>;

  async function addReview(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const clientId = formData.get("client_id")?.toString();
    if (!clientId) throw new Error("Missing client_id");

    const author = (formData.get("author")?.toString() || "").trim();
    const text = (formData.get("text")?.toString() || "").trim();
    const ratingRaw = (formData.get("rating")?.toString() || "").trim();
    const rating = Math.max(1, Math.min(5, Number(ratingRaw || 5)));

    if (!author) throw new Error("Missing author");
    if (!text) throw new Error("Missing text");
    if (!Number.isFinite(rating)) throw new Error("Invalid rating");

    const sb = supabaseServer();
    const { error } = await sb.from("reviews").insert({
      client_id: clientId,
      author,
      rating,
      text,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/reviews`);
  }

  async function deleteReview(formData: FormData) {
    "use server";

    const key = formData.get("key")?.toString();
    if (!key || key !== process.env.ADMIN_KEY) throw new Error("Unauthorized");

    const id = formData.get("id")?.toString();
    const clientId = formData.get("client_id")?.toString();
    if (!id) throw new Error("Missing id");
    if (!clientId) throw new Error("Missing client_id");

    const sb = supabaseServer();

    // Extra safety: delete only if it belongs to this client
    const { error } = await sb.from("reviews").delete().eq("id", id).eq("client_id", clientId);

    if (error) throw new Error(error.message);

    revalidatePath(`/${slug}`);
    revalidatePath(`/admin/${slug}/reviews`);
  }

  const adminBase = `/admin/${client.slug}`;
  const backUrl = `${adminBase}?key=${encodeURIComponent(key)}`;
  const settingsUrl = `${adminBase}/settings?key=${encodeURIComponent(key)}`;
  const publicUrl = `/${client.slug}`;

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Reviews: {client.business_name}</h1>
            <div className="text-sm text-gray-500">slug: {client.slug}</div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link
              href={backUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              ← Back
            </Link>

            <Link
              href={settingsUrl}
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
            >
              Settings →
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

        {/* Add review */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="font-semibold">Add review</div>

          <form action={addReview} className="grid gap-4">
            <input type="hidden" name="key" value={key} />
            <input type="hidden" name="client_id" value={client.id} />

            <div className="grid md:grid-cols-2 gap-4">
              <Field name="author" label="Автор" placeholder="напр. Мария П." />
              <label className="block space-y-1">
                <div className="text-sm text-gray-600">Оценка (1–5)</div>
                <select
                  name="rating"
                  defaultValue="5"
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </label>
            </div>

            <TextArea name="text" label="Текст" placeholder="Напиши отзива тук..." rows={4} />

            <div className="flex items-center gap-3">
              <button className="px-5 py-3 rounded-lg bg-black text-white font-semibold hover:bg-gray-800 transition">
                Add
              </button>
              <div className="text-sm text-gray-500">
                След Add: refresh на <code className="px-2 py-1 bg-gray-100 rounded">{publicUrl}</code>
              </div>
            </div>
          </form>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="font-semibold">All reviews ({(reviews?.length || 0).toString()})</div>

          {!reviews?.length ? (
            <div className="text-sm text-gray-600">Няма добавени отзиви.</div>
          ) : (
            <div className="divide-y">
              {(reviews as ReviewRow[]).map((r) => (
                <div key={r.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-semibold">{r.author}</div>
                      <Stars rating={r.rating} />
                      <div className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.text}</p>
                  </div>

                  <form action={deleteReview} className="shrink-0">
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 font-semibold hover:bg-gray-100 transition"
                      aria-label={`Delete review ${r.id}`}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-sm text-gray-500">
          * Засега достъпът е с <code>?key=</code>. По-късно го заменяме с login.
        </p>
      </div>
    </main>
  );
}

/* ---------------- UI helpers ---------------- */

function Field({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  rows,
}: {
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="text-sm text-gray-600">{label}</div>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={rows ?? 6}
        className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(1, Math.min(5, Number(rating || 5)));
  return (
    <div className="flex items-center gap-1" aria-label={`Rating ${r} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < r ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}
