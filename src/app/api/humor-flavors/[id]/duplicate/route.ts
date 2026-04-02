import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { slugifyFlavor } from "@/lib/humor-flavor-utils";

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

  const { id } = await params;
  const sourceFlavorId = parseFlavorId(id);

  if (sourceFlavorId == null) {
    return NextResponse.json({ error: "Invalid flavor id." }, { status: 400 });
  }

  const body = await request.json();
  const newSlug = slugifyFlavor(String(body.slug ?? ""));
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;

  if (!newSlug) {
    return NextResponse.json(
      { error: "A valid slug is required for the duplicate." },
      { status: 400 }
    );
  }

  // Fetch the source flavor steps and mix separately for reliable data
  const [flavorResult, mixResult, stepsResult] = await Promise.all([
    ctx.supabase
      .from("humor_flavors")
      .select("id, slug, description")
      .eq("id", sourceFlavorId)
      .single(),
    ctx.supabase
      .from("humor_flavor_mix")
      .select("caption_count")
      .eq("humor_flavor_id", sourceFlavorId)
      .maybeSingle(),
    ctx.supabase
      .from("humor_flavor_steps")
      .select("order_by, description, llm_temperature, llm_model_id, llm_input_type_id, llm_output_type_id, humor_flavor_step_type_id, llm_system_prompt, llm_user_prompt")
      .eq("humor_flavor_id", sourceFlavorId)
      .order("order_by", { ascending: true }),
  ]);

  if (flavorResult.error || !flavorResult.data) {
    return NextResponse.json(
      { error: "Source flavor not found." },
      { status: 404 }
    );
  }

  const sourceFlavor = flavorResult.data;
  const now = new Date().toISOString();

  // Create the new flavor
  const { data: newFlavor, error: createError } = await ctx.supabase
    .from("humor_flavors")
    .insert({
      slug: newSlug,
      description,
      created_by_user_id: ctx.user.id,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: now,
    })
    .select("id")
    .single();

  if (createError || !newFlavor) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create duplicate flavor." },
      { status: 400 }
    );
  }

  // Copy the mix (caption count) — preserve the source value exactly
  const captionCount = mixResult.data?.caption_count ?? 0;

  const { error: mixError } = await ctx.supabase
    .from("humor_flavor_mix")
    .insert({
      humor_flavor_id: newFlavor.id,
      caption_count: captionCount,
      created_by_user_id: ctx.user.id,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: now,
    });

  if (mixError) {
    // Cleanup on failure
    await ctx.supabase.from("humor_flavors").delete().eq("id", newFlavor.id);
    return NextResponse.json({ error: mixError.message }, { status: 400 });
  }

  // Copy all steps
  const steps = stepsResult.data ?? [];

  if (steps.length > 0) {
    const stepInserts = steps.map((step) => ({
      humor_flavor_id: newFlavor.id,
      order_by: step.order_by,
      description: step.description,
      llm_temperature: step.llm_temperature,
      llm_model_id: step.llm_model_id,
      llm_input_type_id: step.llm_input_type_id,
      llm_output_type_id: step.llm_output_type_id,
      humor_flavor_step_type_id: step.humor_flavor_step_type_id,
      llm_system_prompt: step.llm_system_prompt,
      llm_user_prompt: step.llm_user_prompt,
      created_by_user_id: ctx.user.id,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: now,
    }));

    const { error: stepsError } = await ctx.supabase
      .from("humor_flavor_steps")
      .insert(stepInserts);

    if (stepsError) {
      // Cleanup on failure
      await ctx.supabase
        .from("humor_flavor_mix")
        .delete()
        .eq("humor_flavor_id", newFlavor.id);
      await ctx.supabase.from("humor_flavors").delete().eq("id", newFlavor.id);
      return NextResponse.json({ error: stepsError.message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { id: newFlavor.id, slug: newSlug },
    { status: 201 }
  );
}
