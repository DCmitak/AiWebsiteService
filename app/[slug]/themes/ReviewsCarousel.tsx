"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Review } from "../types";

type Props = {
  reviews: Review[];
  primary?: string;
  autoplayMs?: number;
};

export default function ReviewsCarousel({
  reviews,
  primary = "#B2773D",
  autoplayMs = 3500,
}: Props) {
  const items = Array.isArray(reviews) ? reviews.filter(Boolean) : [];
  const len = items.length;

  const [perView, setPerView] = useState(1);

  const [withAnim, setWithAnim] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const timerRef = useRef<number | null>(null);

  // drag refs
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);

  // clones count = perView (or len if len < perView)
  const clones = Math.min(perView, len);

  // index starts after the leading clones
  const [index, setIndex] = useState(clones);

  const canSlide = len > perView;

  // responsive perView
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      const pv = w >= 1024 ? 3 : w >= 768 ? 2 : 1;
      setPerView(pv);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // build extended list: tail clones + items + head clones
  const extended = useMemo(() => {
    if (!len) return [];
    const k = Math.min(perView, len);
    const head = items.slice(0, k);
    const tail = items.slice(-k);
    return [...tail, ...items, ...head];
  }, [items, len, perView]);

  // When perView or len changes, reset to the first real slide seamlessly
  useEffect(() => {
    if (!len) return;
    const k = Math.min(perView, len);

    setWithAnim(false);
    setIndex(k);

    requestAnimationFrame(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      trackRef.current?.offsetHeight;
      requestAnimationFrame(() => setWithAnim(true));
    });
  }, [perView, len]);

  const stopAutoplay = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startAutoplay = () => {
    if (!canSlide) return;
    stopAutoplay();
    timerRef.current = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, autoplayMs);
  };

  // autoplay
  useEffect(() => {
    if (!canSlide) return;
    startAutoplay();
    return () => stopAutoplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSlide, autoplayMs]);

  // helper: jump to index WITHOUT animation, then re-enable animation next frame
  const jumpNoAnim = (to: number) => {
    setWithAnim(false);
    setIndex(to);

    requestAnimationFrame(() => {
      // commit layout with no transition
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      trackRef.current?.offsetHeight;
      requestAnimationFrame(() => setWithAnim(true));
    });
  };

  // seamless looping on transition end
    const onTransitionEnd = () => {
    if (!len) return;
    const k = Math.min(perView, len);

    if (index === k + len) {
        jumpNoAnim(k);
        return;
    }

    if (index === k - 1) {
        jumpNoAnim(k + len - 1);
        return;
    }
    };

  const prev = () => {
    if (!canSlide) return;
    setIndex((i) => i - 1);
  };

  const next = () => {
    if (!canSlide) return;
    setIndex((i) => i + 1);
  };

  // translate step must be (100 / perView) per slide
  const baseTranslatePct = (index * 100) / perView;

  // drag adds pixel offset on top of base translate
  const transformStyle = () => {
    const dragPx = dragXRef.current || 0;
    // We use translateX(%) + translateX(px) so both can combine cleanly.
    // Negative because base is moving left; dragPx is raw pointer delta.
    return `translateX(-${baseTranslatePct}%) translateX(${dragPx}px)`;
  };

  // pointer drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    if (!canSlide) return;

    // only left click / touch
    if (e.pointerType === "mouse" && e.button !== 0) return;

    stopAutoplay();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    dragXRef.current = 0;

    // no animation while dragging
    setWithAnim(false);

    // capture so we continue to receive move/up
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    dragXRef.current = dx;

    // apply transform live
    if (trackRef.current) {
      trackRef.current.style.transform = transformStyle();
    }
  };

  const endDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = dragXRef.current;
    dragXRef.current = 0;

    const vw = viewportRef.current?.clientWidth || 1;
    const slideW = vw / perView;

    // threshold: 18% of one slide width
    const threshold = slideW * 0.18;

    // re-enable animation for snap/slide
    setWithAnim(true);

    // decide direction
    if (dx <= -threshold) {
      // dragged left -> next
      setIndex((i) => i + 1);
    } else if (dx >= threshold) {
      // dragged right -> prev
      setIndex((i) => i - 1);
    } else {
      // snap back (index unchanged, but we must force transform back)
      requestAnimationFrame(() => {
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${baseTranslatePct}%)`;
        }
      });
    }

    // resume autoplay after a short pause
    window.setTimeout(() => {
      startAutoplay();
    }, 900);
  };

  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onPointerLeave = () => {
    // if the pointer leaves while dragging, treat it as end
    if (isDraggingRef.current) endDrag();
  };

  // keep transform in sync when index changes or animation toggles
  useEffect(() => {
    if (!trackRef.current) return;
    // If not dragging, ensure transform is correct and dragPx is 0
    if (!isDraggingRef.current) {
      trackRef.current.style.transform = `translateX(-${baseTranslatePct}%)`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, perView]);

  // keep transition style in sync
  useEffect(() => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = withAnim ? "transform 450ms ease" : "none";
  }, [withAnim]);

  if (!len) return null;

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        className="overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerLeave}
        style={{
          cursor: canSlide ? (isDraggingRef.current ? "grabbing" : "grab") : "default",
          touchAction: "pan-y", // allow vertical scroll, we handle horizontal
        }}
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: `translateX(-${baseTranslatePct}%)`,
            transition: withAnim ? "transform 450ms ease" : "none",
            willChange: "transform",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {extended.map((r, i) => (
            <div
              key={`${r.id ?? "rev"}-${i}`}
              className="px-3"
              style={{
                flex: `0 0 calc(100% / ${perView})`,
                maxWidth: `calc(100% / ${perView})`,
              }}
            >
              <ReviewCard r={r} primary={primary} />
            </div>
          ))}
        </div>
      </div>

      {canSlide ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous reviews"
            className="hidden md:grid place-items-center absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 border border-black/10 shadow hover:bg-white transition"
          >
            ←
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next reviews"
            className="hidden md:grid place-items-center absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 border border-black/10 shadow hover:bg-white transition"
          >
            →
          </button>
        </>
      ) : null}
    </div>
  );
}

function ReviewCard({ r, primary }: { r: Review; primary: string }) {
  return (
    <div className="bg-white border border-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-8 h-full">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full border-4" style={{ borderColor: `${primary}66` }} />
        <div className="min-w-0">
          <div className="font-serif text-xl font-semibold truncate">{r.author}</div>
          <div className="text-sm opacity-70">оценка: {r.rating}/5</div>
        </div>
      </div>
      <p className="mt-6 opacity-80 leading-relaxed">{r.text}</p>
    </div>
  );
}
