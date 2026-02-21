// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = import("@supabase/supabase-js").SupabaseClient<any, any, any>;
import * as Sentry from "@sentry/nextjs";
import type { MappedProduct } from "./product-mappers";

export interface ChangeSummary {
  newCount: number;
  updatedCount: number;
  removedCount: number;
  totalChanges: number;
}

interface ChangeRecord {
  product_id: string;
  store_id: string;
  change_type: "new" | "updated" | "removed";
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  product_title: string;
  product_image: string | null;
}

interface ExistingProduct {
  hash_id: string;
  price: number;
  in_stock: boolean;
  discount_percentage: number | null;
  original_price: number | null;
  title: string;
  image_url: string | null;
}

const TRACKED_FIELDS: (keyof ExistingProduct)[] = [
  "price",
  "in_stock",
  "discount_percentage",
  "original_price",
];

/**
 * Detects product changes by comparing new scraped data against existing DB records.
 * Also handles marking removed products (absorbs the old inline logic).
 *
 * Must be called BEFORE upserting new products — once upserted, old values are gone.
 */
export async function detectAndLogChanges(
  supabase: AnySupabaseClient,
  storeId: string,
  newProducts: MappedProduct[]
): Promise<ChangeSummary> {
  // Fetch existing active products for this store
  const { data: existingRows } = await supabase
    .from("products")
    .select("hash_id, price, in_stock, discount_percentage, original_price, title, image_url")
    .eq("store_id", storeId)
    .eq("status", "active")
    .is("deleted_at", null);

  const existing = (existingRows ?? []) as ExistingProduct[];

  // First scrape — no existing products, nothing to compare
  if (existing.length === 0) {
    return { newCount: 0, updatedCount: 0, removedCount: 0, totalChanges: 0 };
  }

  const existingMap = new Map<string, ExistingProduct>();
  for (const p of existing) {
    existingMap.set(p.hash_id, p);
  }

  const changes: ChangeRecord[] = [];
  const newHashIds = new Set<string>();

  // Compare each new product against existing
  for (const product of newProducts) {
    newHashIds.add(product.hash_id);
    const old = existingMap.get(product.hash_id);

    if (!old) {
      // New product — not seen before
      changes.push({
        product_id: product.hash_id,
        store_id: storeId,
        change_type: "new",
        field_changed: null,
        old_value: null,
        new_value: null,
        product_title: product.title,
        product_image: product.image_url,
      });
      continue;
    }

    // Existing product — compare tracked fields
    for (const field of TRACKED_FIELDS) {
      const oldVal = old[field];
      const newVal = product[field as keyof MappedProduct];

      // Normalize for comparison (null vs undefined, number precision)
      const oldStr = oldVal == null ? null : String(oldVal);
      const newStr = newVal == null ? null : String(newVal);

      if (oldStr !== newStr) {
        changes.push({
          product_id: product.hash_id,
          store_id: storeId,
          change_type: "updated",
          field_changed: field,
          old_value: oldStr,
          new_value: newStr,
          product_title: product.title,
          product_image: product.image_url,
        });
      }
    }
  }

  // Detect removed products (in DB but not in this scrape)
  const removedProducts = existing.filter((p) => !newHashIds.has(p.hash_id));
  for (const removed of removedProducts) {
    changes.push({
      product_id: removed.hash_id,
      store_id: storeId,
      change_type: "removed",
      field_changed: null,
      old_value: null,
      new_value: null,
      product_title: removed.title,
      product_image: removed.image_url,
    });
  }

  // Mark removed products in the products table
  if (removedProducts.length > 0) {
    const removedHashIds = removedProducts.map((p) => p.hash_id);
    await supabase
      .from("products")
      .update({ status: "removed", updated_at: new Date().toISOString() })
      .eq("store_id", storeId)
      .in("hash_id", removedHashIds);
  }

  // Batch-insert change records (batches of 100)
  if (changes.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < changes.length; i += batchSize) {
      const batch = changes.slice(i, i + batchSize);
      const { error } = await supabase.from("product_changes").insert(batch);
      if (error) {
        console.error("Failed to insert product_changes batch:", error.message);
        Sentry.captureException(new Error(error.message), { tags: { query: "insertProductChanges" }, extra: { storeId, batchIndex: i, batchSize: batch.length } });
      }
    }
  }

  // Count by type
  const newCount = changes.filter((c) => c.change_type === "new").length;
  const removedCount = removedProducts.length;
  // updatedCount = unique products that had field changes (not count of individual field changes)
  const updatedProductIds = new Set(
    changes.filter((c) => c.change_type === "updated").map((c) => c.product_id)
  );
  const updatedCount = updatedProductIds.size;

  return {
    newCount,
    updatedCount,
    removedCount,
    totalChanges: changes.length,
  };
}
