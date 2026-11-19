import fs from "node:fs";
import path from "node:path";
import pg from "pg";

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationsDirectory = path.resolve("database", "migrations");
const statusOnly = process.argv.includes("--status");
const client = new pg.Client({ connectionString });

await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const { rows: appliedRows } = await client.query(
  "SELECT name FROM schema_migrations"
);
const applied = new Set(appliedRows.map((row) => row.name));
const migrationFiles = fs.existsSync(migrationsDirectory)
  ? fs.readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort()
  : [];

if (statusOnly) {
  for (const file of migrationFiles) {
    console.log(`${applied.has(file) ? "[applied]" : "[pending]"} ${file}`);
  }
  await client.end();
  process.exit(0);
}

for (const file of migrationFiles) {
  if (applied.has(file)) {
    continue;
  }

  const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (name) VALUES ($1)",
      [file]
    );
    await client.query("COMMIT");
    console.log(`Applied ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

await client.end();

function loadEnvironmentFile(fileName) {
  const filePath = path.resolve(fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1).replace(/^["']|["']$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
