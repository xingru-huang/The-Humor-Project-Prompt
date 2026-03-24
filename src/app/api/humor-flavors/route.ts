import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import { slugifyFlavor } from "@/lib/humor-flavor-utils";
import type { HumorFlavorSummary } from "@/lib/humor-flavor-types";

function mapFlavorSummary(row: {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
  modified_datetime_utc: string | null;
  humor_flavor_steps?: { id: number }[];
  humor_flavor_mix?: { caption_count: number | null }[];
}): HumorFlavorSummary {
  return {
    id: row.id,
    slug: row.slug,
    description: row.description ?? null,
    createdAt: row.created_datetime_utc,
    modifiedAt: row.modified_datetime_utc ?? null,
    stepCount: row.humor_flavor_steps?.length ?? 0,
    captionCount: row.humor_flavor_mix?.[0]?.caption_count ?? null,
  };
}

export async function GET() {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const { data, error } = await ctx.supabase
    .from("humor_flavors")
    .select(
      "id, slug, description, created_datetime_utc, modified_datetime_utc, humor_flavor_steps(id), humor_flavor_mix(caption_count)"
    )
    .order("modified_datetime_utc", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json((data ?? []).map((row) => mapFlavorSummary(row)));
}

export async function POST(request: Request) {
  const ctx = await requireAdminApiContext();
  if ("errorResponse" in ctx) return ctx.errorResponse;

  const body = await request.json();
  const normalizedSlug = slugifyFlavor(String(body.slug ?? ""));
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const captionCount =
    body.captionCount == null || body.captionCount === ""
      ? 5
      : Number(body.captionCount);

  if (!normalizedSlug) {
    return NextResponse.json(
      { error: "A valid flavor slug is required." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(captionCount) || captionCount < 0) {
    return NextResponse.json(
      { error: "captionCount must be an integer greater than or equal to 0." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const { data: flavor, error: flavorError } = await ctx.supabase
    .from("humor_flavors")
    .insert({
      slug: normalizedSlug,
      description,
      created_by_user_id: ctx.user.id,
      modified_by_user_id: ctx.user.id,
      modified_datetime_utc: now,
    })
    .select("id, slug, description, created_datetime_utc, modified_datetime_utc")
    .single();

  if (flavorError) {
    return NextResponse.json({ error: flavorError.message }, { status: 400 });
  }

  const { error: mixError } = await ctx.supabase.from("humor_flavor_mix").insert({
    humor_flavor_id: flavor.id,
    caption_count: captionCount,
    created_by_user_id: ctx.user.id,
    modified_by_user_id: ctx.user.id,
    modified_datetime_utc: now,
  });

  if (mixError) {
    await ctx.supabase.from("humor_flavors").delete().eq("id", flavor.id);
    return NextResponse.json({ error: mixError.message }, { status: 400 });
  }

  return NextResponse.json(
    mapFlavorSummary({
      ...flavor,
      humor_flavor_steps: [],
      humor_flavor_mix: [{ caption_count: captionCount }],
    }),
    { status: 201 }
  );
}
