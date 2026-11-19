import fs from "node:fs";
import path from "node:path";
import pg from "pg";

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const expectedTables = [
  "users",
  "seller_profiles",
  "addresses",
  "categories",
  "products",
  "product_images",
  "carts",
  "cart_items",
  "orders",
  "seller_orders",
  "order_items",
  "payments",
  "commission_rules",
  "commission_transactions",
  "wallets",
  "wallet_transactions",
  "payouts",
  "reviews",
  "notifications",
  "audit_logs",
  "platform_settings",
  "seller_verification_documents",
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `
  );
  const tables = new Set(rows.map((row) => row.table_name));
  const missing = expectedTables.filter((table) => !tables.has(table));

  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(", ")}`);
  }

  console.log(`Schema verification passed: ${expectedTables.length} required tables found.`);
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
