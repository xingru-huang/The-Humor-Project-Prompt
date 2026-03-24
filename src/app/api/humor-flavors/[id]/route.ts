import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { slugifyFlavor, takeFirst } from "@/lib/humor-flavor-utils";
import type {
  HumorFlavorDetail,
  HumorFlavorStep,
} from "@/lib/humor-flavor-types";

function parseFlavorId(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
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
}): HumorFlavorStep {
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

function mapFlavorDetail(row: {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
  modified_datetime_utc: string | null;
  humor_flavor_steps?: Parameters<typeof mapStep>[0][];
  humor_flavor_mix?: { id: number; caption_count: number | null }[];
}): HumorFlavorDetail {
  const steps = (row.humor_flavor_steps ?? [])
    .map((step) => mapStep(step))
    .sort((a, b) => a.orderBy - b.orderBy);

  return {
    id: row.id,
    slug: row.slug,
    description: row.description ?? null,
    createdAt: row.created_datetime_utc,
    modifiedAt: row.modified_datetime_utc ?? null,
    stepCount: steps.length,
    captionCount: row.humor_flavor_mix?.[0]?.caption_count ?? null,
    steps,
  };
}

async function fetchFlavorDetail(supabase: SupabaseClient, id: number) {
  const { data, error } = await supabase
    .from("humor_flavors")
    .select(
      "id, slug, description, created_datetime_utc, modified_datetime_utc, humor_flavor_mix(id, caption_count), humor_flavor_steps(id, humor_flavor_id, order_by, description, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt, created_datetime_utc, modified_datetime_utc, llm_models(name), llm_input_types(slug), llm_output_types(slug), humor_flavor_step_types(slug))"
    )
    .eq("id", id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapFlavorDetail(data), error: null };
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

  const result = await fetchFlavorDetail(ctx.supabase, flavorId);
  if (!result.data) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(
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
  const updates: Record<string, string | null> = {};
  const now = new Date().toISOString();

  if (body.slug !== undefined) {
    const normalizedSlug = slugifyFlavor(String(body.slug ?? ""));
    if (!normalizedSlug) {
      return NextResponse.json(
        { error: "A valid flavor slug is required." },
        { status: 400 }
      );
    }
    updates.slug = normalizedSlug;
  }

  if (body.description !== undefined) {
    updates.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await ctx.supabase
      .from("humor_flavors")
      .update({
        ...updates,
        modified_by_user_id: ctx.user.id,
        modified_datetime_utc: now,
      })
      .eq("id", flavorId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  if (body.captionCount !== undefined) {
    const captionCount = Number(body.captionCount);

    if (!Number.isInteger(captionCount) || captionCount < 0) {
      return NextResponse.json(
        {
          error: "captionCount must be an integer greater than or equal to 0.",
        },
        { status: 400 }
      );
    }

    const { data: mixRow, error: mixLookupError } = await ctx.supabase
      .from("humor_flavor_mix")
      .select("id")
      .eq("humor_flavor_id", flavorId)
      .maybeSingle();

    if (mixLookupError) {
      return NextResponse.json(
        { error: mixLookupError.message },
        { status: 400 }
      );
    }

    if (mixRow?.id) {
      const { error: mixUpdateError } = await ctx.supabase
        .from("humor_flavor_mix")
        .update({
          caption_count: captionCount,
          modified_by_user_id: ctx.user.id,
          modified_datetime_utc: now,
        })
        .eq("id", mixRow.id);

      if (mixUpdateError) {
        return NextResponse.json(
          { error: mixUpdateError.message },
          { status: 400 }
        );
      }
    } else {
      const { error: mixInsertError } = await ctx.supabase
        .from("humor_flavor_mix")
        .insert({
          humor_flavor_id: flavorId,
          caption_count: captionCount,
          created_by_user_id: ctx.user.id,
          modified_by_user_id: ctx.user.id,
          modified_datetime_utc: now,
        });

      if (mixInsertError) {
        return NextResponse.json(
          { error: mixInsertError.message },
          { status: 400 }
        );
      }
    }
  }

  const result = await fetchFlavorDetail(ctx.supabase, flavorId);
  if (!result.data) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.data);
}

export async function DELETE(
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

  const { error: stepsError } = await ctx.supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("humor_flavor_id", flavorId);

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 400 });
  }

  const { error: mixError } = await ctx.supabase
    .from("humor_flavor_mix")
    .delete()
    .eq("humor_flavor_id", flavorId);

  if (mixError) {
    return NextResponse.json({ error: mixError.message }, { status: 400 });
  }

  const { error: flavorError } = await ctx.supabase
    .from("humor_flavors")
    .delete()
    .eq("id", flavorId);

  if (flavorError) {
    return NextResponse.json({ error: flavorError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
