import { sql, SQL } from "bun";

export const db = new SQL({
  username: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "password",
  hostname: process.env.POSTGRES_HOSTNAME || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  database: process.env.POSTGRES_DB || "laptop_db",
  max: 20,
  idleTimeout: 30,
  maxLifetime: 60 * 30,
});
