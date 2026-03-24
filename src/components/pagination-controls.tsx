"use client";

import type { RefObject } from "react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  scrollToTop?: boolean;
  scrollTargetRef?: RefObject<HTMLElement | null>;
  scrollOffset?: number;
  scrollDurationMs?: number;
  scrollBehavior?: "smooth" | "instant";
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function jumpWindowScroll(targetTop: number) {
  if (typeof window === "undefined") {
    return;
  }

  const boundedTargetTop = Math.max(0, Math.round(targetTop));
  const root = document.documentElement;
  const previousInlineScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: boundedTargetTop, behavior: "auto" });

  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousInlineScrollBehavior;
  });
}

function animateWindowScroll(targetTop: number, durationMs: number) {
  if (typeof window === "undefined") {
    return;
  }

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const startTop = window.scrollY;
  const boundedTargetTop = Math.max(0, Math.round(targetTop));
  const distance = boundedTargetTop - startTop;

  if (reducedMotion || durationMs <= 0 || Math.abs(distance) < 2) {
    jumpWindowScroll(boundedTargetTop);
    return;
  }

  const startTime = window.performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / durationMs, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo({
      top: startTop + distance * easedProgress,
      behavior: "auto",
    });

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
  scrollToTop = true,
  scrollTargetRef,
  scrollOffset = 0,
  scrollDurationMs = 520,
  scrollBehavior = "smooth",
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  function handlePageChange(nextPage: number) {
    onPageChange(nextPage);

    if (!scrollToTop || typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetTop = scrollTargetRef?.current
          ? scrollTargetRef.current.getBoundingClientRect().top +
            window.scrollY -
            scrollOffset
          : 0;

        if (scrollBehavior === "instant") {
          jumpWindowScroll(targetTop);
          return;
        }

        animateWindowScroll(targetTop, scrollDurationMs);
      });
    });
  }

  return (
    <div className="pagination-shell">
      <nav className="pagination-nav" aria-label="Pagination">
        <button
          type="button"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="pagination-button"
        >
          {"<"}
        </button>

        <p className="pagination-meta" aria-live="polite">
          {page}/{totalPages}
        </p>

        <button
          type="button"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="pagination-button"
        >
          {">"}
        </button>
      </nav>
    </div>
  );
}
