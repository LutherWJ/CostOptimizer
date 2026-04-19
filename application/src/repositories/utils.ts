/**
 * Shared repository utilities for database result normalization and ID extraction.
 */

/**
 * Extracts a UUID string from a query result row, handling various casing 
 * and ensuring the row exists.
 */
export function extractId(result: any[], context: string): string {
  if (!result || result.length === 0) {
    console.error(`Query failed for ${context}. Result:`, JSON.stringify(result));
    throw new Error(`Query failed for ${context}: No rows returned`);
  }

  const row = result[0] as any;
  const id = row.id || row.ID || row.uuid || row.UUID;
  
  if (!id) {
    console.error(`Query returned a row but no ID column was found. Keys: ${Object.keys(row).join(", ")}`);
    throw new Error(`Query failed for ${context}: ID column missing in response`);
  }

  return id as string;
}

/**
 * Gracefully parses JSONB strings into objects for specified fields.
 */
export function normalizeRow<T>(row: any, jsonbFields: string[]): T {
  if (!row) return row;
  
  const normalized = { ...row };
  
  for (const field of jsonbFields) {
    if (typeof normalized[field] === "string" && normalized[field] !== null) {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch (e) {
        // Leave as is if it fails to parse
      }
    }
  }
  
  return normalized as T;
}
