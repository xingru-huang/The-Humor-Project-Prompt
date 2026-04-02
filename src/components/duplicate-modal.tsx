"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { slugifyFlavor } from "@/lib/humor-flavor-utils";

interface DuplicateModalProps {
  open: boolean;
  sourceSlug: string;
  sourceDescription: string | null;
  sourceId: number;
  onClose: () => void;
  onDuplicated: () => void;
}

export default function DuplicateModal({
  open,
  sourceSlug,
  sourceDescription,
  sourceId,
  onClose,
  onDuplicated,
}: DuplicateModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSlug(`${sourceSlug}-copy`);
      setDescription(
        sourceDescription
          ? `Copy of ${sourceDescription}`
          : `Copy of ${sourceSlug}`
      );
      setError(null);
    }
  }, [open, sourceSlug, sourceDescription]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSlug = slugifyFlavor(slug);
    if (!normalizedSlug) {
      setError("A valid slug is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(
        `/api/humor-flavors/${sourceId}/duplicate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: normalizedSlug,
            description: description.trim() || null,
          }),
        }
      );

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to duplicate flavor.");
      }

      onDuplicated();
      onClose();
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Failed to duplicate flavor."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="fixed inset-0 bg-[var(--foreground)]/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[1.65rem] border border-[var(--border)] bg-[var(--background-raised)] shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Duplicate Flavor
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Choose a new slug and description for the copy.
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          {error ? (
            <div className="rounded-xl border border-[var(--danger-border)] bg-[rgba(204,85,72,0.08)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <label className="field-stack">
            <span className="field-label">Slug</span>
            <input
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="new-flavor-slug"
              required
              className="field-control"
              autoFocus
            />
          </label>

          <label className="field-stack">
            <span className="field-label">Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe this flavor copy."
              className="field-control min-h-24"
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? "Duplicating..." : "Create duplicate"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
