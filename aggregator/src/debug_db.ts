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
        
        const count = await db`SELECT COUNT(*) FROM ${db.unsafe(name)}`;
        console.log(`Row count: ${count[0].count}`);
      } catch (e: any) {
        console.error(`Error checking ${name}:`, e.message);
      }
    };

    await checkTable("product_lines");
    await checkTable("laptop_skus");
    await checkTable("component_benchmarks");

    console.log("\n--- Testing Raw Insert ---");
    try {
      const testInsert = await db`
        INSERT INTO product_lines (manufacturer, line_name)
        VALUES ('DEBUG_TEST', 'DEBUG_LINE')
        RETURNING *;
      `;
      console.log("Insert result:", JSON.stringify(testInsert));
    } catch (e: any) {
      console.error("Insert failed:", e.message);
    }

  } catch (err: any) {
    console.error("Debug failed:", err.message);
  } finally {
    process.exit(0);
  }
}

debug();
