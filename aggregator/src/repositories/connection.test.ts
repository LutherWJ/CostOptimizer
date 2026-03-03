import { db } from "./connection";

const val = await db`SELECT * FROM product_lines`.simple();
console.log(val);
