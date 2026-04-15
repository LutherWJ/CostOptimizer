import { db } from "./connection";

const result = await db`SELECT * FROM product_lines`;
console.log(result);
