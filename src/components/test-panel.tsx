/* eslint-disable @next/next/no-img-element */
"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import type {
  HumorFlavorEditorOptions,
  HumorFlavorTestResult,
  UploadedTestImage,
} from "@/lib/humor-flavor-types";
import { deduplicateImagesByUrl } from "@/lib/humor-flavor-utils";

interface TestPanelProps {
  options: HumorFlavorEditorOptions;
  uploadedImage: UploadedTestImage | null;
  selectedImageId: string;
  testResult: HumorFlavorTestResult | null;
  uploadingImage: boolean;
  testing: boolean;
  onSelectImage: (imageId: string) => void;
  onUploadImage: (file: File) => void;
  onClearSelectedImage: () => void;
  onRunTest: () => void;
}

const UPLOAD_ACCEPT =
  ".jpeg,.jpg,.png,.webp,.gif,.heic,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic";

export default function TestPanel({
  options,
  uploadedImage,
  selectedImageId,
  testResult,
  uploadingImage,
  testing,
  onSelectImage,
  onUploadImage,
  onClearSelectedImage,
  onRunTest,
}: TestPanelProps) {
  const resultRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const [descriptionIsSingleLine, setDescriptionIsSingleLine] = useState(false);

  const uniqueImages = deduplicateImagesByUrl(options.testImages);

  const selectedUploadedImage =
    uploadedImage && uploadedImage.id === selectedImageId ? uploadedImage : null;
  const selectedSharedImage = uniqueImages.find(
    (image) => image.id === selectedImageId
  );
  const selectedImage = selectedUploadedImage ?? selectedSharedImage ?? null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    onUploadImage(file);
    event.target.value = "";
  }

  function handleRemoveSelectedImage(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onClearSelectedImage();
  }

  useEffect(() => {
    if (!testResult || !resultRef.current) return;

    resultRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [testResult]);

  useEffect(() => {
    const preloadImages = uniqueImages.map((image) => {
      const browserImage = new Image();
      browserImage.src = image.url;
      return browserImage;
    });

    return () => {
      preloadImages.forEach((browserImage) => {
        browserImage.src = "";
      });
    };
  }, [uniqueImages]);

  useLayoutEffect(() => {
    const descriptionNode = descriptionRef.current;
    if (!(descriptionNode instanceof HTMLParagraphElement)) return;
    const descriptionElement = descriptionNode;

    function updateDescriptionLayout() {
      const computedStyle = window.getComputedStyle(descriptionElement);
      const lineHeight = Number.parseFloat(computedStyle.lineHeight);
      if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
        setDescriptionIsSingleLine(false);
        return;
      }

      setDescriptionIsSingleLine(
        descriptionElement.scrollHeight <= lineHeight * 1.5
      );
    }

    updateDescriptionLayout();

    const resizeObserver = new ResizeObserver(() => {
      updateDescriptionLayout();
    });

    resizeObserver.observe(descriptionElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedImage?.id, selectedSharedImage?.imageDescription, selectedUploadedImage?.fileName]);

  return (
    <div className="panel-muted section-enter section-enter-delay-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Run Test</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
            Generate captions
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">
            Upload your own image or pick one from the shared test set.
          </p>
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            {uploadedImage ? "1 custom image + " : ""}
            {uniqueImages.length} shared images
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRunTest}
            disabled={!selectedImageId || testing || uploadingImage}
            className="btn-primary w-full sm:w-auto"
          >
            {testing ? "Generating..." : "Run test"}
          </button>
        </div>
      </div>

      <section className="mt-6 section-enter section-enter-delay-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Current Image</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedImage ? (
              <button
                type="button"
                onClick={handleRemoveSelectedImage}
                className="btn-secondary"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div className="upload-stage mt-5">
          {selectedImage ? (
            <div className="current-image-content">
              <img
                src={selectedImage.url}
                alt={selectedUploadedImage?.fileName ?? selectedSharedImage?.id ?? "Selected image"}
                className="current-image-preview"
                loading="eager"
              />

              <div className="current-image-meta">
                {selectedUploadedImage ? (
                  <p
                    ref={descriptionRef}
                    className={`current-image-copy ${descriptionIsSingleLine ? "is-centered" : ""}`}
                  >
                    Using your uploaded image for testing.
                  </p>
                ) : selectedSharedImage?.imageDescription ? (
                  <p
                    ref={descriptionRef}
                    className={`current-image-copy ${descriptionIsSingleLine ? "is-centered" : ""}`}
                  >
                    {selectedSharedImage.imageDescription}
                  </p>
                ) : (
                  <p
                    ref={descriptionRef}
                    className={`current-image-copy ${descriptionIsSingleLine ? "is-centered" : ""}`}
                  >
                    No image description stored.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <label
              className={`upload-dropzone ${uploadingImage || testing ? "pointer-events-none" : ""}`}
            >
              <input
                type="file"
                className="upload-dropzone-input"
                accept={UPLOAD_ACCEPT}
                onChange={handleFileChange}
                disabled={uploadingImage || testing}
              />
              <div className="upload-dropzone-surface">
                <span className="upload-dropzone-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  </svg>
                </span>
                <p className="text-lg font-medium text-[var(--foreground)]">
                  {uploadingImage ? "Uploading image..." : "Click to upload an image"}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Or choose one from Shared Images below.
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  JPEG, JPG, PNG, WebP, GIF, or HEIC
                </p>
              </div>
            </label>
          )}
        </div>

        {testResult ? (
          <div
            ref={resultRef}
            className="mt-6 panel card-interactive space-y-4 p-4 sm:p-5"
          >
            {testResult.captions.length > 0 ? (
              <div className="space-y-2">
                {testResult.captions.map((caption, index) => (
                  <div
                    key={`${caption}-${index}`}
                    className="prompt-block text-sm text-[var(--foreground)]"
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                      {index + 1}
                    </span>
                    {caption}
                  </div>
                ))}
              </div>
            ) : (
              <pre className="prompt-block whitespace-pre-wrap font-mono text-[13px] leading-6 text-[var(--foreground)]">
                {testResult.rawResponse}
              </pre>
            )}
          </div>
        ) : null}
      </section>

      <div className="mt-6">
        <div>
          <p className="eyebrow">Shared Images</p>
        </div>

        <div className="mt-5 grid items-start gap-3 sm:grid-cols-2">
          {uniqueImages.map((image) => (
            <button
              type="button"
              key={image.id}
              onClick={() => onSelectImage(image.id)}
              className={`image-tile ${
                selectedImageId === image.id ? "is-selected" : ""
              }`}
            >
              <img
                src={image.url}
                alt={image.imageDescription ?? image.id}
                className="w-full max-h-60 rounded-t-[1.25rem] object-contain bg-[var(--muted)]"
                loading="eager"
              />
              <div className="p-4">
                <p className="line-clamp-2 text-sm text-[var(--foreground)]">
                  {image.imageDescription || "No image description stored."}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
