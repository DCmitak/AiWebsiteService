// app/admin/_components/ColorFieldClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function ColorFieldClient({
  name,
  label,
  defaultValue,
  help,
}: {
  name: string;
  label: string;
  defaultValue: string;
  help?: string;
}) {
  const safe = useMemo(() => {
    const v = (defaultValue || "").trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : "#000000";
  }, [defaultValue]);

  // IMPORTANT: render color input only after mount (prevents hydration mismatch with extensions)
  const [mounted, setMounted] = useState(false);
  const [color, setColor] = useState(safe);

  useEffect(() => {
    setMounted(true);
    setColor(safe);
  }, [safe]);

  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-600">{label}</div>

      {/* Hidden canonical value that always submits (picker value) */}
      <input type="hidden" name={name} value={color} />

      <div className="flex items-center gap-3">
        {/* Render the native color picker only after mount (no hydration mismatch) */}
        {mounted ? (
          <input
            type="color"
            defaultValue={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-14 rounded-lg border border-gray-300 bg-white p-1"
            title={label}
          />
        ) : (
          // SSR/first paint placeholder (keeps layout stable)
          <div className="h-11 w-14 rounded-lg border border-gray-300 bg-white p-1" />
        )}

        {/* Optional manual hex override field.
            Leave empty unless the user wants to paste a hex value. */}
        <input
          type="text"
          name={`${name}_text`}
          defaultValue=""
          placeholder={color}
          className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>

      <div className="text-xs text-gray-500">
        {help ||
          "Ползвай picker или напиши hex (#RRGGBB). Ако напишеш текст, той има предимство."}
      </div>
    </div>
  );
}
