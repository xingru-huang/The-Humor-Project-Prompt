import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { tryParseJson } from "@/lib/humor-flavor-utils";

const API_BASE = "https://api.almostcrackd.ai";

const SUPPORTED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

function getSupportedContentType(file: File) {
  const reportedType = file.type.trim().toLowerCase();
  if (SUPPORTED_CONTENT_TYPES.has(reportedType)) {
    return reportedType;
  }

  const fileName = file.name.trim().toLowerCase();
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (fileName.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".webp")) {
    return "image/webp";
  }

  if (fileName.endsWith(".gif")) {
    return "image/gif";
  }

  if (fileName.endsWith(".heic")) {
    return "image/heic";
  }

  return null;
}

async function readApiPayload(response: Response) {
  const responseText = await response.text();
  return tryParseJson(responseText) ?? responseText;
}

function formatApiError(payload: unknown) {
  return typeof payload === "string"
    ? payload
    : JSON.stringify(payload, null, 2);
}

export async function POST(request: Request) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  if (!ctx.accessToken) {
    return NextResponse.json(
      { error: "Unable to access your session token for the image upload API." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A single image file is required." },
      { status: 400 }
    );
  }

  const contentType = getSupportedContentType(file);
  if (!contentType) {
    return NextResponse.json(
      {
        error:
          "Unsupported image type. Use JPEG, JPG, PNG, WebP, GIF, or HEIC.",
      },
      { status: 400 }
    );
  }

  const presignedResponse = await fetch(
    `${API_BASE}/pipeline/generate-presigned-url`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contentType }),
      cache: "no-store",
    }
  );
  const presignedPayload = await readApiPayload(presignedResponse);

  if (!presignedResponse.ok) {
    return NextResponse.json(
      { error: formatApiError(presignedPayload) },
      { status: presignedResponse.status }
    );
  }

  const presignedData =
    presignedPayload && typeof presignedPayload === "object"
      ? (presignedPayload as {
          presignedUrl?: unknown;
          cdnUrl?: unknown;
        })
      : null;
  const presignedUrl =
    typeof presignedData?.presignedUrl === "string"
      ? presignedData.presignedUrl
      : null;
  const cdnUrl =
    typeof presignedData?.cdnUrl === "string" ? presignedData.cdnUrl : null;

  if (!presignedUrl || !cdnUrl) {
    return NextResponse.json(
      { error: "Caption API did not return a usable upload target." },
      { status: 502 }
    );
  }

  const uploadResponse = await fetch(presignedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: await file.arrayBuffer(),
    cache: "no-store",
  });

  if (!uploadResponse.ok) {
    return NextResponse.json(
      {
        error: `Direct image upload failed with status ${uploadResponse.status}.`,
      },
      { status: 502 }
    );
  }

  const registerResponse = await fetch(
    `${API_BASE}/pipeline/upload-image-from-url`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl: cdnUrl,
        isCommonUse: false,
      }),
      cache: "no-store",
    }
  );
  const registerPayload = await readApiPayload(registerResponse);

  if (!registerResponse.ok) {
    return NextResponse.json(
      { error: formatApiError(registerPayload) },
      { status: registerResponse.status }
    );
  }

  const registerData =
    registerPayload && typeof registerPayload === "object"
      ? (registerPayload as { imageId?: unknown })
      : null;
  const imageId =
    typeof registerData?.imageId === "string" ? registerData.imageId : null;

  if (!imageId) {
    return NextResponse.json(
      { error: "Caption API did not return an imageId after registration." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    id: imageId,
    url: cdnUrl,
    fileName: file.name,
    contentType,
    createdAt: new Date().toISOString(),
  });
}
