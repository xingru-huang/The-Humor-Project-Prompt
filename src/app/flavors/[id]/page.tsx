"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminTopbar from "@/components/admin-topbar";
import { FieldLabel, TextArea, TextInput } from "@/components/form-fields";
import HistoryPanel from "@/components/history-panel";
import PaginationControls from "@/components/pagination-controls";
import StepCard from "@/components/step-card";
import StepFormFields from "@/components/step-form-fields";
import TestPanel from "@/components/test-panel";
import type {
  HumorFlavorDetail,
  HumorFlavorEditorOptions,
  HumorFlavorHistoryItem,
  HumorFlavorStep,
  HumorFlavorTestResult,
  ThemePreference,
  UploadedTestImage,
} from "@/lib/humor-flavor-types";
import type {
  FlavorFormState,
  StepFormState,
} from "@/lib/humor-flavor-editor-types";
import { slugifyFlavor, tryParseJson } from "@/lib/humor-flavor-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  applyThemePreference,
  getStoredThemePreference,
  saveThemePreference,
  subscribeToSystemThemeChanges,
} from "@/lib/theme-client";

function createFlavorForm(flavor?: HumorFlavorDetail | null): FlavorFormState {
  return {
    slug: flavor?.slug ?? "",
    description: flavor?.description ?? "",
    captionCount: String(flavor?.captionCount ?? 0),
  };
}

function createDefaultStepForm(
  options?: HumorFlavorEditorOptions | null
): StepFormState {
  return {
    description: "",
    llmTemperature: "0.7",
    llmModelId: options?.models[0] ? String(options.models[0].id) : "",
    llmInputTypeId: options?.inputTypes[0] ? String(options.inputTypes[0].id) : "",
    llmOutputTypeId: options?.outputTypes[0]
      ? String(options.outputTypes[0].id)
      : "",
    humorFlavorStepTypeId: options?.stepTypes[0]
      ? String(options.stepTypes[0].id)
      : "",
    llmSystemPrompt: "",
    llmUserPrompt: "",
  };
}

function createEditStepForm(step: HumorFlavorStep): StepFormState {
  return {
    description: step.description ?? "",
    llmTemperature:
      step.llmTemperature == null ? "" : String(step.llmTemperature),
    llmModelId: step.llmModelId == null ? "" : String(step.llmModelId),
    llmInputTypeId:
      step.llmInputTypeId == null ? "" : String(step.llmInputTypeId),
    llmOutputTypeId:
      step.llmOutputTypeId == null ? "" : String(step.llmOutputTypeId),
    humorFlavorStepTypeId:
      step.humorFlavorStepTypeId == null
        ? ""
        : String(step.humorFlavorStepTypeId),
    llmSystemPrompt: step.llmSystemPrompt ?? "",
    llmUserPrompt: step.llmUserPrompt ?? "",
  };
}

function getMissingStepFields(form: StepFormState) {
  const missingFields: string[] = [];

  if (!form.description.trim()) {
    missingFields.push("Step description");
  }
  if (!form.llmModelId.trim()) {
    missingFields.push("Model");
  }
  if (!form.llmInputTypeId.trim()) {
    missingFields.push("Input type");
  }
  if (!form.llmOutputTypeId.trim()) {
    missingFields.push("Output type");
  }
  if (!form.humorFlavorStepTypeId.trim()) {
    missingFields.push("Step type");
  }
  if (!form.llmSystemPrompt.trim()) {
    missingFields.push("System prompt");
  }
  if (!form.llmUserPrompt.trim()) {
    missingFields.push("User prompt");
  }

  return missingFields;
}

function readFlavorListPageFromLocation() {
  if (typeof window === "undefined") {
    return 1;
  }

  const value = Number(new URLSearchParams(window.location.search).get("page"));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

const STEPS_PER_PAGE = 4;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload as T;
}

async function requestFormDataJson<T>(url: string, formData: FormData) {
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    body: formData,
  });

  const responseText = await response.text();
  const parsedPayload = tryParseJson(responseText);
  const payload = parsedPayload ?? responseText;

  if (!response.ok) {
    const errorMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : typeof payload === "string" && payload.trim()
          ? payload
          : "Request failed.";
    throw new Error(errorMessage);
  }

  return payload as T;
}

export default function FlavorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const flavorId = Number(rawId);

  const [theme, setTheme] = useState<ThemePreference>("system");
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [flavor, setFlavor] = useState<HumorFlavorDetail | null>(null);
  const [options, setOptions] = useState<HumorFlavorEditorOptions | null>(null);
  const [history, setHistory] = useState<HumorFlavorHistoryItem[]>([]);
  const [uploadedImage, setUploadedImage] = useState<UploadedTestImage | null>(
    null
  );
  const [flavorForm, setFlavorForm] = useState<FlavorFormState>(
    createFlavorForm()
  );
  const [createStepForm, setCreateStepForm] = useState<StepFormState>(
    createDefaultStepForm()
  );
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepForm, setEditStepForm] = useState<StepFormState>(
    createDefaultStepForm()
  );
  const [selectedImageId, setSelectedImageId] = useState("");
  const [testResult, setTestResult] = useState<HumorFlavorTestResult | null>(
    null
  );
  const [savingFlavor, setSavingFlavor] = useState(false);
  const [creatingStep, setCreatingStep] = useState(false);
  const [savingStepId, setSavingStepId] = useState<number | null>(null);
  const [deletingStepId, setDeletingStepId] = useState<number | null>(null);
  const [reorderingStepId, setReorderingStepId] = useState<number | null>(null);
  const [testingFlavor, setTestingFlavor] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedStepPage, setRequestedStepPage] = useState(1);
  const [flavorListPage, setFlavorListPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateStep, setShowCreateStep] = useState(false);
  const [activeTab, setActiveTab] = useState<"steps" | "test" | "history">("steps");
  const backHref = flavorListPage > 1 ? `/?page=${flavorListPage}` : "/";

  const orderedSteps = flavor
    ? [...flavor.steps].sort((a, b) => a.orderBy - b.orderBy)
    : [];
  const totalStepPages = Math.max(
    1,
    Math.ceil(orderedSteps.length / STEPS_PER_PAGE)
  );
  const stepPage = Math.min(requestedStepPage, totalStepPages);
  const visibleSteps = orderedSteps.slice(
    (stepPage - 1) * STEPS_PER_PAGE,
    stepPage * STEPS_PER_PAGE
  );

  useEffect(() => {
    const storedTheme = getStoredThemePreference();
    setTheme(storedTheme);
    applyThemePreference(storedTheme);

    return subscribeToSystemThemeChanges(() => {
      if (getStoredThemePreference() === "system") {
        applyThemePreference("system");
      }
    });
  }, []);

  useEffect(() => {
    if (!Number.isInteger(flavorId)) {
      setError("Invalid flavor id.");
      return;
    }

    async function loadPage() {
      setFlavorListPage(readFlavorListPageFromLocation());

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserName(user.user_metadata?.full_name ?? null);
      setUserEmail(user.email ?? null);

      try {
        const [flavorPayload, optionsPayload, historyPayload] = await Promise.all([
          requestJson<HumorFlavorDetail>(`/api/humor-flavors/${flavorId}`),
          requestJson<HumorFlavorEditorOptions>("/api/humor-flavors/options"),
          requestJson<HumorFlavorHistoryItem[]>(
            `/api/humor-flavors/${flavorId}/history`
          ),
        ]);

        setFlavor(flavorPayload);
        setFlavorForm(createFlavorForm(flavorPayload));
        setOptions(optionsPayload);
        setHistory(historyPayload);
        setCreateStepForm(createDefaultStepForm(optionsPayload));
        setUploadedImage(null);
        setSelectedImageId("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load flavor."
        );
      }
    }

    void loadPage();
  }, [flavorId, router, supabase]);

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    saveThemePreference(nextTheme);
  }

  function handleSignOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  async function refreshFlavor() {
    const freshFlavor = await requestJson<HumorFlavorDetail>(
      `/api/humor-flavors/${flavorId}`
    );
    setFlavor(freshFlavor);
    setFlavorForm(createFlavorForm(freshFlavor));
  }

  async function refreshHistory() {
    const freshHistory = await requestJson<HumorFlavorHistoryItem[]>(
      `/api/humor-flavors/${flavorId}/history`
    );
    setHistory(freshHistory);
  }

  function handleSelectImage(nextImageId: string) {
    setSelectedImageId(nextImageId);
    setTestResult(null);
  }

  async function handleUploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadingImage(true);
      setError(null);
      const nextUploadedImage = await requestFormDataJson<UploadedTestImage>(
        "/api/test-images/upload",
        formData
      );
      setUploadedImage(nextUploadedImage);
      setSelectedImageId(nextUploadedImage.id);
      setTestResult(null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image."
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function handleClearSelectedImage() {
    if (uploadedImage && selectedImageId === uploadedImage.id) {
      setUploadedImage(null);
    }
    setSelectedImageId("");
    setTestResult(null);
  }

  async function handleSaveFlavor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingFlavor(true);
      setError(null);
      const updatedFlavor = await requestJson<HumorFlavorDetail>(
        `/api/humor-flavors/${flavorId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            slug: slugifyFlavor(flavorForm.slug),
            description: flavorForm.description,
            captionCount: Number(flavorForm.captionCount || 0),
          }),
        }
      );

      setFlavor(updatedFlavor);
      setFlavorForm(createFlavorForm(updatedFlavor));
      setShowSettings(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save flavor."
      );
    } finally {
      setSavingFlavor(false);
    }
  }

  async function handleCreateStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const missingFields = getMissingStepFields(createStepForm);
    if (missingFields.length > 0) {
      setError(
        `Please fill the required fields: ${missingFields.join(", ")}.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setCreatingStep(true);
      setError(null);
      await requestJson(`/api/humor-flavors/${flavorId}/steps`, {
        method: "POST",
        body: JSON.stringify({
          ...createStepForm,
          llmModelId: Number(createStepForm.llmModelId),
          llmInputTypeId: Number(createStepForm.llmInputTypeId),
          llmOutputTypeId: Number(createStepForm.llmOutputTypeId),
          humorFlavorStepTypeId: Number(createStepForm.humorFlavorStepTypeId),
        }),
      });

      if (options) {
        setCreateStepForm(createDefaultStepForm(options));
      }
      setShowCreateStep(false);
      await refreshFlavor();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Failed to create step."
      );
    } finally {
      setCreatingStep(false);
    }
  }

  function startEditingStep(step: HumorFlavorStep) {
    setEditingStepId(step.id);
    setEditStepForm(createEditStepForm(step));
  }

  async function handleSaveStep(stepId: number) {
    const missingFields = getMissingStepFields(editStepForm);
    if (missingFields.length > 0) {
      setError(
        `Please fill the required fields: ${missingFields.join(", ")}.`
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      setSavingStepId(stepId);
      setError(null);
      await requestJson(`/api/humor-flavors/${flavorId}/steps/${stepId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editStepForm,
          llmModelId: Number(editStepForm.llmModelId),
          llmInputTypeId: Number(editStepForm.llmInputTypeId),
          llmOutputTypeId: Number(editStepForm.llmOutputTypeId),
          humorFlavorStepTypeId: Number(editStepForm.humorFlavorStepTypeId),
        }),
      });

      setEditingStepId(null);
      await refreshFlavor();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save step."
      );
    } finally {
      setSavingStepId(null);
    }
  }

  async function handleDeleteStep(stepId: number, label: string) {
    if (!window.confirm(`Delete step ${label}?`)) return;

    try {
      setDeletingStepId(stepId);
      setError(null);
      await requestJson(`/api/humor-flavors/${flavorId}/steps/${stepId}`, {
        method: "DELETE",
      });
      await refreshFlavor();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Failed to delete step."
      );
    } finally {
      setDeletingStepId(null);
    }
  }

  async function moveStep(stepId: number, direction: -1 | 1) {
    if (!flavor) return;

    const ordered = [...flavor.steps].sort((a, b) => a.orderBy - b.orderBy);
    const currentIndex = ordered.findIndex((step) => step.id === stepId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }

    const reordered = [...ordered];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);

    try {
      setReorderingStepId(stepId);
      setError(null);
      await requestJson(`/api/humor-flavors/${flavorId}/steps/reorder`, {
        method: "POST",
        body: JSON.stringify({
          stepIds: reordered.map((step) => step.id),
        }),
      });
      await refreshFlavor();
    } catch (reorderError) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Failed to reorder step."
      );
    } finally {
      setReorderingStepId(null);
    }
  }

  async function handleRunTest() {
    if (!selectedImageId) {
      setError("Upload or select an image first.");
      return;
    }

    try {
      setTestingFlavor(true);
      setError(null);
      const result = await requestJson<HumorFlavorTestResult>(
        `/api/humor-flavors/${flavorId}/test`,
        {
          method: "POST",
          body: JSON.stringify({ imageId: selectedImageId }),
        }
      );
      setTestResult(result);
      await refreshHistory();
    } catch (testError) {
      setError(
        testError instanceof Error ? testError.message : "Failed to test flavor."
      );
    } finally {
      setTestingFlavor(false);
    }
  }

  if (!flavor || !options) {
    if (!error) return null;
    return (
      <div className="admin-shell min-h-screen">
        <AdminTopbar
          title="Humor Flavor"
          subtitle="Flavor workspace"
          userName={userName}
          userEmail={userEmail}
          theme={theme}
          onThemeChange={handleThemeChange}
          onSignOut={handleSignOut}
          backHref={backHref}
          backLabel="Back to flavor list"
        />
        <main className="admin-main px-2 py-2 sm:px-0">
          <div className="status-banner status-banner-danger section-enter">
            {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen">
      <AdminTopbar
        title={flavor.slug}
        subtitle="Tune steps, run probes, compare outputs."
        userName={userName}
        userEmail={userEmail}
        theme={theme}
        onThemeChange={handleThemeChange}
        onSignOut={handleSignOut}
        backHref={backHref}
        backLabel="Back to flavor list"
      />

      <main className="admin-main space-y-6 px-2 py-2 sm:px-0">
        {error ? (
          <div className="status-banner status-banner-danger section-enter">
            {error}
          </div>
        ) : null}

        {/* Compact flavor header */}
        <section className="panel section-enter p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <p className="eyebrow">Flavor Workspace</p>
              <h2 className="text-3xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                {flavor.slug}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                {flavor.description ||
                  "No flavor brief saved yet. Add a direction note so the team knows what this chain should sound like."}
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                <span>ID {flavor.id}</span>
                <span>/</span>
                <span>{flavor.stepCount} steps</span>
                <span>/</span>
                <span>{flavor.captionCount ?? 0} captions / run</span>
                <span>/</span>
                <span>{options.testImages.length} test images</span>
              </div>
            </div>
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="btn-secondary"
            >
              {showSettings ? "Close settings" : "Edit settings"}
            </button>
          </div>

          {showSettings ? (
            <form onSubmit={handleSaveFlavor} className="mt-6 space-y-4 border-t border-[var(--border)] pt-6">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <FieldLabel label="Flavor slug">
                  <TextInput
                    value={flavorForm.slug}
                    onChange={(event) =>
                      setFlavorForm((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                    placeholder="relatable-reaction-captions"
                  />
                </FieldLabel>

                <FieldLabel label="Captions per run">
                  <TextInput
                    type="number"
                    min={0}
                    value={flavorForm.captionCount}
                    onChange={(event) =>
                      setFlavorForm((current) => ({
                        ...current,
                        captionCount: event.target.value,
                      }))
                    }
                  />
                </FieldLabel>
              </div>

              <FieldLabel label="Flavor direction">
                <TextArea
                  rows={4}
                  value={flavorForm.description}
                  onChange={(event) =>
                    setFlavorForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the tone, audience, and caption style this flavor should produce."
                  className="min-h-28"
                />
              </FieldLabel>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFlavor}
                  className="btn-primary"
                >
                  {savingFlavor ? "Saving..." : "Save flavor"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        {/* Tab navigation */}
        <div className="section-enter section-enter-delay-1">
          <nav className="tab-bar" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "steps"}
              onClick={() => setActiveTab("steps")}
              className="tab-button"
            >
              Steps
              <span className="tab-badge">{orderedSteps.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "test"}
              onClick={() => setActiveTab("test")}
              className="tab-button"
            >
              Test
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "history"}
              onClick={() => setActiveTab("history")}
              className="tab-button"
            >
              History
              <span className="tab-badge">{history.length}</span>
            </button>
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === "steps" ? (
          <section className="section-enter space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Sequence Map</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                  Prompt steps
                </h2>
              </div>
              <button
                onClick={() => setShowCreateStep((v) => !v)}
                className="btn-primary"
              >
                {showCreateStep ? "Cancel" : "Add step"}
              </button>
            </div>

            {showCreateStep ? (
              <section className="panel-muted section-enter p-5 sm:p-6">
                <form onSubmit={handleCreateStep} className="space-y-4">
                  <StepFormFields
                    form={createStepForm}
                    options={options}
                    onChange={setCreateStepForm}
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingStep}
                      className="btn-primary"
                    >
                      {creatingStep ? "Adding..." : "Add step"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            {orderedSteps.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">
                No steps yet. Click &ldquo;Add step&rdquo; to build the chain.
              </p>
            ) : (
              <>
                {visibleSteps.map((step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={(stepPage - 1) * STEPS_PER_PAGE + index}
                    total={orderedSteps.length}
                    options={options}
                    isEditing={editingStepId === step.id}
                    editForm={editStepForm}
                    saving={savingStepId === step.id}
                    deleting={deletingStepId === step.id}
                    reordering={reorderingStepId === step.id}
                    onEditFormChange={setEditStepForm}
                    onStartEdit={startEditingStep}
                    onCancelEdit={() => setEditingStepId(null)}
                    onSave={(stepId) => void handleSaveStep(stepId)}
                    onDelete={(stepId, label) =>
                      void handleDeleteStep(stepId, label)
                    }
                    onMove={(stepId, direction) =>
                      void moveStep(stepId, direction)
                    }
                  />
                ))}

                <PaginationControls
                  page={stepPage}
                  totalPages={totalStepPages}
                  onPageChange={setRequestedStepPage}
                />
              </>
            )}
          </section>
        ) : null}

        {activeTab === "test" ? (
          <section className="section-enter">
            <TestPanel
              options={options}
              uploadedImage={uploadedImage}
              selectedImageId={selectedImageId}
              testResult={testResult}
              uploadingImage={uploadingImage}
              testing={testingFlavor}
              onSelectImage={handleSelectImage}
              onUploadImage={(file) => void handleUploadImage(file)}
              onClearSelectedImage={handleClearSelectedImage}
              onRunTest={() => void handleRunTest()}
            />
          </section>
        ) : null}

        {activeTab === "history" ? (
          <section className="section-enter">
            <HistoryPanel history={history} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
