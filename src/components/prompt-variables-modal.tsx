"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PROMPT_VARIABLES } from "@/lib/prompt-variables";

interface PromptVariablesModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (variable: string) => void;
  /** When provided, only these variables are shown. Otherwise all are shown. */
  variables?: typeof PROMPT_VARIABLES;
}

export default function PromptVariablesModal({
  open,
  onClose,
  onInsert,
  variables,
}: PromptVariablesModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const displayVariables = variables ?? PROMPT_VARIABLES;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || displayVariables.length === 0) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="fixed inset-0 bg-[var(--foreground)]/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden rounded-[1.65rem] border border-[var(--border)] bg-[var(--background-raised)] shadow-[var(--shadow-lg)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              Prompt Variables
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Use these placeholders to pull in pipeline outputs, image details, and community context.
            </p>
          </div>
          <button onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {displayVariables.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => onInsert(variable.name)}
                className="group flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--chip-bg)] p-3.5 text-left transition-all duration-150 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:shadow-md"
              >
                <span className="eyebrow text-[0.65rem] text-[var(--muted-foreground)] group-hover:text-[var(--accent)]">
                  Variable
                </span>
                <span className="font-mono text-sm text-[var(--foreground)]">
                  {variable.name}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-[var(--muted-foreground)]">
            Keep the placeholders exactly as shown, including the {"${...}"}.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
