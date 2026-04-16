import { db } from "./repositories/connection";

async function probe() {
  try {
    console.log("--- Reseller Data Probe ---");
    
    // Look at a few Flex IT laptops
    const samples = await db`
      SELECT pl.manufacturer, ls.sku_number, ls.hardware_specs->>'cpu_family' as cpu
      FROM laptop_skus ls
      JOIN product_lines pl ON ls.product_line_id = pl.id
      WHERE pl.manufacturer ILIKE '%Flex IT%' OR pl.manufacturer ILIKE '%upcycle%'
      LIMIT 10;
    `;
    
    console.log("Samples of Reseller Laptops:");
    console.table(samples);

  } catch (err: any) {
    console.error("Probe failed:", err.message);
  } finally {
    process.exit(0);
  }
}

probe();
