import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { parseResponsePayload, takeFirst } from "@/lib/humor-flavor-utils";

function parseFlavorId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const { id } = await params;
  const flavorId = parseFlavorId(id);

  if (flavorId == null) {
    return NextResponse.json({ error: "Invalid flavor id." }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("llm_model_responses")
    .select(
      "id, created_datetime_utc, llm_model_response, caption_request_id, humor_flavor_step_id, humor_flavor_steps(order_by, description), caption_requests(images(url, image_description))"
    )
    .eq("humor_flavor_id", flavorId)
    .order("created_datetime_utc", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const latestByRequest = new Map<
    string,
    {
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
  >();

  for (const row of data ?? []) {
    const captionRequestKey =
      row.caption_request_id == null ? `response:${row.id}` : String(row.caption_request_id);
    const stepMeta = takeFirst(row.humor_flavor_steps);
    const captionRequest = takeFirst(row.caption_requests);
    const imageMeta = takeFirst(captionRequest?.images);
    const stepOrder = stepMeta?.order_by ?? null;
    const existing = latestByRequest.get(captionRequestKey);

    if (existing && (existing.stepOrder ?? -1) > (stepOrder ?? -1)) {
      continue;
    }

    const parsedResponse = parseResponsePayload(row.llm_model_response);
    latestByRequest.set(captionRequestKey, {
      responseId: row.id,
      captionRequestId: row.caption_request_id ?? null,
      createdAt: row.created_datetime_utc,
      stepOrder,
      stepDescription: stepMeta?.description ?? null,
      imageUrl: imageMeta?.url ?? null,
      imageDescription: imageMeta?.image_description ?? null,
      captions: parsedResponse.captions,
      rawResponse: parsedResponse.rawResponse,
    });
  }

  const history = [...latestByRequest.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(history);
}
