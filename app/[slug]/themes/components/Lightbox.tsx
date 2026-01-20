// app/[slug]/themes/components/Lightbox.tsx
"use client";

import React, { useEffect, useState } from "react";

type Item = { src: string; alt?: string };

export default function Lightbox({
  items,
  startIndex,
  onClose,
}: {
  items: Item[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);

  const len = items.length;
  const active = items[idx]?.src || "";

  const prev = () => setIdx((i) => (i - 1 + len) % len);
  const next = () => setIdx((i) => (i + 1) % len);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);

  if (!active) return null;

  return (
    <div
      className="lb-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="lb-shell">
        <button type="button" className="lb-close" onClick={onClose} aria-label="Затвори">
          ×
        </button>

        {len > 1 ? (
          <>
            <button type="button" className="lb-nav lb-left" onClick={prev} aria-label="Предишна">
              ←
            </button>
            <button type="button" className="lb-nav lb-right" onClick={next} aria-label="Следваща">
              →
            </button>
          </>
        ) : null}

        <div className="lb-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active} alt={items[idx]?.alt || ""} />
        </div>

        <div className="lb-meta" aria-hidden>
          {idx + 1} / {len}
        </div>
      </div>

      <style jsx>{`
        .lb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 16px;
        }

        .lb-shell {
          position: relative;
          width: min(1100px, 100%);
          max-height: calc(100vh - 32px);
          display: grid;
          place-items: center;
        }

        .lb-media {
          width: 100%;
          max-height: calc(100vh - 120px);
          border-radius: 18px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.35);
          display: grid;
          place-items: center;
        }

        .lb-media img {
          width: 100%;
          height: 100%;
          max-height: calc(100vh - 120px);
          object-fit: contain;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .lb-close {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: none;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
        }

        .lb-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border-radius: 999px;
          border: none;
          background: #ffffff;
          color: #111827;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22);
          font-size: 22px;
          cursor: pointer;
        }

        .lb-left {
          left: -10px;
        }
        .lb-right {
          right: -10px;
        }

        .lb-meta {
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          letter-spacing: 0.02em;
        }

        @media (max-width: 640px) {
          .lb-left {
            left: 6px;
          }
          .lb-right {
            right: 6px;
          }
          .lb-close {
            top: 6px;
            right: 6px;
          }
        }
      `}</style>
    </div>
  );
}
