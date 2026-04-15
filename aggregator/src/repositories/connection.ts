import { SQL } from "bun";
import { parse } from "pg-connection-string";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is not defined in the environment variables!");
}

const config = parse(connectionString);

// Optional: Debug log to verify what the container sees (remove in production)
console.log(`Connecting to DB at ${config.host}:${config.port} as ${config.user}`);

export const db = new SQL({
  username: config.user,
  password: config.password,
  hostname: config.host,
  port: parseInt(config.port || "5432"),
  database: config.database,
  max: 20,
  idleTimeout: 30,
  maxLifetime: 60 * 30,
});