import { db } from "./connection";
import { readFileSync } from "fs";
import { join } from "path";

const applySchema = async () => {
  const schemaPath = join(import.meta.dir, "../../../postgres/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  
  console.log("Applying database schema...");
  
  const cleanSchema = schema
    .replace(/\/\*[\s\S]*?\*\/|--.*$/gm, "") 
    .trim();

  const statements = cleanSchema
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      // In bun:sql, if you have a raw string, you can use db.unsafe(string)
      // but if that is missing, the standard template literal is the way.
      // We will try db`statement` but using the actual variable as a raw string is tricky.
      // The most reliable way for dynamic raw SQL in Bun's SQL is db.unsafe(statement)
      if ((db as any).unsafe) {
         await (db as any).unsafe(statement).execute();
      } else {
         // Fallback to the trick that usually works
         await (db as any)([statement]);
      }
      console.log(`Executed: ${statement.substring(0, 50).replace(/\n/g, " ")}...`);
    } catch (err: any) {
      if (err.message.includes("already exists") || err.message.includes("already a relation")) {
      } else {
        console.error(`Error executing: ${statement.substring(0, 50)}`, err.message);
      }
    }
  }
  
  console.log("Migration finished.");
  process.exit(0);
};

applySchema();
