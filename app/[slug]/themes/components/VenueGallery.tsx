// app/[slug]/themes/components/VenueGallery.tsx
"use client";

import React, { useMemo, useState } from "react";
import Lightbox from "./Lightbox";

type Img = { id: string; image_url: string };

export default function VenueGallery({ venue }: { venue: Img[] }) {
  const items = useMemo(
    () => venue.slice(0, 9).map((x) => ({ src: x.image_url, alt: "" })),
    [venue]
  );

  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (!items.length) return null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venue.slice(0, 9).map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setStartIndex(i);
              setOpen(true);
            }}
            aria-label="Отвори снимка"
            className="
              cursor-pointer
              block w-full overflow-hidden rounded-2xl
              border border-black/10 bg-white shadow-sm
              hover:shadow-md transition text-left
            "
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image_url}
              alt=""
              draggable={false}
              className="h-64 w-full object-cover cursor-pointer"
            />
          </button>
        ))}
      </div>

      {open ? (
        <Lightbox
          items={items}
          startIndex={startIndex}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
