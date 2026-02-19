// ─── Types ───

export interface CleanProductInput {
  title: string;
  description: string | null;
  brand: string | null;
  price: number;
  sale_price: number | null;
  discount: number | null;
  currency: string;
  availability: string;
  condition: string | null;
  product_url: string | null;
  store_name: string;
  shop_system: string;
  shipping_policy: string;
}

export interface CleanProductShipping {
  country: string;
  price: string;
  service: string;
  available_countries: string;
  min_handling_time: number;
  max_handling_time: number;
  min_transit_time: number;
  max_transit_time: number;
}

export interface CleanProductResult {
  cleaned_title: string;
  description: string;
  description_english: string;
  shipping: CleanProductShipping;
  category: string;
}

export interface CategorizeResult {
  category: string;
}

export interface StoreCleanResult {
  cleaned_name: string;
  shipping: CleanProductShipping;
  description_en: string | null;
  description_de: string | null;
}

// ─── Categories ───

const CATEGORIES = [
  "Electronics",
  "Home & Garden",
  "Beauty",
  "Fashion",
  "Sport",
  "Children",
  "Groceries",
  "Shoes",
  "Smartphone",
  "Tablet",
  "Notebook",
  "Television set",
  "Gaming",
  "Travel",
  "Hotel",
  "Wellness",
] as const;

// ─── System Prompts ───

export const SYSTEM_PROMPT_CLEAN =
  "You return only valid JSON for admin data cleaning and SEO content generation.";

export const SYSTEM_PROMPT_CATEGORIZE = `You are a product categorization specialist.
Given product information, assign the most appropriate category from the list below.

CATEGORIES:
${CATEGORIES.join(", ")}

Respond with ONLY valid JSON (no markdown fences):
{
  "category": "..."
}`;

export const SYSTEM_PROMPT_STORE =
  "You return only valid JSON for store data cleaning and shipping extraction.";

// ─── User Prompt Builders ───

export function buildCleanUserPrompt(product: CleanProductInput): string {
  const hasDescription = !!(product.description && product.description.trim());
  const strategy = hasDescription ? "enhance_existing" : "generate_from_data";
  const storeName = product.store_name;

  return `You are an expert e-commerce SEO content generator creating conversion-optimized product listings for buyers. Generate complete product data with buyer-focused, human-written content.

CRITICAL: This is PRODUCT description for SHOPPERS to BUY, not affiliate program recruitment. Focus on product benefits, not earning opportunities.

## OUTPUT STRUCTURE (Valid JSON only):
{
  "cleaned_title": "Clear, concise product name without marketing fluff",
  "description": "<h3>Product Name</h3><p>SEO & AEO-optimized German description with HTML</p>",
  "description_english": "<h3>Product Name</h3><p>SEO & AEO-optimized English description with HTML</p>",
  "shipping": {
    "country": "DE",
    "price": "4.95",
    "service": "DHL Standard",
    "available_countries": "DE, UK, AT",
    "min_handling_time": 1,
    "max_handling_time": 3,
    "min_transit_time": 2,
    "max_transit_time": 5
  },
  "category": "Health & Beauty"
}

## DESCRIPTION GENERATION RULES

Strategy: ${strategy}

### German Description (description):
*Target Audience*: German-speaking online shoppers actively looking for deals
*Tone*: Direct "Du" address, conversational, trustworthy, and human
*Primary Keyword*: "${storeName} Deal" (must appear naturally 1-2 times)

*Content Requirements*:
- Start with <h3> containing product name
- Write in flowing, natural German (no stiff marketing language)
- Address reader directly with "Du" (e.g., "Du erhaeltst", "Sichere Dir")
- Highlight concrete benefits and product features
- Include price advantage and discount prominently if available
- Mention brand credibility and quality indicators
- Create urgency without being pushy (e.g., "Nur solange Vorrat reicht")
- NEVER mention affiliate programs, commissions, publishers, or earning opportunities
- Focus on what the BUYER gets, not what affiliates earn

*SEO/AEO Optimization*:
- Integrate "${storeName} Deal" keyword naturally (e.g., "Dieser ${storeName} Deal bietet Dir...")
- Structure content to answer common buyer questions
- Use semantic HTML: <h3>, <p>, <strong>, <ul><li>
- Optimize for voice search and featured snippets
- Include long-tail keywords naturally

*HTML Structure Example*:
<h3>Product Name</h3>
<p>Opening paragraph with main benefit and "${storeName} Deal" keyword naturally integrated.</p>
<p>Key features with <strong>important selling points</strong> highlighted.</p>
<ul>
  <li>Concrete feature or benefit</li>
  <li>Another key advantage</li>
</ul>
<p>Closing with call-to-action or reassurance.</p>

### English Description (description_english):
*Target Audience*: International online shoppers looking for deals
*Tone*: Direct "you" address, friendly, professional, and natural
*Primary Keyword*: "${storeName} Deal" (must appear naturally 1-2 times)

*Content Requirements*:
- ${hasDescription ? "Translate and enhance the German description" : "Create from product data"}
- Start with <h3> containing product name
- Write in flowing, conversational English (American/International style)
- Address reader directly with "you" (e.g., "You get", "Grab your")
- Maintain same structure and key points as German version
- Adapt cultural nuances for international audience
- NEVER mention affiliate programs, commissions, or publisher opportunities
- Focus on buyer benefits and product value

*SEO/AEO Optimization*:
- Same principles as German (keyword integration, voice search, etc.)
- Use natural English phrasing and idioms
- Optimize for international search behavior

## CONTENT QUALITY GUIDELINES

*Writing Style*:
- Natural, flowing sentences (like a friend recommending a product)
- Active voice and direct address ("Du sparst" not "Es wird gespart")
- Conversational but credible
- Scannable with clear structure
- Focus on product features and buyer benefits
- NO stiff corporate language
- NO generic marketing phrases ("innovative solution", "game-changer")
- NO excessive exclamation marks
- NO affiliate program language ("earn commissions", "your community")
- NEVER include <!DOCTYPE>, <html>, <head>, or <body> tags

*Conversion Elements*:
- Lead with strongest benefit
- Quantify advantages (e.g., "Spare 30%", "48h Lieferung")
- Build trust (brand mentions, quality indicators)
- Create subtle urgency when applicable
- End with confidence-building statement or soft CTA
- Focus on buyer's gain, not affiliate earning potential

*HTML Best Practices*:
- Use semantic tags for structure
- <strong> for key selling points (max 2-3 per description)
- <ul><li> for 3+ features/benefits
- Keep paragraphs short (2-4 sentences)
- Return HTML fragments ONLY (no wrapper tags)

## OTHER FIELD RULES

*cleaned_title*:
- Remove marketing fluff ("Amazing", "Premium", "Best")
- Keep brand + core product identifier
- Max 70 characters (flexible for long product names)
- Example: "Nike Air Max 90 Sneaker Weiss" not "PREMIUM Nike Air Max 90 - BEST DEAL EVER!"

*shipping*:
- Extract from shipping policy if available
- Parse location-specific data accurately
- Price format: number only (e.g., "4.95" not "4,95 EUR")
- If missing: Use German defaults (DE, 4.99, Standard, 1-3 handling, 3-5 transit)

*category*:
Assign the product to ONE of these categories: ${CATEGORIES.join(", ")}.

DECISION LOGIC:
1. Analyze title, description, brand, and price data
2. Match to the MOST SPECIFIC category from the list above
3. Return ONLY the category name from the approved list
4. If uncertain, choose the closest match
5. NEVER return a category not in the list above
6. Focus on what the product actually IS, not affiliate potential

## AVAILABLE PRODUCT DATA

- Title: ${product.title}
- Existing Description: ${product.description?.trim() || "No description available - generate from other data"}
- Brand: ${product.brand || "Unknown"}
- Price: ${product.price} ${product.currency}
- Sale Price: ${product.sale_price ?? "N/A"}
- Discount: ${product.discount ?? 0}%
- Availability: ${product.availability}
- Condition: ${product.condition || "new"}
- Platform: ${product.shop_system || "Unknown"}
- Store: ${storeName}

Store Shipping Policy:
${product.shipping_policy || "No shipping policy available"}

NOW GENERATE THE COMPLETE JSON OUTPUT FOLLOWING ALL RULES ABOVE.`;
}

export function buildCategorizeUserPrompt(
  product: Pick<CleanProductInput, "title" | "brand" | "price" | "currency" | "description">
): string {
  const parts = [
    `Title: ${product.title}`,
    product.brand ? `Brand: ${product.brand}` : null,
    `Price: ${product.price} ${product.currency}`,
    product.description
      ? `Description:\n${product.description.slice(0, 500)}`
      : null,
  ];

  return parts.filter(Boolean).join("\n");
}

export function buildStoreUserPrompt(
  name: string,
  url: string,
  platform: string,
  shippingCorpus: string,
  descriptionCorpus: string | null,
  needsDescription: boolean
): string {
  const descriptionBlock = needsDescription && descriptionCorpus
    ? `

## STORE DESCRIPTION GENERATION

Using the about/homepage content below, generate two short store descriptions:
- "description_en": 2-4 sentences in English
- "description_de": 2-4 sentences in German

Rules:
- Plain text only (no HTML)
- Factual store identity: what they sell, their story/origin, unique selling points
- No marketing fluff, no affiliate language, no superlatives
- If the content is insufficient to write a meaningful description, return null for both

About / Homepage Content:
${descriptionCorpus}`
    : `

## STORE DESCRIPTIONS
Return "description_en": null and "description_de": null (no descriptions needed).`;

  return `You are an e-commerce data cleaner for an admin panel. Derive store-level default shipping, clean the store name, and optionally generate store descriptions.

Return ONLY valid JSON with this structure:
{
  "cleaned_name": "Clean Store Name",
  "shipping": {
    "country": "DE",
    "price": "4.95",
    "service": "DHL Standard",
    "available_countries": "DE, UK, AT",
    "min_handling_time": 1,
    "max_handling_time": 3,
    "min_transit_time": 2,
    "max_transit_time": 5
  },
  "description_en": "Short English store description or null",
  "description_de": "Short German store description or null"
}

Rules:
- Clean the store name and return it in "cleaned_name":
  - Remove TLDs/domains/URL fragments (e.g., .com, .de, www., http...)
  - Remove generic words like "Official", "Store", "Shop", "Online"
  - Replace hyphens/underscores/dots with spaces; collapse multiple spaces
  - Title Case the final name; only the core brand/store name
- For shipping: Analyze the policy and list ALL countries where shipping is available in "available_countries".
- Mention all destinations.
- Extract what is explicitly present in the policy text for shipping.
- If handling time is not mentioned, default to min_handling_time: 0, max_handling_time: 1.
- If transit time is not mentioned, default to min_transit_time: 2, max_transit_time: 5.
- If shipping price is not mentioned, default to "0" (free).
- If service/carrier is not mentioned, default to "Standard".
- Price is numeric string without currency.
${descriptionBlock}

Store Raw Name: ${name}
Store URL: ${url}
Platform: ${platform}
Shipping Policy Corpus:
${shippingCorpus}`;
}
