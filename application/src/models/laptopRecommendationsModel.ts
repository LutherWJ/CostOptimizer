import { db } from "../../../aggregator/src/repositories/connection";

export async function getRecommendations() {
  try {
    // We are querying the Materialized View you showed me earlier
    const result = await db`
      SELECT * FROM laptop_recommendations 
      ORDER BY value_score DESC 
      LIMIT 10
    `;
    
    // If the list is empty, it might mean the tables have no data yet
    if (result.length === 0) {
      console.warn("⚠️ Connected to DB, but 'laptop_recommendations' view is empty.");
    }

    return result;
  } catch (error) {
    // This will catch "Table not found" or "Connection refused"
    console.error("❌ Database Error:", (error as Error).message);
    throw error; 
  }
}