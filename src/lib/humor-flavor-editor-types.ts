export interface FlavorFormState {
  slug: string;
  description: string;
  captionCount: string;
}

export interface StepFormState {
  description: string;
  llmTemperature: string;
  llmModelId: string;
  llmInputTypeId: string;
  llmOutputTypeId: string;
  humorFlavorStepTypeId: string;
  llmSystemPrompt: string;
  llmUserPrompt: string;
}
