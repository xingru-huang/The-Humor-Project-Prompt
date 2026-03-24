import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";

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
  const flavorId = parseFlavorId(id);

  if (flavorId == null) {
    return NextResponse.json({ error: "Invalid flavor id." }, { status: 400 });
  }

  const body = await request.json();
  if (!Array.isArray(body.stepIds)) {
    return NextResponse.json(
      { error: "stepIds must be an array." },
      { status: 400 }
    );
  }

  const stepIds = body.stepIds.map((value: unknown) => Number(value));
  if (!stepIds.every((value: number) => Number.isInteger(value))) {
    return NextResponse.json(
      { error: "stepIds must contain integers only." },
      { status: 400 }
    );
  }

  const { data: steps, error: stepsError } = await ctx.supabase
    .from("humor_flavor_steps")
    .select("id")
    .eq("humor_flavor_id", flavorId);

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 400 });
  }

  const existingIds = new Set((steps ?? []).map((step) => Number(step.id)));
  if (
    stepIds.length !== existingIds.size ||
    stepIds.some((stepId: number) => !existingIds.has(stepId))
  ) {
    return NextResponse.json(
      { error: "stepIds must contain every step for the selected flavor." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  for (let index = 0; index < stepIds.length; index += 1) {
    const { error } = await ctx.supabase
      .from("humor_flavor_steps")
      .update({
        order_by: index + 1,
        modified_by_user_id: ctx.user.id,
        modified_datetime_utc: now,
      })
      .eq("id", stepIds[index])
      .eq("humor_flavor_id", flavorId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
