import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Call Claude with a system + user prompt and parse the response as JSON.
 * Strips markdown fences (```json ... ```) if present before parsing.
 */
export async function callClaudeJSON<T>(
  system: string,
  user: string
): Promise<T> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}
