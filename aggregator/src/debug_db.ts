import { db } from "./repositories/connection";

async function debug() {
  try {
    console.log("--- Table Existence Check ---");
    const tables = await db`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `;
    console.log("Tables found:", tables.map((t: any) => t.tablename));

    const checkTable = async (name: string) => {
      console.log(`\n--- Checking Table: ${name} ---`);
      try {
        const columns = await db`
          SELECT column_name, data_type, column_default
          FROM information_schema.columns
          WHERE table_name = ${name};
        `;
        console.table(columns);
        
        const indexes = await db`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = ${name};
        `;
        console.log("Indexes found:");
        console.table(indexes);

        const count = await db`SELECT COUNT(*) FROM ${db.unsafe(name)}`;
        console.log(`Row count: ${count[0].count}`);
      } catch (e: any) {
        console.error(`Error checking ${name}:`, e.message);
      }
    };

    await checkTable("product_lines");
    await checkTable("laptop_skus");
    await checkTable("component_benchmarks");

    console.log("\n--- Testing ON CONFLICT Insert ---");
    try {
      const upsertResult = await db`
        INSERT INTO product_lines (manufacturer, line_name)
        VALUES ('DEBUG_TEST', 'DEBUG_LINE')
        ON CONFLICT (manufacturer, line_name)
        DO UPDATE SET updated_at = CURRENT_TIMESTAMP
        RETURNING id;
      `;
      console.log("Upsert result:", JSON.stringify(upsertResult));
      if (upsertResult.length > 0) {
        console.log("Success! ID returned:", upsertResult[0].id);
      } else {
        console.log("FAILURE: Upsert returned an empty array [].");
      }
    } catch (e: any) {
      console.error("Upsert failed with error:", e.message);
    }

  } catch (err: any) {
    console.error("Debug failed:", err.message);
  } finally {
    process.exit(0);
  }
}

debug();
