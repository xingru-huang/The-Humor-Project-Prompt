/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import PaginationControls from "@/components/pagination-controls";
import type { HumorFlavorHistoryItem } from "@/lib/humor-flavor-types";

interface HistoryPanelProps {
  history: HumorFlavorHistoryItem[];
}

const HISTORY_ITEMS_PER_PAGE = 4;

function HistoryCard({ item }: { item: HumorFlavorHistoryItem }) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const hasLongDescription = (item.imageDescription?.length ?? 0) > 220;

  return (
    <article
      onClick={() => {
        if (hasLongDescription) {
          setDescriptionExpanded((value) => !value);
        }
      }}
      className={`panel card-interactive space-y-4 p-4 sm:p-5 ${
        hasLongDescription ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
        <span className="stat-chip">
          Request {item.captionRequestId ?? "unknown"}
        </span>
        <span className="stat-chip">
          Step {item.stepOrder ?? "?"}
        </span>
        <span className="stat-chip">
          {new Date(item.createdAt).toLocaleString()}
        </span>
        {hasLongDescription && !descriptionExpanded ? (
          <span className="stat-chip text-[var(--accent)]">Click to expand</span>
        ) : null}
      </div>

      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.imageDescription ?? "Generated caption image"}
          className="w-full max-h-60 rounded-[1.25rem] object-contain bg-[var(--muted)]"
        />
      ) : null}

      {item.imageDescription ? (
        <p
          className={`text-sm leading-6 text-[var(--muted-foreground)] ${
            hasLongDescription && !descriptionExpanded ? "line-clamp-2" : ""
          }`}
        >
          {item.imageDescription}
        </p>
      ) : null}

      {item.captions.length > 0 ? (
        <div className="space-y-2">
          {item.captions.map((caption, index) => (
            <div
              key={`${item.responseId}-${index}`}
              className="prompt-block text-sm text-[var(--foreground)]"
            >
              {caption}
            </div>
          ))}
        </div>
      ) : (
        <pre className="prompt-block whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
          {item.rawResponse}
        </pre>
      )}
    </article>
  );
}

export default function HistoryPanel({ history }: HistoryPanelProps) {
  const historyPanelRef = useRef<HTMLDivElement | null>(null);
  const [requestedHistoryPage, setRequestedHistoryPage] = useState(1);
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(history.length / HISTORY_ITEMS_PER_PAGE)
  );
  const historyPage = Math.min(requestedHistoryPage, totalHistoryPages);
  const visibleHistory = history.slice(
    (historyPage - 1) * HISTORY_ITEMS_PER_PAGE,
    historyPage * HISTORY_ITEMS_PER_PAGE
  );

  return (
    <div
      ref={historyPanelRef}
      className="panel-muted section-enter section-enter-delay-3 p-5 sm:p-6"
    >
      <p className="eyebrow">Saved Results</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
        Generated captions
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
        Read every saved caption output produced by this humor flavor.
      </p>
      <p className="mt-3 text-sm text-[var(--muted-foreground)]">
        {history.length} saved results
      </p>

      <div className="mt-5 space-y-4">
        {history.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            No historical outputs found yet.
          </p>
        ) : (
          <>
            {visibleHistory.map((item) => (
              <HistoryCard key={item.responseId} item={item} />
            ))}

            <PaginationControls
              page={historyPage}
              totalPages={totalHistoryPages}
              onPageChange={setRequestedHistoryPage}
              scrollTargetRef={historyPanelRef}
              scrollOffset={12}
              scrollBehavior="instant"
            />
          </>
        )}
      </div>
    </div>
  );
}
