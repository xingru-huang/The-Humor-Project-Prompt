import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { takeFirst } from "@/lib/humor-flavor-utils";

function parseFlavorId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRequiredNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return { error: `${field} must be an integer.` };
  }

  return { value: parsed };
}

function mapStep(row: {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_temperature: number | null;
  llm_model_id: number | null;
  llm_input_type_id: number | null;
  llm_output_type_id: number | null;
  humor_flavor_step_type_id: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  created_datetime_utc: string;
  modified_datetime_utc: string | null;
  llm_models?: { name: string | null }[] | { name: string | null } | null;
  llm_input_types?: { slug: string | null }[] | { slug: string | null } | null;
  llm_output_types?: { slug: string | null }[] | { slug: string | null } | null;
  humor_flavor_step_types?:
    | { slug: string | null }[]
    | { slug: string | null }
    | null;
}) {
  const model = takeFirst(row.llm_models);
  const inputType = takeFirst(row.llm_input_types);
  const outputType = takeFirst(row.llm_output_types);
  const stepType = takeFirst(row.humor_flavor_step_types);

  return {
    id: row.id,
    humorFlavorId: row.humor_flavor_id,
    orderBy: row.order_by,
    description: row.description ?? null,
    llmTemperature: row.llm_temperature ?? null,
    llmModelId: row.llm_model_id ?? null,
    llmModelName: model?.name ?? null,
    llmInputTypeId: row.llm_input_type_id ?? null,
    llmInputTypeSlug: inputType?.slug ?? null,
    llmOutputTypeId: row.llm_output_type_id ?? null,
    llmOutputTypeSlug: outputType?.slug ?? null,
    humorFlavorStepTypeId: row.humor_flavor_step_type_id ?? null,
    humorFlavorStepTypeSlug: stepType?.slug ?? null,
    llmSystemPrompt: row.llm_system_prompt ?? null,
    llmUserPrompt: row.llm_user_prompt ?? null,
    createdAt: row.created_datetime_utc,
    modifiedAt: row.modified_datetime_utc ?? null,
  };
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
    .from("humor_flavor_steps")
    .select(
      "id, humor_flavor_id, order_by, description, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, created_datetime_utc, modified_datetime_utc, llm_models(name), llm_input_types(slug), llm_output_types(slug), humor_flavor_step_types(slug)"
    )
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json((data ?? []).map((row) => mapStep(row)));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const { id } = await params;
  const flavorId = parseFlavorId(id);

  if (flavorId == null) {
    return NextResponse.json({ error: "Invalid flavor id." }, { status: 400 });
  }

  const body = await request.json();
  const llmModelId = parseRequiredNumber(body.llmModelId, "llmModelId");
  const llmInputTypeId = parseRequiredNumber(
    body.llmInputTypeId,
    "llmInputTypeId"
  );
  const llmOutputTypeId = parseRequiredNumber(
    body.llmOutputTypeId,
    "llmOutputTypeId"
  );
  const humorFlavorStepTypeId = parseRequiredNumber(
    body.humorFlavorStepTypeId,
    "humorFlavorStepTypeId"
  );
  const llmTemperature =
    body.llmTemperature == null || body.llmTemperature === ""
      ? null
      : Number(body.llmTemperature);
  const llmUserPrompt = parseOptionalText(body.llmUserPrompt);

  for (const parsed of [
    llmModelId,
    llmInputTypeId,
    llmOutputTypeId,
    humorFlavorStepTypeId,
  ]) {
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
  }

  if (llmTemperature != null && Number.isNaN(llmTemperature)) {
    return NextResponse.json(
      { error: "llmTemperature must be a number." },
      { status: 400 }
    );
  }

  if (!llmUserPrompt) {
    return NextResponse.json(
      { error: "llmUserPrompt is required." },
      { status: 400 }
    );
  }

  const { data: existing, error: orderError } = await ctx.supabase
    .from("humor_flavor_steps")
    .select("order_by")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: false })
    .limit(1);

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 400 });
  }

  const nextOrder =
    existing && existing.length > 0 ? Number(existing[0].order_by) + 1 : 1;
  const now = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("humor_flavor_steps")
    .insert({
      humor_flavor_id: flavorId,
      order_by: nextOrder,
      description: parseOptionalText(body.description),
      llm_temperature: llmTemperature,
      llm_model_id: llmModelId.value,
      llm_input_type_id: llmInputTypeId.value,
      llm_output_type_id: llmOutputTypeId.value,
      humor_flavor_step_type_id: humorFlavorStepTypeId.value,
      llm_system_prompt: parseOptionalText(body.llmSystemPrompt),
      llm_user_prompt: llmUserPrompt,
      created_by_user_id: ctx.user.id,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: now,
    })
    .select(
      "id, humor_flavor_id, order_by, description, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, created_datetime_utc, modified_datetime_utc, llm_models(name), llm_input_types(slug), llm_output_types(slug), humor_flavor_step_types(slug)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(mapStep(data), { status: 201 });
}
