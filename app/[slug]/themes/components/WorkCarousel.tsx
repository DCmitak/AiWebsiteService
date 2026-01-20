// app\[slug]\themes\components\WorkCarousel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Lightbox from "./Lightbox";

type ImgItem = { id: string; image_url: string };

type Props = {
  items: ImgItem[];
  autoplayMs?: number;
};

export default function WorkCarousel({ items, autoplayMs = 4000 }: Props) {
  const baseItems = useMemo(
    () => (Array.isArray(items) ? items.filter((x) => x && x.image_url) : []),
    [items]
  );
  const len = baseItems.length;
  const lbItems = useMemo(
    () => baseItems.map((x) => ({ src: x.image_url, alt: "" })),
    [baseItems]
  );


  const [perView, setPerView] = useState(4);
  const [index, setIndex] = useState(0);
  const [withAnim, setWithAnim] = useState(true);

  // Lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const autoplayRef = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // responsive perView
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      let pv = 1;
      if (w >= 1024) pv = 4;
      else if (w >= 640) pv = 2;
      else pv = 1;
      setPerView(pv);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const canSlide = len > perView;

  // infinite loop clones
  const extended = useMemo(() => {
    if (!len) return [] as Array<ImgItem & { __baseIndex: number }>;
    const k = Math.min(perView, len);

    const head = baseItems.slice(0, k).map((it, i) => ({ ...it, __baseIndex: i }));
    const tail = baseItems.slice(-k).map((it, i) => ({ ...it, __baseIndex: len - k + i }));
    const mid = baseItems.map((it, i) => ({ ...it, __baseIndex: i }));

    return [...tail, ...mid, ...head];
  }, [baseItems, len, perView]);

  // reset index when perView/len changes
  useEffect(() => {
    if (!len) {
      setIndex(0);
      return;
    }
    const k = Math.min(perView, len);
    setWithAnim(false);
    setIndex(k);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setWithAnim(true));
    });
  }, [perView, len]);

  // autoplay helpers (PAUSE/RESUME вместо "kill")
  const clearAutoplay = () => {
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };

  const startAutoplay = () => {
    if (!canSlide) return;
    clearAutoplay();
    autoplayRef.current = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, autoplayMs);
  };

  const restartAutoplay = () => {
    if (!canSlide) return;
    startAutoplay();
  };

  // старт при mount / промяна на условията
  useEffect(() => {
    if (lbOpen) {
      clearAutoplay();
      return;
    }
    startAutoplay();
    return () => clearAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide, autoplayMs, lbOpen]);

  // loop corrections
  const jumpNoAnim = (to: number) => {
    setWithAnim(false);
    setIndex(to);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setWithAnim(true));
    });
  };

  const onTransitionEnd = () => {
    if (!len) return;
    const k = Math.min(perView, len);

    if (index >= k + len) {
      jumpNoAnim(index - len);
      return;
    }
    if (index < k) {
      jumpNoAnim(index + len);
      return;
    }
  };

  const prev = () => {
    if (!canSlide) return;
    clearAutoplay(); // да не смени веднага след клика
    setIndex((i) => i - 1);
    restartAutoplay();
  };

  const next = () => {
    if (!canSlide) return;
    clearAutoplay();
    setIndex((i) => i + 1);
    restartAutoplay();
  };

  // transform
  const baseTranslatePct = perView ? (index * 100) / perView : 0;

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = withAnim ? "transform 420ms ease" : "none";
  }, [withAnim]);

  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translate3d(-${baseTranslatePct}%,0,0)`;
  }, [baseTranslatePct]);

  // lightbox controls
  const openLightbox = (baseIdx: number) => {
    if (!len) return;
    clearAutoplay(); // пауза докато е отворен
    setLbIndex(Math.max(0, Math.min(baseIdx, len - 1)));
    setLbOpen(true);
  };

  const closeLightbox = () => {
    setLbOpen(false);
    // autoplay ще тръгне пак от useEffect([lbOpen])
  };

  if (!len) return null;

  return (
    <div className="wc-root">
      <div className="wc-viewport">
        <div ref={trackRef} className="wc-track" onTransitionEnd={onTransitionEnd}>
          {extended.map((img, i) => (
            <div
              key={`${img.id}-${i}`}
              className="wc-slide"
              style={{
                flex: `0 0 calc(100% / ${perView})`,
                maxWidth: `calc(100% / ${perView})`,
              }}
            >
              <button
                type="button"
                className="wc-inner"
                onClick={() => openLightbox(img.__baseIndex)}
                aria-label="Отвори снимка"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" draggable={false} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {canSlide ? (
        <>
          <button type="button" className="wc-arrow wc-arrow-left" onClick={prev} aria-label="Назад">
            ←
          </button>
          <button type="button" className="wc-arrow wc-arrow-right" onClick={next} aria-label="Напред">
            →
          </button>
        </>
      ) : null}

      {lbOpen ? (
        <Lightbox items={lbItems} startIndex={lbIndex} onClose={closeLightbox} />
      ) : null}

      <style jsx>{`
        .wc-root {
          position: relative;
          width: 100%;
          max-width: 100%;
          overflow-x: clip;
        }

        .wc-viewport {
          overflow: hidden;
          width: 100%;
          padding: 0;
          box-sizing: border-box;
        }

        .wc-track {
          display: flex;
          width: 100%;
          will-change: transform;
        }

        .wc-slide {
          padding: 0 10px;
          box-sizing: border-box;
        }

        .wc-inner {
          width: 100%;
          height: 100%;
          border-radius: 18px;
          overflow: hidden;
          background: #f3ece8;
          aspect-ratio: 4 / 3;
          border: none;
          padding: 0;
          display: block;
          cursor: pointer;
        }

        .wc-inner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }

        .wc-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: none;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
          display: grid;
          place-items: center;
          font-size: 22px;
          line-height: 1;
          color: #111827;
          cursor: pointer;
          z-index: 5;
        }

        .wc-arrow-left {
          left: 12px;
        }
        .wc-arrow-right {
          right: 12px;
        }

        @media (max-width: 640px) {
          .wc-arrow {
            width: 34px;
            height: 34px;
            font-size: 18px;
          }
          .wc-arrow-left {
            left: 8px;
          }
          .wc-arrow-right {
            right: 8px;
          }
        }
      `}</style>
    </div>
  );
}
