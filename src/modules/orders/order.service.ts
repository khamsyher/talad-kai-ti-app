import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";

export type CheckoutAddress = {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  province: string;
  district?: string;
  postalCode?: string;
};

export async function createCustomerOrder(
  userId: string,
  address: CheckoutAddress
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartResult = await client.query(
      `
        SELECT
          ci.product_id,
          ci.quantity,
          p.name,
          p.price_lak,
          p.stock_quantity,
          p.seller_profile_id
        FROM carts c
        JOIN cart_items ci ON ci.cart_id = c.id
        JOIN products p ON p.id = ci.product_id
        JOIN seller_profiles sp ON sp.id = p.seller_profile_id
        WHERE c.user_id = $1
          AND p.status = 'approved'
          AND sp.status = 'approved'
        FOR UPDATE OF p, ci
      `,
      [userId]
    );

    if (!cartResult.rows.length) {
      throw new Error("Cart is empty or contains unavailable products.");
    }

    for (const item of cartResult.rows) {
      if (item.quantity > item.stock_quantity) {
        throw new Error(`Insufficient stock for ${item.name}.`);
      }
    }

    const addressResult = await client.query(
      `
        INSERT INTO addresses (
          user_id,
          label,
          recipient_name,
          phone,
          address_line1,
          address_line2,
          province,
          district,
          postal_code,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, NULLIF($8, ''), NULLIF($9, ''),
          NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = $1))
        RETURNING id
      `,
      [
        userId,
        address.label,
        address.recipientName,
        address.phone,
        address.addressLine1,
        address.addressLine2 ?? "",
        address.province,
        address.district ?? "",
        address.postalCode ?? "",
      ]
    );
    const addressId = addressResult.rows[0].id as string;

    let subtotalLak = 0;
    for (const item of cartResult.rows) {
      subtotalLak += Number(item.price_lak) * Number(item.quantity);
    }
    if (!Number.isSafeInteger(subtotalLak) || subtotalLak < 0) {
      throw new Error("Invalid order total.");
    }

    const orderNumber = `TKT-${Date.now().toString().slice(-10)}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const orderResult = await client.query(
      `
        INSERT INTO orders (
          order_number,
          customer_id,
          shipping_address_id,
          status,
          subtotal_lak,
          customer_fee_lak,
          total_lak
        )
        VALUES ($1, $2, $3, 'pending', $4, 0, $4)
        RETURNING id
      `,
      [orderNumber, userId, addressId, subtotalLak]
    );
    const orderId = orderResult.rows[0].id as string;

    const sellers = new Map<string, Array<(typeof cartResult.rows)[number]>>();
    for (const item of cartResult.rows) {
      const sellerItems = sellers.get(item.seller_profile_id) ?? [];
      sellerItems.push(item);
      sellers.set(item.seller_profile_id, sellerItems);
    }

    for (const [sellerProfileId, items] of sellers) {
      const sellerSubtotal = items.reduce(
        (sum, item) => sum + Number(item.price_lak) * Number(item.quantity),
        0
      );
      const sellerOrderResult = await client.query(
        `
          INSERT INTO seller_orders (
            order_id,
            seller_profile_id,
            status,
            subtotal_lak
          )
          VALUES ($1, $2, 'pending', $3)
          RETURNING id
        `,
        [orderId, sellerProfileId, sellerSubtotal]
      );
      const sellerOrderId = sellerOrderResult.rows[0].id as string;

      for (const item of items) {
        const lineTotalLak = Number(item.price_lak) * Number(item.quantity);
        await client.query(
          `
            INSERT INTO order_items (
              seller_order_id,
              product_id,
              product_name_snapshot,
              unit_price_lak_snapshot,
              quantity,
              line_total_lak
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            sellerOrderId,
            item.product_id,
            item.name,
            Number(item.price_lak),
            Number(item.quantity),
            lineTotalLak,
          ]
        );

        await client.query(
          `
            UPDATE products
            SET stock_quantity = stock_quantity - $2,
                updated_at = NOW()
            WHERE id = $1
          `,
          [item.product_id, item.quantity]
        );
      }
    }

    await client.query(
      `
        INSERT INTO payments (
          order_id,
          provider,
          provider_reference,
          amount_lak,
          status
        )
        VALUES ($1, 'pending', $2, $3, 'pending')
        ON CONFLICT (provider, provider_reference) DO NOTHING
      `,
      [orderId, `pending:${orderId}`, subtotalLak]
    );

    await client.query(
      `
        DELETE FROM cart_items ci
        USING carts c
        WHERE ci.cart_id = c.id
          AND c.user_id = $1
      `,
      [userId]
    );

    await client.query("COMMIT");
    return { orderId, orderNumber, totalLak: subtotalLak };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
