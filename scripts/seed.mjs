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
  await client.query("BEGIN");

  await client.query(`
    INSERT INTO categories (name, slug, sort_order, is_active)
    VALUES
      ('Poultry', 'poultry', 10, TRUE),
      ('Poultry Feed', 'poultry-feed', 20, TRUE),
      ('Poultry Equipment', 'poultry-equipment', 30, TRUE)
    ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
  `);

  await client.query(`
    DELETE FROM products
    WHERE slug = 'native-chicken-feed-20kg'
      AND seller_profile_id = (
        SELECT id
        FROM seller_profiles
        WHERE slug = 'demo-poultry-shop'
      )
  `);

  await client.query(`
    INSERT INTO users (email, password_hash, display_name, phone, role, status)
    VALUES (
      'demo-seller@taladkaiti.local',
      'not-for-login',
      'Demo Seller',
      NULL,
      'seller',
      'active'
    )
    ON CONFLICT (email) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        role = 'seller',
        status = 'active',
        updated_at = NOW()
  `);

  await client.query(`
    INSERT INTO seller_profiles (
      user_id,
      shop_name,
      slug,
      description,
      status
    )
    SELECT
      u.id,
      'ຮ້ານໄກ່ຕີ ນ້ອຍ',
      'demo-poultry-shop',
      'A demo storefront for lawful poultry and poultry supplies.',
      'approved'
    FROM users u
    WHERE u.email = 'demo-seller@taladkaiti.local'
    ON CONFLICT (user_id) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        status = 'approved',
        identity_status = 'approved',
        identity_verified_at = COALESCE(seller_profiles.identity_verified_at, NOW()),
        updated_at = NOW()
  `);

  await client.query(`
    INSERT INTO products (
      seller_profile_id,
      category_id,
      name,
      slug,
      description,
      price_lak,
      stock_quantity,
      status
    )
    SELECT
      sp.id,
      c.id,
      'Demo Poultry Product 01',
      'demo-poultry-product-01',
      'A demo approved product for storefront testing.',
      317000,
      13,
      'approved'
    FROM seller_profiles sp
    JOIN categories c ON c.slug = 'poultry-feed'
    WHERE sp.slug = 'demo-poultry-shop'
    ON CONFLICT (seller_profile_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        price_lak = EXCLUDED.price_lak,
        stock_quantity = EXCLUDED.stock_quantity,
        status = 'approved',
        updated_at = NOW()
  `);

  await client.query(`
    DO $seed$
    DECLARE
      seller_id UUID;
      category_id UUID;
      product_number INTEGER;
    BEGIN
      SELECT id INTO seller_id
      FROM seller_profiles
      WHERE slug = 'demo-poultry-shop';

      IF seller_id IS NULL THEN
        RAISE EXCEPTION 'Demo seller not found';
      END IF;

      FOR product_number IN 1..100 LOOP
        SELECT id INTO category_id
        FROM categories
        WHERE slug = CASE
          WHEN product_number % 3 = 1 THEN 'poultry'
          WHEN product_number % 3 = 2 THEN 'poultry-feed'
          ELSE 'poultry-equipment'
        END;

        INSERT INTO products (
          seller_profile_id,
          category_id,
          name,
          slug,
          description,
          price_lak,
          stock_quantity,
          status
        )
        VALUES (
          seller_id,
          category_id,
          'Demo Poultry Product ' || LPAD(product_number::text, 2, '0'),
          'demo-poultry-product-' || LPAD(product_number::text, 2, '0'),
          'A demo approved product for storefront testing.',
          300000 + (product_number * 17000),
          10 + (product_number * 3),
          'approved'
        )
        ON CONFLICT (seller_profile_id, slug) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            category_id = EXCLUDED.category_id,
            price_lak = EXCLUDED.price_lak,
            stock_quantity = EXCLUDED.stock_quantity,
            status = 'approved',
            updated_at = NOW();
      END LOOP;
    END
    $seed$;
  `);

  await client.query(`
    INSERT INTO products (
      seller_profile_id,
      category_id,
      name,
      slug,
      description,
      price_lak,
      stock_quantity,
      status
    )
    SELECT
      sp.id,
      c.id,
      'Demo Poultry Product 100',
      'demo-poultry-product-100',
      'A demo approved product for storefront testing.',
      2000000,
      310,
      'approved'
    FROM seller_profiles sp
    JOIN categories c ON c.slug = 'poultry'
    WHERE sp.slug = 'demo-poultry-shop'
    ON CONFLICT (seller_profile_id, slug) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        category_id = EXCLUDED.category_id,
        price_lak = EXCLUDED.price_lak,
        stock_quantity = EXCLUDED.stock_quantity,
        status = 'approved',
        updated_at = NOW()
  `);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail || adminPassword) {
    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set together.");
    }
    if (adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await client.query(
      `
        INSERT INTO users (email, password_hash, display_name, role, status)
        VALUES ($1, $2, 'Administrator', 'administrator', 'active')
        ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            display_name = EXCLUDED.display_name,
            role = 'administrator',
            status = 'active',
            updated_at = NOW()
      `,
      [adminEmail.trim().toLowerCase(), passwordHash]
    );
  }

  await client.query("COMMIT");
  console.log("Database seed completed.");
  if (!adminEmail) {
    console.log("No initial administrator created: set ADMIN_EMAIL and ADMIN_PASSWORD and rerun db:seed.");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
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
