import fs from "node:fs";
import path from "node:path";
import pg from "pg";

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `
      SELECT email, display_name, role, status,
             CASE
               WHEN password_hash LIKE '$2%' THEN 'bcrypt'
               ELSE 'not-bcrypt'
             END AS password_format
      FROM users
      ORDER BY created_at DESC
    `
  );

  if (!rows.length) {
    console.log("No accounts exist.");
  } else {
    for (const row of rows) {
      console.log(
        `${row.email} | ${row.role} | ${row.status} | ${row.password_format}`
      );
    }
  }
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
