import { SQL } from "bun";
import { parse } from "pg-connection-string";

const connectionString = process.env.DATABASE_URL;

let config: any = {};

if (connectionString) {
  config = parse(connectionString);
} else {
  // Fallback to individual variables
  config = {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOSTNAME,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
  };
}

if (!config.host || !config.database) {
  throw new Error("❌ Database configuration is incomplete. Provide DATABASE_URL or POSTGRES_ environment variables.");
}

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