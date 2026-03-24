export type ThemePreference = "light" | "dark" | "system";

export interface HumorFlavorSummary {
  id: number;
  slug: string;
  description: string | null;
  createdAt: string;
  modifiedAt: string | null;
  stepCount: number;
  captionCount: number | null;
}

export interface HumorFlavorStep {
  id: number;
  humorFlavorId: number;
  orderBy: number;
  description: string | null;
  llmTemperature: number | null;
  llmModelId: number | null;
  llmModelName: string | null;
  llmInputTypeId: number | null;
  llmInputTypeSlug: string | null;
  llmOutputTypeId: number | null;
  llmOutputTypeSlug: string | null;
  humorFlavorStepTypeId: number | null;
  humorFlavorStepTypeSlug: string | null;
  llmSystemPrompt: string | null;
  llmUserPrompt: string | null;
  createdAt: string;
  modifiedAt: string | null;
}

export interface HumorFlavorDetail extends HumorFlavorSummary {
  steps: HumorFlavorStep[];
}

export interface EditorOption {
  id: number;
  label: string;
}

export interface TestImage {
  id: string;
  url: string;
  imageDescription: string | null;
  createdAt: string;
}

export interface UploadedTestImage {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  createdAt: string;
}

export interface HumorFlavorEditorOptions {
  models: EditorOption[];
  inputTypes: EditorOption[];
  outputTypes: EditorOption[];
  stepTypes: EditorOption[];
  testImages: TestImage[];
}

export interface HumorFlavorHistoryItem {
  responseId: string;
  captionRequestId: number | null;
  createdAt: string;
  stepOrder: number | null;
  stepDescription: string | null;
  imageUrl: string | null;
  imageDescription: string | null;
  captions: string[];
  rawResponse: string;
}

export interface HumorFlavorTestResult {
  captions: string[];
  rawResponse: string;
}
