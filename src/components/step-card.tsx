"use client";

import { useState } from "react";
import StepFormFields from "@/components/step-form-fields";
import type { StepFormState } from "@/lib/humor-flavor-editor-types";
import type {
  HumorFlavorEditorOptions,
  HumorFlavorStep,
} from "@/lib/humor-flavor-types";

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

            <div className="flex flex-wrap gap-2 text-sm text-[var(--muted-foreground)]">
              <span>{step.humorFlavorStepTypeSlug ?? "no-step-type"}</span>
              <span>/</span>
              <span>{step.llmModelName ?? "no-model"}</span>
              <span>/</span>
              <span>
                {step.llmInputTypeSlug ?? "?"} to{" "}
                {step.llmOutputTypeSlug ?? "?"}
              </span>
              <span>/</span>
              <span>Temperature {step.llmTemperature ?? "default"}</span>
              <span>/</span>
              <span>
                {index + 1} / {total}
              </span>
            </div>

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
        <div className="grid gap-4 xl:grid-cols-2" onClick={(e) => e.stopPropagation()}>
          <div className="prompt-block">
            <p className="prompt-label">System prompt</p>
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
              {step.llmSystemPrompt || "No system prompt."}
            </pre>
          </div>
          <div className="prompt-block">
            <p className="prompt-label">User prompt</p>
            <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
              {step.llmUserPrompt || "No user prompt."}
            </pre>
          </div>
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

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onSave(step.id)}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Saving..." : "Save step"}
            </button>
            <button
              onClick={onCancelEdit}
              className="btn-secondary"
            >
              Cancel
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
