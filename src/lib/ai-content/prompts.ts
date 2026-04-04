/**
 * Prompt builders and types for the Claude-based AI content generation pipeline.
 *
 * Two-step flow:
 * 1. Options generation: Claude analyzes product data and returns contextual
 *    options for 3 fixed questions (focus, occasion, tone).
 * 2. Content generation: Claude generates deal/post content (DE + EN) using
 *    product data + the user's answers in a Hormozi-style copywriting prompt.
 */

// ─── Types ───

/** A single question with dynamically generated options */
export interface QuestionOption {
  id: "focus" | "occasion" | "tone";
  question: string;
  options: string[];
}

/** Response from the options generation call (single question per step) */
export type QuestionOptionsResponse = QuestionOption;

/** A single user answer */
export interface QuestionAnswer {
  id: string;
  answer: string;
}

/** Response from the content generation call */
export interface GeneratedContentResponse {
  content_de: string;
  content_en: string;
}

// ─── Helpers ───

/**
 * Format product data into a readable text block for the prompt.
 * Uses all enriched fields available from the DB (cleaned titles,
 * AI descriptions, variants, shipping data, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatProductData(product: Record<string, any>, store: Record<string, any>): string {
  const lines: string[] = [];

  // Current date — helps Claude generate seasonally relevant content
  // and reference timely promotions (e.g. "this week only", "spring sale")
  lines.push(`Today's Date: ${new Date().toISOString().split("T")[0]}`);

  // Core product info
  lines.push(`\n## Product`);
  lines.push(`Title: ${product.cleaned_title || product.title}`);
  if (product.brand) lines.push(`Brand: ${product.brand}`);
  lines.push(`Price: ${product.price} ${product.currency || "EUR"}`);
  if (product.original_price) lines.push(`Original Price: ${product.original_price} ${product.currency || "EUR"}`);
  if (product.discount_percentage) lines.push(`Discount: ${product.discount_percentage}%`);
  lines.push(`In Stock: ${product.in_stock ? "Yes" : "No"}`);
  if (product.condition) lines.push(`Condition: ${product.condition}`);
  if (product.ai_category) lines.push(`Category: ${product.ai_category}`);
  if (product.coupon_code) lines.push(`Coupon Code: ${product.coupon_code}`);

  // Raw description from store (contains promotional text, ingredients, etc.)
  if (product.description) {
    // Strip HTML tags for readability, keep text content
    const plainText = product.description
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);
    lines.push(`\nProduct Description (from store):\n${plainText}`);
  }

  // AI-cleaned descriptions (if available)
  if (product.description_de) {
    const plainDe = product.description_de.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
    lines.push(`\nGerman Description (AI-cleaned):\n${plainDe}`);
  }
  if (product.description_en) {
    const plainEn = product.description_en.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
    lines.push(`\nEnglish Description (AI-cleaned):\n${plainEn}`);
  }

  // Variants with pricing (tiered pricing, bundles)
  if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
    lines.push(`\nVariants (${product.variants.length} total):`);
    for (const v of product.variants.slice(0, 10)) {
      const title = v.title || v.option1 || "Variant";
      const price = v.price?.current
        ? `${(v.price.current / 100).toFixed(2)}`
        : v.price
          ? `${v.price}`
          : "N/A";
      const prev = v.price?.previous && v.price.previous > 0
        ? ` (was ${(v.price.previous / 100).toFixed(2)})`
        : "";
      const stock = v.price?.stockStatus || (v.in_stock ? "InStock" : "OutOfStock");
      lines.push(`  - ${title}: ${price}${prev} [${stock}]`);
    }
  }

  // Store info
  lines.push(`\n## Store`);
  lines.push(`Name: ${store.name}`);
  if (store.platform) lines.push(`Platform: ${store.platform}`);
  if (store.description_en) {
    lines.push(`Store Description: ${store.description_en.slice(0, 500)}`);
  }
  if (store.coupon_code) lines.push(`Store Coupon: ${store.coupon_code}`);
  if (store.ai_shipping_country) {
    lines.push(`Shipping: ${store.ai_shipping_country}, ${store.ai_shipping_price || "free"} via ${store.ai_shipping_service || "standard"}`);
    if (store.ai_shipping_min_transit_time && store.ai_shipping_max_transit_time) {
      lines.push(`Delivery: ${store.ai_shipping_min_transit_time}-${store.ai_shipping_max_transit_time} days`);
    }
  }

  // Product shipping override (if set per product)
  if (product.ai_shipping_data) {
    const s = product.ai_shipping_data;
    lines.push(`Product Shipping: ${s.country || "DE"}, ${s.price || "free"} via ${s.service || "standard"}`);
  }

  return lines.join("\n");
}

// ─── Options Generation Prompts ───
// Sequential: one question per call. Each step receives previous answers
// so Claude can tailor the next question's options to the user's choices.

/** The 3 question steps in order */
export const QUESTION_STEPS = ["focus", "occasion", "tone"] as const;
export type QuestionStep = (typeof QUESTION_STEPS)[number];

// ─── AI Skills (editable via Settings → AI Skills tab) ───
// These defaults are used when no custom skills are configured in the
// app_settings table. Admins can override them from the settings UI.
// The prompt builders accept context/framework as params so the API
// routes can pass DB values or fall back to these defaults.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;

export const DEFAULT_CONTEXT = `<context>
You write posts and deals for selecdoo — an affiliate marketing platform.
The content is used on selecdoo.com/deals as templates for creators and influencers.
Target audience: creators, bloggers, influencers, YouTubers, and other publishers.
Goal: maximally motivate the target audience to present products and deals as
PROBLEM-SOLVERS to their community. Creators should understand the deal, copy
their affiliate link, and share it. This gives creators top briefings.
</context>`;

export const DEFAULT_FRAMEWORK = `<framework name="hormozi-copywriting">
You apply Alex Hormozi's direct-response copywriting methodology:

WRITING STYLE:
- Conversational tone (write how you talk)
- Short sentences. Short paragraphs. No fluff.
- Numbers > adjectives. Always use specific figures.
- Active voice only. Never passive.
- Use "Du" in German (informal, direct).
- NEVER use first-person "we" or "I" — write as a direct briefing.
- No hype words: BANNED words include "innovative", "cutting-edge",
  "revolutionary", "game-changing", "world-class", "best-in-class".
- Replace vague language with concrete results.
- PLAIN TEXT ONLY: No markdown formatting. No **asterisks** for bold, no
  ~~tildes~~ for strikethrough, no *asterisks* for italic, no # headings.
  For emphasis use: ALL CAPS for key words, emojis, or line breaks.
  The text must look correct when pasted directly into Instagram, Facebook,
  Telegram, or any social platform — no raw formatting characters.

HOOK-RETAIN-REWARD STRUCTURE:
- HOOK (first 1-2 sentences): Pattern interrupt. Specific outcome or bold
  statement that stops the scroll. Call out the target audience or problem.
- RETAIN (middle section): Agitate the problem. Show you understand the
  pain. Introduce the product as the unique mechanism/solution. Use
  specific features, ingredients, specs — not generalities.
- REWARD (end): Clear value proposition. Specific CTA with [LINK].
  Urgency/scarcity if genuine. Make it feel stupid to say no.

VALUE EQUATION (every product must be framed through this):
- Dream Outcome: What specific result does the buyer get?
- Perceived Likelihood: Why should they believe it works? (proof, specs, reviews)
- Time Delay: How fast do they see results?
- Effort & Sacrifice: How easy is it? What do they NOT have to do?

PROOF ELEMENTS:
- Every claim needs backing (specific numbers, timeframes, specs)
- Reference actual product data (ingredients, materials, certifications)
- Include social proof if available (review counts, ratings, awards)
- If making health/supplement claims, add disclaimer with *

DEAL FRAMING:
- All products, deals, bundles, or sets must solve a problem
- Lead with the problem, not the product
- Show the price/discount prominently — make the math obvious
- If tiered pricing or bundles exist, call out the best value
- If coupon code exists, make it unmissable
</framework>`;

/** AI Skills config shape stored in app_settings table */
export interface AISkills {
  context: string;
  framework: string;
}

/**
 * Build the workspace-scoped app_settings key for AI skills.
 * Format: "ai_skills:{workspaceId}" — each workspace has its own row.
 * This avoids schema changes to app_settings (no workspace_id column needed).
 */
export function aiSkillsKey(workspaceId: string): string {
  return `ai_skills:${workspaceId}`;
}

/**
 * Read AI skills from the app_settings table for a specific workspace.
 * Falls back to hardcoded defaults if no custom config exists.
 *
 * Workspace-scoped: each workspace can have its own prompts stored
 * under key "ai_skills:{workspaceId}". If no workspace config exists,
 * the hardcoded Hormozi defaults are used — but admins never see them
 * in the settings UI (they see empty textareas instead).
 */
export async function getAISkillsFromDB(
  supabase: AnySupabaseClient,
  workspaceId: string | null
): Promise<AISkills> {
  if (!workspaceId) return { context: DEFAULT_CONTEXT, framework: DEFAULT_FRAMEWORK };

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", aiSkillsKey(workspaceId))
      .single();

    if (data?.value) {
      const val = data.value as { context?: string; framework?: string };
      // Trim whitespace before checking — prevents whitespace-only values
      // from bypassing the default fallback and being sent to Claude as junk.
      const ctx = typeof val.context === "string" ? val.context.trim() : "";
      const fw = typeof val.framework === "string" ? val.framework.trim() : "";
      return {
        context: ctx || DEFAULT_CONTEXT,
        framework: fw || DEFAULT_FRAMEWORK,
      };
    }
  } catch (err) {
    // Supabase throws PGRST116 when no row matches .single() — expected
    // when no custom config exists. Log anything else as a real error.
    const pgErr = err as { code?: string };
    if (pgErr.code !== "PGRST116") {
      console.error(`getAISkillsFromDB: unexpected error for workspace ${workspaceId}:`, err);
    }
  }
  return { context: DEFAULT_CONTEXT, framework: DEFAULT_FRAMEWORK };
}

// Hormozi framework is intentionally NOT included here — it's only needed for the
// final content generation, not for generating question options. This keeps the
// analyze calls leaner and faster.
/** Map locale code to the language name used in the prompt */
const LOCALE_LANGUAGE: Record<string, string> = {
  en: "English",
  de: "German",
};

function buildStepSystemPrompt(locale: string, context: string): string {
  const language = LOCALE_LANGUAGE[locale] || "English";
  return `<role>You are a marketing strategist for the selecdoo affiliate platform, analyzing product data to help generate targeted deal posts and social media content.</role>

${context}

<task>
You will receive detailed product and store data, plus any answers the user has already given to previous questions. Your job is to generate contextual, product-specific OPTIONS for ONE specific question. The options must be directly relevant to THIS product and influenced by any previous answers.

Every product must solve a problem. Your question options should help identify the best problem-solution angle, the right occasion, and the right tone for the content.
</task>

<output_format>
Return ONLY valid JSON matching this exact schema:
{
  "id": "question_id",
  "question": "The question text",
  "options": ["Option 1", "Option 2", "Option 3"]
}
</output_format>

<rules>
- Generate 3-5 options
- Options must be specific to this product (reference actual ingredients, features, promotions, use cases)
- If the user already answered earlier questions, tailor options to build on those answers
- Write questions and options in ${language}
- Do NOT include generic filler options
- Frame options around PROBLEMS the product solves (Hormozi approach)
</rules>`;
}

/**
 * Build the system prompt for question option generation.
 * @param locale - User's locale ("en" or "de"). Questions and options
 *   will be written in the user's language so the UI feels native.
 */
export function buildOptionsSystemPrompt(locale: string = "en", context: string = DEFAULT_CONTEXT): string {
  return buildStepSystemPrompt(locale, context);
}

export function buildOptionsUserPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: Record<string, any>,
  contentType: string,
  step: QuestionStep,
  previousAnswers: QuestionAnswer[],
  /** Scraped markdown from the client's own website (e.g. selecdoo.com).
   *  Provides brand voice and content style context. Scraped once on step 1,
   *  passed through from frontend state on subsequent steps. */
  clientWebsiteContent?: string | null,
  /** User's locale — used to write tone option examples in the correct language */
  locale: string = "en"
): string {
  const productData = formatProductData(product, store);
  const typeContext = contentType === "deal_post"
    ? "a deal post (focused on discounts, urgency, value proposition)"
    : "a social media post (focused on engagement, sharing, lifestyle)";

  // Format previous answers for context
  let previousContext = "";
  if (previousAnswers.length > 0) {
    const lines = previousAnswers.map((a) => {
      const labels: Record<string, string> = {
        focus: "Main focus/angle",
        occasion: "Occasion/context",
        tone: "Tone & urgency",
      };
      return `- ${labels[a.id] || a.id}: ${a.answer}`;
    }).join("\n");
    previousContext = `\n## User's Previous Answers\n${lines}\n\nUse these answers to tailor the options below — they should build on the user's choices.\n`;
  }

  // Step-specific instructions
  const stepInstructions: Record<QuestionStep, string> = {
    focus: `Generate options for the **focus** question — "What should be the main focus or angle?"
→ Generate options based on the product's actual features, benefits, ingredients, or use cases found in the data above.
→ Return with id: "focus"`,

    occasion: `Generate options for the **occasion** question — "What occasion or context should the content target?"
→ Generate options based on current promotions, seasonal relevance, or typical use scenarios for this product.
→ The user already chose a focus — tailor the occasion options to complement that choice.
→ Return with id: "occasion"`,

    tone: locale === "de"
      ? `Generiere Optionen für die **Ton**-Frage — "Wie soll der Ton und die Dringlichkeit wirken?"
→ Diese 3 Standard-Optionen immer einschließen: "Subtil & Informativ", "Ausgewogen — freundlich mit einem Anstoß", "Volle Dringlichkeit — maximaler Handlungsdruck"
→ Füge 1-2 produktspezifische Ton-Optionen hinzu, die zum gewählten Fokus und Anlass passen.
→ Return with id: "tone"`
      : `Generate options for the **tone** question — "How should the tone and urgency feel?"
→ Always include these 3 standard options: "Subtle & Informative", "Balanced — friendly with a nudge", "Full FOMO — maximum urgency"
→ Add 1-2 product-specific tone options that fit the user's chosen focus and occasion.
→ Return with id: "tone"`,
  };

  // Client website content — gives Claude context about the brand's voice,
  // deal formatting style, and content patterns to match.
  const websiteSection = clientWebsiteContent
    ? `\n## Client Website Content (match this brand's voice and style)\n${clientWebsiteContent.slice(0, 3000)}\n`
    : "";

  return `Analyze this product and generate contextual options for a content creator who wants to write ${typeContext}.

${productData}
${websiteSection}
${previousContext}
${stepInstructions[step]}`;
}

// ─── Content Generation Prompts ───

function buildDealPostSystemPrompt(context: string, framework: string): string {
  return `<role>You are an expert direct-response copywriter for the selecdoo affiliate platform, specializing in deal posts that creators and influencers will share with their communities.</role>

${context}

${framework}

<task>
Generate a complete DEAL POST in both German (primary) and English.
This content will be used as a template on selecdoo.com/deals — creators
copy the text, add their affiliate link, and share it with their audience.
The post must make the creator feel confident sharing it because the deal
is positioned as a genuine problem-solver for their community.
</task>

<deal_post_rules>
LANGUAGE:
- German is the PRIMARY language. Write the German version first, then English.
- English is NOT a literal translation — adapt the tone for English-speaking audiences.
- German: Use "Du", conversational, direct. English: natural, engaging.

STRUCTURE (follow this order):
1. HEADLINE: Bold, attention-grabbing. Include the promotion name or deal if one exists. Add urgency.
2. SUBHEADLINE: One line that frames the transformation (from problem → to solution).
3. STORYTELLING HOOK (2-3 paragraphs): Paint a vivid, relatable scenario the reader FEELS.
   Describe the problem in everyday language. Make them nod and think "that's me."
   Do NOT mention the product yet — build the emotional tension first.
4. PRODUCT INTRODUCTION: Now introduce the product as the solution. Name the brand.
   Explain WHY it works (the mechanism — specific ingredients, technology, materials).
5. FEATURE BREAKDOWN: List 5-8 specific features/ingredients with emoji bullets.
   Each bullet = one concrete benefit. Use specific numbers, percentages, certifications.
6. PRICING & DEAL: Show the math. Original price → deal price → savings.
   If tiered pricing or bundles exist, break down EACH tier on its own line with emoji.
   Make the best-value option obvious.
7. SOCIAL PROOF: Reviews, ratings, retail presence, awards — whatever is in the data.
   Use specific numbers ("12.000+ Bewertungen", "erhältlich bei DM, Rossmann, Müller").
8. FOMO CLOSING: Hard closing line that creates urgency. The user's tone selection
   determines how aggressive: "Subtle" = gentle reminder, "Balanced" = friendly nudge
   with deadline, "Full FOMO" = aggressive scarcity ("Wer jetzt nicht zugreift, zahlt
   morgen wieder den vollen Preis. So einfach ist das.")
9. CTA: Clear call-to-action with [LINK] placeholder.
10. DISCLAIMER: If health/supplement claims, add legal disclaimer with * at the bottom.

FORMATTING:
- Use emojis purposefully (🔥 for deals, ✅ for features, 🚨 for urgency, 👉 for CTA).
- Content must be plain text suitable for direct posting (not HTML).
- Use ALL CAPS or emojis for emphasis on key prices and savings. NO markdown.
- Write as MUCH as the product deserves — do not cut short. Aim for 300-500 words per language.
- If a coupon code exists, make it unmissable.

TONE:
- NEVER use banned words: innovative, cutting-edge, revolutionary, game-changing, world-class.
- Be specific, not vague. Numbers > adjectives. Always.
- The tone selection from the user's questionnaire MUST be respected — if they chose
  "Full FOMO", write with maximum urgency and scarcity. Do not play it safe.
</deal_post_rules>

<output_format>
Return ONLY valid JSON:
{
  "content_de": "German deal post text here...",
  "content_en": "English deal post text here..."
}
</output_format>`;
}

function buildSocialPostSystemPrompt(context: string, framework: string): string {
  return `<role>You are an expert social media copywriter for the selecdoo affiliate platform, creating engaging posts that creators and influencers will share with their communities.</role>

${context}

${framework}

<task>
Generate a SOCIAL MEDIA POST in both German (primary) and English.
This content will be used as a template on selecdoo.com/deals — creators
copy the text, add their affiliate link, and share it on their social channels.
Social posts should feel native to feeds, not like ads. They should make the
creator want to share because it makes THEM look good to their audience.
</task>

<social_post_rules>
LANGUAGE:
- German is the PRIMARY language. Write the German version first, then English.
- English is NOT a literal translation — adapt for English-speaking audiences.
- German: Use "Du", relatable, like talking to a friend. English: same energy.

STRUCTURE:
1. HOOK (first 1-2 sentences): Stop the scroll. Use a question, bold claim, or
   a "Kennst du das?" relatable scenario. This is the most important part.
2. STORY/PROBLEM (1-2 paragraphs): Tell a short, vivid story that connects to
   the reader's life. Paint the frustration or desire. Make them feel it.
3. PRODUCT AS SOLUTION (1 paragraph): Introduce the product naturally — as if
   you're recommending it to a friend, not selling it. Mention 2-3 key features.
4. SOFT CTA: Gentle nudge with [LINK] placeholder. Not pushy.
   If there's a discount, weave it in here naturally.

FORMATTING:
- Include relevant emojis (native to social media style, not forced).
- Content must be plain text suitable for direct posting (not HTML).
- Aim for 150-300 words per language. Longer than a tweet, shorter than a deal post.
- Make it shareable — something a creator would proudly post as their own recommendation.

TONE:
- Story > pitch. But the pitch is always there, woven into the narrative.
- Mention the brand naturally — as if you genuinely use and love the product.
- NEVER use banned words: innovative, cutting-edge, revolutionary, game-changing.
- The user's tone selection matters: "Subtle" = pure story with soft mention,
  "Balanced" = story + clear recommendation, "Full FOMO" = story + urgency + deal highlight.
- Read like an influencer's authentic post, not a brand's ad copy.
</social_post_rules>

<output_format>
Return ONLY valid JSON:
{
  "content_de": "German social post text here...",
  "content_en": "English social post text here..."
}
</output_format>`;
}

export function buildGenerateSystemPrompt(
  contentType: string,
  context: string = DEFAULT_CONTEXT,
  framework: string = DEFAULT_FRAMEWORK
): string {
  return contentType === "deal_post"
    ? buildDealPostSystemPrompt(context, framework)
    : buildSocialPostSystemPrompt(context, framework);
}

export function buildGenerateUserPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: Record<string, any>,
  contentType: string,
  answers: QuestionAnswer[],
  /** Scraped markdown from the client's own website. Helps Claude match
   *  the brand's voice, tone, and deal formatting style. */
  clientWebsiteContent?: string | null
): string {
  const productData = formatProductData(product, store);
  const typeLabel = contentType === "deal_post" ? "deal post" : "social media post";

  // Format user's answers
  const answerLines = answers.map((a) => {
    const labels: Record<string, string> = {
      focus: "Main focus/angle",
      occasion: "Occasion/context",
      tone: "Tone & urgency",
    };
    return `- ${labels[a.id] || a.id}: ${a.answer}`;
  }).join("\n");

  const websiteSection = clientWebsiteContent
    ? `\n## Client Website Content (match this brand's voice and style)\n${clientWebsiteContent.slice(0, 3000)}\n`
    : "";

  return `Generate a ${typeLabel} for this product based on the data and the user's preferences below.

${productData}
${websiteSection}
## User's Content Preferences
${answerLines}

${product.affiliate_link ? `Affiliate Link: ${product.affiliate_link}` : "Use [LINK] as placeholder for the affiliate link."}
${store.coupon_code ? `Coupon Code: ${store.coupon_code}` : ""}

Generate the content now. Remember: German first (primary), then English. Return as JSON with content_de and content_en.`;
}
