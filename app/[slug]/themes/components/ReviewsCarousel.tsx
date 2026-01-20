//app\[slug]\themes\ReviewsCarousel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Review } from "../../types";
import "./ReviewsCarousel.css";

type Props = {
  reviews: Review[];
  primary?: string;
  autoplayMs?: number;
  /** background color of the section (must match Minimal section background) */
  bg?: string;
};

export default function ReviewsCarousel({
  reviews,
  primary = "#B2773D",
  autoplayMs = 3500,
  bg = "#F7EFEE",
}: Props) {
  const items = useMemo(() => (Array.isArray(reviews) ? reviews.filter(Boolean) : []), [reviews]);
  const len = items.length;

  // IMPORTANT: never conditionally call hooks -> no early return before hooks
  const [perView, setPerView] = useState(1);
  const [withAnim, setWithAnim] = useState(true);
  const [index, setIndex] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const intervalRef = useRef<number | null>(null);
  const resumeRef = useRef<number | null>(null);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);

  // responsive perView
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      const pv = w >= 1280 ? 5 : w >= 1024 ? 3 : w >= 768 ? 2 : 1;
      setPerView(pv);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const clones = Math.min(perView, len);
  const canSlide = len > perView;

  const extended = useMemo(() => {
    if (!len) return [];
    const k = Math.min(perView, len);
    const head = items.slice(0, k);
    const tail = items.slice(-k);
    return [...tail, ...items, ...head];
  }, [items, len, perView]);

  // init / reset index when len or perView changes
  useEffect(() => {
    if (!len) {
      setIndex(0);
      return;
    }
    const k = Math.min(perView, len);
    setWithAnim(false);
    setIndex(k);

    requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      trackRef.current?.offsetHeight;
      requestAnimationFrame(() => setWithAnim(true));
    });
  }, [perView, len]);

  const clearResume = () => {
    if (resumeRef.current) window.clearTimeout(resumeRef.current);
    resumeRef.current = null;
  };

  const stopAutoplay = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    clearResume();
  };

  const startAutoplay = () => {
    if (!canSlide) return;
    stopAutoplay();
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, autoplayMs);
  };

  const resumeAutoplayLater = (ms = 1400) => {
    if (!canSlide) return;
    clearResume();
    resumeRef.current = window.setTimeout(() => startAutoplay(), ms);
  };

  // pause/resume when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide, autoplayMs]);

  // autoplay lifecycle
  useEffect(() => {
    if (!canSlide) return;
    startAutoplay();
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide, autoplayMs]);

  const jumpNoAnim = (to: number) => {
    setWithAnim(false);
    setIndex(to);
    requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      trackRef.current?.offsetHeight;
      requestAnimationFrame(() => setWithAnim(true));
    });
  };

  // translate percent
  const baseTranslatePct = perView ? (index * 100) / perView : 0;

  const applyTransform = (dragPx = 0) => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translate3d(-${baseTranslatePct}%,0,0) translate3d(${dragPx}px,0,0)`;
  };

  // sync transform
  useEffect(() => {
    if (!trackRef.current) return;
    if (!isDraggingRef.current) applyTransform(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, perView]);

  // sync transition
  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = withAnim ? "transform 450ms ease" : "none";
  }, [withAnim]);

  const onTransitionEnd = () => {
    if (!len) return;
    const k = Math.min(perView, len);

    // passed the real items into head clones => jump back by len
    if (index >= k + len) {
      jumpNoAnim(index - len);
      return;
    }

    // moved into tail clones => jump forward by len
    if (index < k) {
      jumpNoAnim(index + len);
      return;
    }
  };

  // manual controls: stop autoplay immediately
  const prev = () => {
    if (!canSlide) return;
    stopAutoplay();
    setIndex((i) => i - 1);
    resumeAutoplayLater();
  };

  const next = () => {
    if (!canSlide) return;
    stopAutoplay();
    setIndex((i) => i + 1);
    resumeAutoplayLater();
  };

  // drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSlide) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    stopAutoplay();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    dragXRef.current = 0;

    setWithAnim(false);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    dragXRef.current = dx;
    applyTransform(dx);
  };

  const endDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = dragXRef.current;
    dragXRef.current = 0;

    const vw = viewportRef.current?.clientWidth || 1;
    const slideW = vw / perView;
    const threshold = slideW * 0.18;

    setWithAnim(true);

    if (dx <= -threshold) setIndex((i) => i + 1);
    else if (dx >= threshold) setIndex((i) => i - 1);
    else requestAnimationFrame(() => applyTransform(0));

    resumeAutoplayLater(1400);
  };

  // render guard (AFTER hooks!)
  if (!len) return null;

  return (
    <div className="rc-wrap" style={{ ["--rc-primary" as any]: primary, ["--rc-bg" as any]: bg }}>
      {/* VIEWPORT */}
      <div
        ref={viewportRef}
        className="rc-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (isDraggingRef.current) endDrag();
        }}
        style={{
          cursor: canSlide ? (isDraggingRef.current ? "grabbing" : "grab") : "default",
          touchAction: "pan-y",
        }}
      >
        {/* MASKS: these eliminate any “peeking” fragments at the edges */}
        <div className="rc-mask rc-mask-left" aria-hidden />
        <div className="rc-mask rc-mask-right" aria-hidden />

        <div ref={trackRef} className="rc-track" onTransitionEnd={onTransitionEnd}>
          {extended.map((r, i) => (
            <div
              key={`${r.id ?? "rev"}-${i}`}
              className="rc-col"
              style={{
                flex: `0 0 calc(100% / ${perView})`,
                maxWidth: `calc(100% / ${perView})`,
              }}
            >
              <article className="rc-slide">
                <div className="rc-head">
                  <div className="rc-avatar" aria-hidden />
                  <div className="rc-meta">
                    <div className="rc-author">{r.author}</div>
                    <div className="rc-rating" aria-label={`Оценка: ${normalizeRating(r.rating)} от 5`}>
                      <Stars value={normalizeRating(r.rating)} />
                    </div>
                  </div>
                </div>

                <p className="rc-text">{r.text}</p>
              </article>
            </div>
          ))}
        </div>
      </div>

      {/* ARROWS: outside cards */}
      {canSlide ? (
        <>
          <button type="button" onClick={prev} aria-label="Previous reviews" className="rc-arrow rc-arrow-left">
            ←
          </button>
          <button type="button" onClick={next} aria-label="Next reviews" className="rc-arrow rc-arrow-right">
            →
          </button>
        </>
      ) : null}
    </div>
  );
}

function normalizeRating(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(5, Math.round(n)));
}

function Stars({ value }: { value: number }) {
  // 5 звезди, запълваме value
  return (
    <div className="rc-stars" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} filled={i < value} />
      ))}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={filled ? "rc-star rc-star-filled" : "rc-star rc-star-empty"}
      focusable="false"
      aria-hidden="true"
    >
      <path d="M12 17.27l5.18 3.12-1.64-5.81L20.5 9.5l-6.0-.52L12 3.5 9.5 8.98l-6.0.52 4.96 5.08-1.64 5.81L12 17.27z" />
    </svg>
  );
}
