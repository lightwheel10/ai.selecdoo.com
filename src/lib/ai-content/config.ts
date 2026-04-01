/**
 * AI content generation feature flag.
 *
 * Controls which provider handles deal/post generation:
 * - "claude": New pipeline with questionnaire → Claude generation (DE + EN)
 * - "n8n":    Legacy pipeline that sends product data to n8n webhooks
 *
 * To switch back to n8n, change this value and redeploy.
 * In the future, this could be moved to an env var or app_settings DB table.
 */
export const AI_PROVIDER: "claude" | "n8n" = "claude";
