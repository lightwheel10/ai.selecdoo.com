/**
 * Claude client for AI content generation.
 *
 * Separate from the ai-clean client (src/lib/ai-clean/client.ts) so
 * content generation can use a different model (Sonnet for quality)
 * and different token limits without affecting the cleaning pipeline.
 *
 * Uses the same Anthropic API key but reads the model from
 * ANTHROPIC_CONTENT_MODEL env var (defaults to claude-sonnet-4-20250514).
 */

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Shared Claude JSON caller. Strips markdown fences before parsing.
 */
async function callJSON<T>(
  system: string,
  user: string,
  maxTokens: number
): Promise<T> {
  const client = getClient();
  const model = process.env.ANTHROPIC_CONTENT_MODEL || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown fences if present (Claude sometimes wraps JSON in ```json ... ```)
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

/**
 * Generate contextual question options for the questionnaire step.
 * Uses lower token limit since the response is small (3 questions + options).
 */
export async function generateQuestionOptions<T>(
  system: string,
  user: string
): Promise<T> {
  return callJSON<T>(system, user, 4096);
}

/**
 * Generate deal/post content (DE + EN) based on product data + user answers.
 * Uses higher token limit for the full content output.
 */
export async function generateContent<T>(
  system: string,
  user: string
): Promise<T> {
  return callJSON<T>(system, user, 16384);
}
