"use client";

import { FieldLabel, Select, TextArea, TextInput } from "@/components/form-fields";
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
  return (
    <>
      <FieldLabel label="Step description">
        <TextArea
          rows={3}
          value={form.description}
          onChange={(event) =>
            onChange({ ...form, description: event.target.value })
          }
          placeholder="What this step is testing, rewriting, or evaluating."
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

        <FieldLabel label="System prompt">
          <TextArea
            rows={8}
            value={form.llmSystemPrompt}
            onChange={(event) =>
              onChange({ ...form, llmSystemPrompt: event.target.value })
            }
            className="min-h-52 font-mono text-[13px] leading-6"
          />
        </FieldLabel>

        <FieldLabel label="User prompt">
          <TextArea
            rows={8}
            value={form.llmUserPrompt}
            onChange={(event) =>
              onChange({ ...form, llmUserPrompt: event.target.value })
            }
            className="min-h-52 font-mono text-[13px] leading-6"
          />
        </FieldLabel>
      </div>
    </>
  );
}
