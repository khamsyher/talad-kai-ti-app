import { query } from "@/lib/db";

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotalLak: string;
  customerFeeLak: string;
  totalLak: string;
  createdAt: Date;
};

export async function listCustomerOrders(userId: string): Promise<CustomerOrder[]> {
  const result = await query<{
    id: string;
    order_number: string;
    status: string;
    subtotal_lak: string;
    customer_fee_lak: string;
    total_lak: string;
    created_at: Date;
  }>(
    `
      SELECT
        id,
        order_number,
        status,
        subtotal_lak::text AS subtotal_lak,
        customer_fee_lak::text AS customer_fee_lak,
        total_lak::text AS total_lak,
        created_at
      FROM orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    subtotalLak: row.subtotal_lak,
    customerFeeLak: row.customer_fee_lak,
    totalLak: row.total_lak,
    createdAt: row.created_at,
  }));
}

export type CustomerOrderDetail = CustomerOrder & {
  address: {
    recipientName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    province: string;
    district: string | null;
  } | null;
  paymentStatus: string | null;
};

export async function findCustomerOrder(
  userId: string,
  orderId: string
): Promise<CustomerOrderDetail | null> {
  const result = await query<{
    id: string;
    order_number: string;
    status: string;
    subtotal_lak: string;
    customer_fee_lak: string;
    total_lak: string;
    created_at: Date;
    recipient_name: string | null;
    phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    province: string | null;
    district: string | null;
    payment_status: string | null;
  }>(
    `
      SELECT
        o.id,
        o.order_number,
        o.status,
        o.subtotal_lak::text AS subtotal_lak,
        o.customer_fee_lak::text AS customer_fee_lak,
        o.total_lak::text AS total_lak,
        o.created_at,
        a.recipient_name,
        a.phone,
        a.address_line1,
        a.address_line2,
        a.province,
        a.district,
        (
          SELECT p.status
          FROM payments p
          WHERE p.order_id = o.id
          ORDER BY p.created_at DESC
          LIMIT 1
        ) AS payment_status
      FROM orders o
      LEFT JOIN addresses a ON a.id = o.shipping_address_id
      WHERE o.id = $1
        AND o.customer_id = $2
      LIMIT 1
    `,
    [orderId, userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    subtotalLak: row.subtotal_lak,
    customerFeeLak: row.customer_fee_lak,
    totalLak: row.total_lak,
    createdAt: row.created_at,
    paymentStatus: row.payment_status,
    address:
      row.recipient_name && row.phone && row.address_line1 && row.province
        ? {
            recipientName: row.recipient_name,
            phone: row.phone,
            addressLine1: row.address_line1,
            addressLine2: row.address_line2,
            province: row.province,
            district: row.district,
          }
        : null,
  };
}
