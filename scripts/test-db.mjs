import fs from "node:fs";
import path from "node:path";
import pg from "pg";

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const result = await client.query("SELECT NOW() AS current_time");
  console.log(`Database connected: ${result.rows[0].current_time}`);
} finally {
  await client.end();
}

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
