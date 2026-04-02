export const PROMPT_VARIABLES = [
  { name: "${stepNOutput}", description: "Output from step N in the pipeline" },
  { name: "${imageDescription}", description: "Description of the current image" },
  { name: "${imageAdditionalContext}", description: "Additional context for the image" },
  { name: "${allCommunityContexts}", description: "All community context entries" },
  { name: "${tenRandomCommunityContexts}", description: "10 random community contexts" },
  { name: "${fiveRelevantCommunityContexts}", description: "5 most relevant community contexts" },
  { name: "${allTerms}", description: "All available terms" },
  { name: "${tenRandomTerms}", description: "10 random terms" },
  { name: "${allCaptionExamples}", description: "All caption examples" },
  { name: "${tenRandomCaptionExamples}", description: "10 random caption examples" },
  { name: "${startRandomizeLines}", description: "Start of randomized line block" },
  { name: "${endRandomizeLines}", description: "End of randomized line block" },
];

/**
 * Extract prompt variables found in the given text.
 * Matches both known variables from the list and any `${...}` pattern.
 */
export function extractVariablesFromText(text: string): typeof PROMPT_VARIABLES {
  if (!text) return [];
  return PROMPT_VARIABLES.filter((v) => text.includes(v.name));
}
