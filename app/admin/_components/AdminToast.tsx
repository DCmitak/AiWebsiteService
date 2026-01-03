export default function AdminToast({ toast }: { toast?: string }) {
  if (!toast) return null;

  const map: Record<string, { text: string; tone: "success" | "error" }> = {
    added: { text: "Added successfully.", tone: "success" },
    saved: { text: "Saved successfully.", tone: "success" },
    deleted: { text: "Deleted successfully.", tone: "success" },
    moved: { text: "Order updated.", tone: "success" },

    confirmed: { text: "Резервацията е потвърдена (confirmed).", tone: "success" },
    cancelled: { text: "Резервацията е отказана (cancelled).", tone: "success" },
    error: { text: "Грешка. Опитай отново.", tone: "error" },
  };

  const item = map[toast] ?? { text: "Done.", tone: "success" };

  const cls =
    item.tone === "error"
      ? "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      : "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800";

  return <div className={cls}>{item.text}</div>;
}
