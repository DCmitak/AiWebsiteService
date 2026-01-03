import { supabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type BookingRow = {
  id: string;
  client_id: string;
  status: string;
  cancel_token: string | null;
  start_at: string;
};

export default async function CancelPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const [{ slug }, { token, done }] = await Promise.all([props.params, props.searchParams]);

  if (done === "1") {
    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow space-y-3">
          <h1 className="text-2xl font-semibold">Резервацията е отказана</h1>
          <p className="text-gray-700">Благодарим. Ако имате нужда, запишете нов час.</p>
          <a className="underline" href={`/${slug}`}>
            Обратно към сайта
          </a>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">Липсва token.</div>
      </main>
    );
  }

  const sb = supabaseServer();

  const { data: booking } = await sb
    .from("bookings")
    .select("id, client_id, status, cancel_token, start_at")
    .eq("cancel_token", token)
    .maybeSingle<BookingRow>();

  if (!booking) {
    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">Невалиден или изтекъл линк.</div>
      </main>
    );
  }

  if (booking.status === "cancelled") {
    return (
      <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-xl mx-auto bg-white p-6 rounded shadow space-y-3">
          <h1 className="text-2xl font-semibold">Резервацията вече е отказана</h1>
          <a className="underline" href={`/${slug}`}>
            Обратно към сайта
          </a>
        </div>
      </main>
    );
  }

  async function confirmCancel(formData: FormData) {
    "use server";

    const tokenFromForm = String(formData.get("token") || "");
    if (!tokenFromForm) {
      redirect(`/${slug}/cancel?token=${encodeURIComponent(token || "")}&done=0`);
    }

    const sb2 = supabaseServer();

    // Re-fetch by token (do not rely on outer `booking`)
    const { data: b } = await sb2
      .from("bookings")
      .select("id, client_id, status")
      .eq("cancel_token", tokenFromForm)
      .maybeSingle<{ id: string; client_id: string; status: string }>();

    if (!b) {
      redirect(`/${slug}/cancel?token=${encodeURIComponent(tokenFromForm)}&done=0`);
    }

    if (b.status === "cancelled") {
      redirect(`/${slug}/cancel?done=1`);
    }

    const { error } = await sb2
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", b.id)
      .eq("cancel_token", tokenFromForm);

    if (error) {
      redirect(`/${slug}/cancel?token=${encodeURIComponent(tokenFromForm)}&done=0`);
    }

    revalidatePath(`/admin/${slug}/bookings`);
    redirect(`/${slug}/cancel?done=1`);
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow space-y-4">
        <h1 className="text-2xl font-semibold">Отказ на резервация</h1>
        <p className="text-gray-700">Сигурни ли сте, че искате да откажете резервацията си?</p>

        <form action={confirmCancel}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="px-4 py-3 rounded bg-red-600 text-white font-semibold hover:opacity-90"
          >
            Да, откажи резервацията
          </button>
        </form>

        <a className="underline text-sm text-gray-700" href={`/${slug}`}>
          Не, обратно към сайта
        </a>
      </div>
    </main>
  );
}
