export default function AdminToast({ toast }: { toast?: string }) {
  if (!toast) return null;

  const text =
    toast === "added"
      ? "Added successfully."
      : toast === "saved"
      ? "Saved successfully."
      : toast === "deleted"
      ? "Deleted successfully."
      : toast === "moved"
      ? "Order updated."
      : "Done.";

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      {text}
    </div>
  );
}
