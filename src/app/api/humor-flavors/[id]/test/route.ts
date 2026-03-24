import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { parseResponsePayload, tryParseJson } from "@/lib/humor-flavor-utils";

const API_BASE = "https://api.almostcrackd.ai";

function parseFlavorId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  if (!ctx.accessToken) {
    return NextResponse.json(
      { error: "Unable to access your session token for the caption API." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const flavorId = parseFlavorId(id);

  if (flavorId == null) {
    return NextResponse.json({ error: "Invalid flavor id." }, { status: 400 });
  }

  const body = await request.json();
  const imageId =
    typeof body.imageId === "string" && body.imageId.trim()
      ? body.imageId.trim()
      : null;

  if (!imageId) {
    return NextResponse.json({ error: "imageId is required." }, { status: 400 });
  }

  const response = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageId, humorFlavorId: flavorId }),
    cache: "no-store",
  });

  const responseText = await response.text();
  const parsedBody = tryParseJson(responseText) ?? responseText;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        {
          error:
            "The caption API rejected the current session token. Sign out and sign back in, then retry.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        error:
          typeof parsedBody === "string"
            ? parsedBody
            : JSON.stringify(parsedBody, null, 2),
      },
      { status: response.status }
    );
  }

  const parsedResponse = parseResponsePayload(parsedBody);
  return NextResponse.json(parsedResponse);
}
