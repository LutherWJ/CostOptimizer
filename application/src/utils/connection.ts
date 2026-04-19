import { SQL } from "bun";
import { parse } from "pg-connection-string";

function envBool(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function getDbConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    const parsed = parse(connectionString);
    return {
      username: parsed.user,
      password: parsed.password,
      hostname: parsed.host,
      port: Number(parsed.port || 5432),
      database: parsed.database,
    };
  }

  const required = [
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_HOSTNAME",
    "POSTGRES_PORT",
    "POSTGRES_DB",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`❌ Database configuration is incomplete. Missing env var: ${key}`);
    }
  }

  return {
    username: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
    hostname: process.env.POSTGRES_HOSTNAME!,
    port: Number(process.env.POSTGRES_PORT),
    database: process.env.POSTGRES_DB!,
  };
}

const config = getDbConfig();

console.log(`Connecting to DB at ${config.hostname}:${config.port} as ${config.username}`);

function createDb() {
  const tlsEnabled = envBool("POSTGRES_TLS", false) || envBool("POSTGRES_SSL", false);
  const tlsInsecure = envBool("POSTGRES_TLS_INSECURE", false) || envBool("POSTGRES_SSL_INSECURE", false);

  return new SQL({
    username: config.username,
    password: config.password,
    hostname: config.hostname,
    port: config.port,
    database: config.database,
    max: 20,
    idleTimeout: 30,
    maxLifetime: 60 * 30,
    connectionTimeout: 15,
    tls: tlsEnabled ? (tlsInsecure ? { rejectUnauthorized: false } : true) : false,
  });
}

export let db = createDb();

export async function reconnectDb(): Promise<void> {
  try {
    await db.close();
  } catch {
    // ignore
  }
  db = createDb();
}
