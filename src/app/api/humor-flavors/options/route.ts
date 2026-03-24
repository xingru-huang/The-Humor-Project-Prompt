import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";

export async function GET() {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const [models, inputTypes, outputTypes, stepTypes, testImages] =
    await Promise.all([
      ctx.supabase.from("llm_models").select("id, name").order("name", {
        ascending: true,
      }),
      ctx.supabase
        .from("llm_input_types")
        .select("id, slug")
        .order("slug", { ascending: true }),
      ctx.supabase
        .from("llm_output_types")
        .select("id, slug")
        .order("slug", { ascending: true }),
      ctx.supabase
        .from("humor_flavor_step_types")
        .select("id, slug")
        .order("slug", { ascending: true }),
      ctx.supabase
        .from("images")
        .select("id, url, image_description, created_datetime_utc")
        .order("created_datetime_utc", { ascending: false })
        .limit(16),
    ]);

  for (const result of [models, inputTypes, outputTypes, stepTypes, testImages]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    models: (models.data ?? []).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    inputTypes: (inputTypes.data ?? []).map((row) => ({
      id: row.id,
      label: row.slug,
    })),
    outputTypes: (outputTypes.data ?? []).map((row) => ({
      id: row.id,
      label: row.slug,
    })),
    stepTypes: (stepTypes.data ?? []).map((row) => ({
      id: row.id,
      label: row.slug,
    })),
    testImages: (testImages.data ?? []).map((row) => ({
      id: row.id,
      url: row.url,
      imageDescription: row.image_description ?? null,
      createdAt: row.created_datetime_utc,
    })),
  });
}
