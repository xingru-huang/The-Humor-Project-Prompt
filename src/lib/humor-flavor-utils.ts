export function slugifyFlavor(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function takeFirst<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function tryParseJson(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (
    !(
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    )
  ) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeCaptionItem(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeCaptionItem(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if ("captions" in record) {
      return normalizeCaptionItem(record.captions);
    }

    for (const key of ["content", "caption", "text", "value", "context_key"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return [candidate.trim()];
      }
    }

    try {
      return [JSON.stringify(record)];
    } catch {
      return [];
    }
  }

  return [];
}

export function normalizeCaptions(value: unknown) {
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== undefined) {
      return normalizeCaptionItem(parsed);
    }

    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
      .filter(Boolean);
  }

  return normalizeCaptionItem(value);
}

export function stringifyResponse(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function parseResponsePayload(value: unknown) {
  const parsed =
    typeof value === "string" ? tryParseJson(value) ?? value : value;

  return {
    captions: normalizeCaptions(parsed),
    rawResponse: stringifyResponse(parsed),
  };
}
