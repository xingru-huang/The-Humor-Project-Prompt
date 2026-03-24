import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { takeFirst } from "@/lib/humor-flavor-utils";

function parseNumberId(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return NextResponse.json(
      { error: `Invalid ${label}.` },
      { status: 400 }
    );
  }

  return parsed;
}

function parseOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const { id, stepId } = await params;
  const flavorId = parseNumberId(id, "flavor id");
  if (typeof flavorId !== "number") return flavorId;

  const parsedStepId = parseNumberId(stepId, "step id");
  if (typeof parsedStepId !== "number") return parsedStepId;

  const body = await request.json();
  const updates: Record<string, number | string | null> = {};

  if (body.description !== undefined) {
    updates.description = parseOptionalText(body.description);
  }

  if (body.llmTemperature !== undefined) {
    if (body.llmTemperature == null || body.llmTemperature === "") {
      updates.llm_temperature = null;
    } else {
      const parsedTemperature = Number(body.llmTemperature);
      if (Number.isNaN(parsedTemperature)) {
        return NextResponse.json(
          { error: "llmTemperature must be a number." },
          { status: 400 }
        );
      }
      updates.llm_temperature = parsedTemperature;
    }
  }

  const numericFields = [
    ["llmModelId", "llm_model_id"],
    ["llmInputTypeId", "llm_input_type_id"],
    ["llmOutputTypeId", "llm_output_type_id"],
    ["humorFlavorStepTypeId", "humor_flavor_step_type_id"],
  ] as const;

  for (const [sourceKey, targetKey] of numericFields) {
    if (body[sourceKey] !== undefined) {
      const parsedValue = Number(body[sourceKey]);
      if (!Number.isInteger(parsedValue)) {
        return NextResponse.json(
          { error: `${sourceKey} must be an integer.` },
          { status: 400 }
        );
      }
      updates[targetKey] = parsedValue;
    }
  }

  if (body.llmSystemPrompt !== undefined) {
    updates.llm_system_prompt = parseOptionalText(body.llmSystemPrompt);
  }

  if (body.llmUserPrompt !== undefined) {
    const llmUserPrompt = parseOptionalText(body.llmUserPrompt);
    if (!llmUserPrompt) {
      return NextResponse.json(
        { error: "llmUserPrompt is required." },
        { status: 400 }
      );
    }
    updates.llm_user_prompt = llmUserPrompt;
  }

  const { data, error } = await ctx.supabase
    .from("humor_flavor_steps")
    .update({
      ...updates,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: new Date().toISOString(),
    })
    .eq("id", parsedStepId)
    .eq("humor_flavor_id", flavorId)
    .select(
      "id, humor_flavor_id, order_by, description, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, created_datetime_utc, modified_datetime_utc, llm_models(name), llm_input_types(slug), llm_output_types(slug), humor_flavor_step_types(slug)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(mapStep(data));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const { id, stepId } = await params;
  const flavorId = parseNumberId(id, "flavor id");
  if (typeof flavorId !== "number") return flavorId;

  const parsedStepId = parseNumberId(stepId, "step id");
  if (typeof parsedStepId !== "number") return parsedStepId;

  const { data: deletedStep, error: lookupError } = await ctx.supabase
    .from("humor_flavor_steps")
    .select("id, order_by")
    .eq("id", parsedStepId)
    .eq("humor_flavor_id", flavorId)
    .single();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 404 });
  }

  const { error } = await ctx.supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("id", parsedStepId)
    .eq("humor_flavor_id", flavorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: remaining, error: remainingError } = await ctx.supabase
    .from("humor_flavor_steps")
    .select("id, order_by")
    .eq("humor_flavor_id", flavorId)
    .gt("order_by", deletedStep.order_by)
    .order("order_by", { ascending: true });

  if (remainingError) {
    return NextResponse.json({ error: remainingError.message }, { status: 400 });
  }

  const now = new Date().toISOString();
  for (const step of remaining ?? []) {
    const { error: reorderError } = await ctx.supabase
      .from("humor_flavor_steps")
      .update({
        order_by: Number(step.order_by) - 1,
        modified_by_user_id: ctx.user.id,
        modified_datetime_utc: now,
      })
      .eq("id", step.id);

    if (reorderError) {
      return NextResponse.json(
        { error: reorderError.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
