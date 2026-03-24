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
import PaginationControls from "@/components/pagination-controls";
import type {
  HumorFlavorEditorOptions,
  HumorFlavorTestResult,
  UploadedTestImage,
} from "@/lib/humor-flavor-types";

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

const TEST_IMAGES_PER_PAGE = 4;
const TEST_IMAGE_UPLOAD_INPUT_ID = "test-image-upload";
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
  const sharedImagesRef = useRef<HTMLDivElement | null>(null);
  const selectedImageIndex = options.testImages.findIndex(
    (image) => image.id === selectedImageId
  );
  const initialImagePage =
    selectedImageIndex >= 0
      ? Math.floor(selectedImageIndex / TEST_IMAGES_PER_PAGE) + 1
      : 1;
  const [requestedImagePage, setRequestedImagePage] = useState(initialImagePage);
  const [descriptionIsSingleLine, setDescriptionIsSingleLine] = useState(false);
  const totalImagePages = Math.max(
    1,
    Math.ceil(options.testImages.length / TEST_IMAGES_PER_PAGE)
  );
  const imagePage = Math.min(requestedImagePage, totalImagePages);
  const visibleImages = options.testImages.slice(
    (imagePage - 1) * TEST_IMAGES_PER_PAGE,
    imagePage * TEST_IMAGES_PER_PAGE
  );

  const selectedUploadedImage =
    uploadedImage && uploadedImage.id === selectedImageId ? uploadedImage : null;
  const selectedSharedImage = options.testImages.find(
    (image) => image.id === selectedImageId
  );
  const selectedImage = selectedUploadedImage ?? selectedSharedImage ?? null;

  function handleSelectImage(nextImageId: string) {
    const nextSelectedIndex = options.testImages.findIndex(
      (image) => image.id === nextImageId
    );
    if (nextSelectedIndex >= 0) {
      setRequestedImagePage(
        Math.floor(nextSelectedIndex / TEST_IMAGES_PER_PAGE) + 1
      );
    }

    onSelectImage(nextImageId);
  }

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
    const preloadImages = options.testImages.map((image) => {
      const browserImage = new Image();
      browserImage.src = image.url;
      return browserImage;
    });

    return () => {
      preloadImages.forEach((browserImage) => {
        browserImage.src = "";
      });
    };
  }, [options.testImages]);

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
            {options.testImages.length} shared images
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
            <input
              id={TEST_IMAGE_UPLOAD_INPUT_ID}
              type="file"
              hidden
              accept={UPLOAD_ACCEPT}
              onChange={handleFileChange}
              disabled={uploadingImage || testing}
            />
            {!selectedImage ? (
              <label
                htmlFor={TEST_IMAGE_UPLOAD_INPUT_ID}
                className={`btn-secondary ${uploadingImage || testing ? "pointer-events-none" : ""}`}
              >
                {uploadingImage ? "Uploading..." : "Upload image"}
              </label>
            ) : null}
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
            <div className="current-image-empty">
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
                {uploadingImage ? "Uploading image..." : "No image selected"}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                JPEG, JPG, PNG, WebP, GIF, or HEIC
              </p>
            </div>
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

      <div ref={sharedImagesRef} className="mt-6">
        <div>
          <p className="eyebrow">Shared Images</p>
        </div>

        <div className="shared-images-grid mt-5 grid items-start gap-3 sm:grid-cols-2">
          {visibleImages.map((image) => (
            <button
              type="button"
              key={image.id}
              onClick={() => handleSelectImage(image.id)}
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

        <PaginationControls
          page={imagePage}
          totalPages={totalImagePages}
          onPageChange={setRequestedImagePage}
          scrollTargetRef={sharedImagesRef}
          scrollOffset={18}
        />
      </div>
    </div>
  );
}
