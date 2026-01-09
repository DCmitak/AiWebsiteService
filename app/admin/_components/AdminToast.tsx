// app/admin/_components/AdminToast.tsx
export default function AdminToast({ toast }: { toast?: string }) {
  if (!toast) return null;

  const map: Record<string, { text: string; tone: "success" | "error" }> = {
    // generic CRUD
    added: { text: "Added successfully.", tone: "success" },
    saved: { text: "Saved successfully.", tone: "success" },
    deleted: { text: "Deleted successfully.", tone: "success" },
    moved: { text: "Order updated.", tone: "success" },
    replaced: { text: "Image replaced.", tone: "success" },

    // gallery / uploads
    missing_file: { text: "Please choose a file first.", tone: "error" },
    upload_failed: { text: "Upload failed. Please try again.", tone: "error" },
    file_too_large: { text: "File too large (max 10MB).", tone: "error" },

    // bookings
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
