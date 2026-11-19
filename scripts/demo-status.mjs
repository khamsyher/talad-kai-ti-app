import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import pg from "pg";

loadEnvironmentFile(".env.local");
loadEnvironmentFile(".env");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const adminResult = await client.query(
      `
        SELECT role, status, password_hash
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [adminEmail.trim().toLowerCase()]
    );
    const admin = adminResult.rows[0];
    if (!admin) {
      console.log("Administrator: missing");
    } else {
      const passwordMatches =
        typeof admin.password_hash === "string"
          ? await bcrypt.compare(adminPassword, admin.password_hash)
          : false;
      console.log(
        `Administrator: ${admin.role} | ${admin.status} | password=${passwordMatches ? "valid" : "invalid"}`
      );
    }
  } else {
    console.log("Administrator credentials are not configured.");
  }

  const productResult = await client.query(
    `
      SELECT
        COUNT(*)::text AS product_count,
        COALESCE(array_agg(p.slug ORDER BY p.slug), ARRAY[]::text[]) AS slugs
      FROM products p
      JOIN seller_profiles sp ON sp.id = p.seller_profile_id
      WHERE sp.slug = 'demo-poultry-shop'
        AND p.status = 'approved'
    `
  );
  console.log(`Demo approved products: ${productResult.rows[0].product_count}`);
  const slugs = new Set(productResult.rows[0].slugs);
  const missing = [];
  for (let number = 1; number <= 100; number += 1) {
    const slug = `demo-poultry-product-${String(number).padStart(2, "0")}`;
    if (!slugs.has(slug)) {
      missing.push(slug);
    }
  }
  if (missing.length) {
    console.log(`Missing demo slugs: ${missing.join(", ")}`);
  } else {
    console.log("Missing demo slugs: none");
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
