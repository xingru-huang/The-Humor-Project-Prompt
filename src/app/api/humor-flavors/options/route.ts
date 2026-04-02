import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminApiContext } from "@/lib/admin-auth";
import {
  deduplicateImagesByUrl,
  getImageUrlFingerprint,
} from "@/lib/humor-flavor-utils";
import sharp from "sharp";

export const runtime = "nodejs";

interface TestImageRow {
  id: string;
  url: string;
  image_description: string | null;
  created_datetime_utc: string;
}

const SHARED_IMAGE_LIMIT = 16;
const SHARED_IMAGE_BATCH_SIZE = 8;
const VISUAL_FINGERPRINT_SIZE = 24;
const VISUAL_FINGERPRINT_TIMEOUT_MS = 5000;

async function getVisualImageFingerprint(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(VISUAL_FINGERPRINT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}.`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const normalizedPixels = await sharp(imageBuffer)
    .rotate()
    .resize(VISUAL_FINGERPRINT_SIZE, VISUAL_FINGERPRINT_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .removeAlpha()
    .raw()
    .toBuffer();

  return createHash("sha256").update(normalizedPixels).digest("hex");
}

async function getSharedImageFingerprint(url: string) {
  try {
    return `visual:${await getVisualImageFingerprint(url)}`;
  } catch {
    return `url:${getImageUrlFingerprint(url)}`;
  }
}

async function selectUniqueTestImages(rows: TestImageRow[], limit: number) {
  const candidates = deduplicateImagesByUrl(rows);
  const seenFingerprints = new Set<string>();
  const uniqueRows: TestImageRow[] = [];

  for (
    let index = 0;
    index < candidates.length && uniqueRows.length < limit;
    index += SHARED_IMAGE_BATCH_SIZE
  ) {
    const batch = candidates.slice(index, index + SHARED_IMAGE_BATCH_SIZE);
    const fingerprints = await Promise.all(
      batch.map(async (row) => ({
        row,
        fingerprint: await getSharedImageFingerprint(row.url),
      }))
    );

    for (const item of fingerprints) {
      if (seenFingerprints.has(item.fingerprint)) {
        continue;
      }

      seenFingerprints.add(item.fingerprint);
      uniqueRows.push(item.row);
      if (uniqueRows.length >= limit) {
        break;
      }
    }
  }

  return uniqueRows;
}

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
        .limit(80),
    ]);

  for (const result of [models, inputTypes, outputTypes, stepTypes, testImages]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
  }

  const uniqueTestImages = await selectUniqueTestImages(
    (testImages.data ?? []) as TestImageRow[],
    SHARED_IMAGE_LIMIT
  );

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
    testImages: uniqueTestImages.map((row) => ({
      id: row.id,
      url: row.url,
      imageDescription: row.image_description ?? null,
      createdAt: row.created_datetime_utc,
    })),
  });
}
