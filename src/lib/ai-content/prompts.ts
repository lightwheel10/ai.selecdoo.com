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

const STEP_SYSTEM_PROMPT = `You are a marketing strategist analyzing product data to help a content creator generate targeted deal posts and social media content.

You will receive detailed product and store data, plus any answers the user has already given to previous questions. Your job is to generate contextual, product-specific OPTIONS for ONE specific question. The options must be directly relevant to THIS product and influenced by any previous answers.

Return ONLY valid JSON matching this exact schema:
{
  "id": "question_id",
  "question": "The question text",
  "options": ["Option 1", "Option 2", "Option 3"]
}

Rules:
- Generate 3-5 options
- Options must be specific to this product (reference actual ingredients, features, promotions, use cases)
- If the user already answered earlier questions, tailor options to build on those answers
- Write questions and options in English
- Do NOT include generic filler options`;

export function buildOptionsSystemPrompt(): string {
  return STEP_SYSTEM_PROMPT;
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
  clientWebsiteContent?: string | null
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

    tone: `Generate options for the **tone** question — "How should the tone and urgency feel?"
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

function buildDealPostSystemPrompt(): string {
  return `You are an expert direct-response copywriter specializing in deal posts and promotional content. You write in the style of Alex Hormozi's "Grand Slam Offer" framework — leading with value, creating urgency, and making the offer irresistible.

Your job is to generate a complete deal post in both German (primary) and English based on product data and the user's content preferences.

Rules:
- German is the PRIMARY language. Write the German version first, then English.
- German: Use "Du" (informal), conversational, punchy. Write for a German-speaking audience.
- English: Natural, engaging. Not a literal translation — adapt the tone for an English-speaking audience.
- Include the discount/price prominently if available
- Include relevant emojis (but not excessive)
- Mention the brand and store name naturally
- Include a call-to-action with "[LINK]" placeholder for the affiliate link
- If there's a coupon code, include it prominently
- Reference specific product features (ingredients, materials, specifications) from the data
- If there are tiered prices or bundles, call them out
- Add a legal disclaimer line at the bottom if health/supplement claims are made (with *)
- Content should be plain text suitable for direct posting (not HTML)
- Keep it concise but compelling — aim for 200-400 words per language

Return ONLY valid JSON:
{
  "content_de": "German deal post text here...",
  "content_en": "English deal post text here..."
}`;
}

function buildSocialPostSystemPrompt(): string {
  return `You are an expert social media copywriter who creates engaging, shareable content. You blend storytelling with product promotion — making posts that feel native to social feeds rather than ads.

Your job is to generate a social media post in both German (primary) and English based on product data and the user's content preferences.

Rules:
- German is the PRIMARY language. Write the German version first, then English.
- German: Use "Du" (informal), conversational, relatable. Write for a German-speaking audience.
- English: Natural, engaging. Not a literal translation — adapt for English-speaking audience.
- Lead with a hook (question, bold statement, or relatable scenario)
- Keep it shorter than a deal post — aim for 100-250 words per language
- Include relevant emojis (common for social posts)
- Include a soft call-to-action with "[LINK]" placeholder
- Mention the brand naturally (not salesy)
- If there's a discount, weave it in without making it the entire focus
- Content should be plain text suitable for direct posting (not HTML)
- Make it shareable — something people would want to repost

Return ONLY valid JSON:
{
  "content_de": "German social post text here...",
  "content_en": "English social post text here..."
}`;
}

export function buildGenerateSystemPrompt(contentType: string): string {
  return contentType === "deal_post"
    ? buildDealPostSystemPrompt()
    : buildSocialPostSystemPrompt();
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
