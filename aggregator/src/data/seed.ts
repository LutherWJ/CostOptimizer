import { db } from "../repositories/connection";

const main = async () => {
  const source = new URL("./seed.csv", import.meta.url).pathname;
  const csv = await Bun.file(source).text();

  const lines = csv.split("\n");
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const fields = line.split(",").map((val) => val.trim());
    data.push(fields);
  }

  for (const row of data) {
    await insertRow(row);
  }

  console.log("Seeding complete.");
  process.exit(0);
};

const insertRow = async (row: string[]) => {
  try {
    const productId = await insertProductLine(row[0]!, row[1]!);
    await insertSKU(productId, row);
    console.log(`Successfully inserted SKU: ${row[2]}`);
  } catch (err) {
    console.error(`Error inserting row ${row[2]}:`, err);
  }
};

const insertProductLine = async (
  manufacturer: string,
  productLine: string,
): Promise<string> => {
  const result = await db`
    INSERT INTO product_lines (manufacturer, line_name)
    VALUES (${manufacturer}, ${productLine})
    ON CONFLICT (manufacturer, line_name) 
    DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    RETURNING id;
  `.execute();

  return result[0].id;
};

const insertSKU = async (productId: string, row: string[]) => {
  const skuNumber = row[2];

  const hardwareSpecs = {
    cpu_family: row[3],
    ram_gb: parseInt(row[4]!, 10),
    storage_gb: parseInt(row[5]!, 10),
    gpu_model: row[6],
    gpu_vram_gb: parseInt(row[7]!, 10),
    display_resolution: row[8],
    color_gamut_coverage: row[9],
    battery_wh: parseFloat(row[10]!),
    weight_lbs: parseFloat(row[11]!),
    is_upgradable: row[12] === "true",
  };

  await db`
    INSERT INTO laptop_skus (product_line_id, sku_number, hardware_specs)
    VALUES (
      ${productId}, 
      ${skuNumber}, 
      ${JSON.stringify(hardwareSpecs)}::jsonb
    )
    ON CONFLICT (sku_number) 
    DO UPDATE SET 
      hardware_specs = EXCLUDED.hardware_specs
    RETURNING id;
  `.execute();
};

main();
