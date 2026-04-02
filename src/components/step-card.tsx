"use client";

import { useMemo, useState } from "react";
import PromptVariablesModal from "@/components/prompt-variables-modal";
import StepFormFields from "@/components/step-form-fields";
import type { StepFormState } from "@/lib/humor-flavor-editor-types";
import type {
  HumorFlavorEditorOptions,
  HumorFlavorStep,
} from "@/lib/humor-flavor-types";
import { extractVariablesFromText } from "@/lib/prompt-variables";

interface StepCardProps {
  step: HumorFlavorStep;
  index: number;
  total: number;
  options: HumorFlavorEditorOptions;
  isEditing: boolean;
  editForm: StepFormState;
  saving: boolean;
  deleting: boolean;
  reordering: boolean;
  onEditFormChange: (nextForm: StepFormState) => void;
  onStartEdit: (step: HumorFlavorStep) => void;
  onCancelEdit: () => void;
  onSave: (stepId: number) => void;
  onDelete: (stepId: number, label: string) => void;
  onMove: (stepId: number, direction: -1 | 1) => void;
}

function ReadView({
  step,
  index,
  total,
  reordering,
  deleting,
  onStartEdit,
  onDelete,
  onMove,
}: {
  step: HumorFlavorStep;
  index: number;
  total: number;
  reordering: boolean;
  deleting: boolean;
  onStartEdit: (step: HumorFlavorStep) => void;
  onDelete: (stepId: number, label: string) => void;
  onMove: (stepId: number, direction: -1 | 1) => void;
}) {
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const foundVariables = useMemo(() => {
    const allText = (step.llmSystemPrompt ?? "") + (step.llmUserPrompt ?? "");
    return extractVariablesFromText(allText);
  }, [step.llmSystemPrompt, step.llmUserPrompt]);

  return (
    <div className="cursor-pointer space-y-4" onClick={() => setPromptsExpanded((v) => !v)}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="eyebrow">Prompt Step</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                Sequence {step.orderBy}
              </h3>
            </div>

            <p className="text-sm text-[var(--muted-foreground)]">
              {step.humorFlavorStepTypeSlug ?? "no-step-type"}
              {" · "}
              {step.llmModelName ?? "no-model"}
              {" · "}
              {step.llmInputTypeSlug ?? "?"} &rarr; {step.llmOutputTypeSlug ?? "?"}
              {" · "}
              temp {step.llmTemperature ?? "default"}
              {" · "}
              {index + 1} of {total}
            </p>

            <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
              {step.description ||
                "No editorial note saved for this step yet. Add one to explain the role of this transformation."}
            </p>

            <p className="text-xs text-[var(--muted-foreground)] opacity-60">
              {promptsExpanded ? "Click to collapse prompts" : "Click to view prompts"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-[18rem] xl:justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onMove(step.id, -1)}
            disabled={index === 0 || reordering}
            className="btn-secondary px-3 py-2 text-[13px]"
          >
            Move up
          </button>
          <button
            onClick={() => onMove(step.id, 1)}
            disabled={index === total - 1 || reordering}
            className="btn-secondary px-3 py-2 text-[13px]"
          >
            Move down
          </button>
          <button
            onClick={() => onStartEdit(step)}
            className="btn-secondary px-3 py-2 text-[13px]"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(step.id, String(step.orderBy))}
            disabled={deleting}
            className="btn-danger px-3 py-2 text-[13px]"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {promptsExpanded && (
        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="prompt-block">
              <p className="prompt-label">System prompt</p>
              <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
                {step.llmSystemPrompt || "No system prompt."}
              </pre>
            </div>
            <div className="prompt-block">
              <div className="flex items-center justify-between">
                <p className="prompt-label">User prompt</p>
                {foundVariables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowVariables(true)}
                    className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Prompt Variables
                  </button>
                )}
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
                {step.llmUserPrompt || "No user prompt."}
              </pre>
            </div>
          </div>

          {foundVariables.length > 0 && (
            <PromptVariablesModal
              open={showVariables}
              onClose={() => setShowVariables(false)}
              onInsert={() => setShowVariables(false)}
              variables={foundVariables}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function StepCard({
  step,
  index,
  total,
  options,
  isEditing,
  editForm,
  saving,
  deleting,
  reordering,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onMove,
}: StepCardProps) {
  return (
    <article className="panel card-interactive section-enter section-enter-delay-3 p-5 sm:p-6">
      {isEditing ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Editing Step</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                Step {step.orderBy}
              </h3>
            </div>
            <span className="stat-chip text-[var(--foreground)]">
              {step.humorFlavorStepTypeSlug ?? "no-step-type"}
            </span>
          </div>

          <StepFormFields
            form={editForm}
            options={options}
            onChange={onEditFormChange}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={onCancelEdit}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(step.id)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save step"}
            </button>
          </div>
        </div>
      ) : (
        <ReadView
          step={step}
          index={index}
          total={total}
          reordering={reordering}
          deleting={deleting}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          onMove={onMove}
        />
      )}
    </article>
  );
}
