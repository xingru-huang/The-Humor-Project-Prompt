"use client";

import { useRef, useState } from "react";
import { FieldLabel, Select, TextArea, TextInput } from "@/components/form-fields";
import PromptVariablesModal from "@/components/prompt-variables-modal";
import type { HumorFlavorEditorOptions } from "@/lib/humor-flavor-types";
import type { StepFormState } from "@/lib/humor-flavor-editor-types";

interface StepFormFieldsProps {
  form: StepFormState;
  options: HumorFlavorEditorOptions;
  onChange: (nextForm: StepFormState) => void;
}

export default function StepFormFields({
  form,
  options,
  onChange,
}: StepFormFieldsProps) {
  const [variablesTarget, setVariablesTarget] = useState<"system" | "user" | null>(null);
  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  function handleInsertVariable(variable: string) {
    const targetField = variablesTarget === "system" ? "llmSystemPrompt" : "llmUserPrompt";
    const textareaRef = variablesTarget === "system" ? systemPromptRef : userPromptRef;
    const textarea = textareaRef.current;

    if (textarea) {
      const start = textarea.selectionStart ?? form[targetField].length;
      const end = textarea.selectionEnd ?? start;
      const before = form[targetField].slice(0, start);
      const after = form[targetField].slice(end);
      onChange({ ...form, [targetField]: before + variable + after });
    } else {
      onChange({ ...form, [targetField]: form[targetField] + variable });
    }

    setVariablesTarget(null);
  }

  return (
    <>
      <FieldLabel label="Step description (optional)">
        <TextArea
          rows={3}
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          placeholder="Optional note about what this step is testing, rewriting, or evaluating."
          className="min-h-28"
        />
      </FieldLabel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FieldLabel label="Model">
          <Select
            value={form.llmModelId}
            onChange={(event) => onChange({ ...form, llmModelId: event.target.value })}
          >
            {options.models.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldLabel>

        <FieldLabel label="Input type">
          <Select
            value={form.llmInputTypeId}
            onChange={(event) =>
              onChange({ ...form, llmInputTypeId: event.target.value })
            }
          >
            {options.inputTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldLabel>

        <FieldLabel label="Output type">
          <Select
            value={form.llmOutputTypeId}
            onChange={(event) =>
              onChange({ ...form, llmOutputTypeId: event.target.value })
            }
          >
            {options.outputTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldLabel>

        <FieldLabel label="Step type">
          <Select
            value={form.humorFlavorStepTypeId}
            onChange={(event) =>
              onChange({ ...form, humorFlavorStepTypeId: event.target.value })
            }
          >
            {options.stepTypes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </FieldLabel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.55fr_1.55fr]">
        <FieldLabel label="Temperature">
          <TextInput
            type="number"
            step="0.1"
            value={form.llmTemperature}
            onChange={(event) =>
              onChange({ ...form, llmTemperature: event.target.value })
            }
          />
        </FieldLabel>

        <div className="field-stack">
          <div className="flex items-center justify-between">
            <span className="field-label">System prompt</span>
            <button
              type="button"
              onClick={() => setVariablesTarget("system")}
              className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Prompt Variables
            </button>
          </div>
          <TextArea
            ref={systemPromptRef}
            rows={8}
            value={form.llmSystemPrompt}
            onChange={(event) =>
              onChange({ ...form, llmSystemPrompt: event.target.value })
            }
            className="min-h-52 font-mono text-[13px] leading-6"
          />
        </div>

        <div className="field-stack">
          <div className="flex items-center justify-between">
            <span className="field-label">User prompt</span>
            <button
              type="button"
              onClick={() => setVariablesTarget("user")}
              className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Prompt Variables
            </button>
          </div>
          <TextArea
            ref={userPromptRef}
            rows={8}
            value={form.llmUserPrompt}
            onChange={(event) =>
              onChange({ ...form, llmUserPrompt: event.target.value })
            }
            className="min-h-52 font-mono text-[13px] leading-6"
          />
        </div>
      </div>

      <PromptVariablesModal
        open={variablesTarget !== null}
        onClose={() => setVariablesTarget(null)}
        onInsert={handleInsertVariable}
      />
    </>
  );
}
