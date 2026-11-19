import { query } from "@/lib/db";
import type { CommissionRule } from "./commission.types";

export async function listCommissionRules(): Promise<CommissionRule[]> {
  const result = await query<{
    id: string;
    name: string;
    scope: CommissionRule["scope"];
    commission_bps: number;
    is_active: boolean;
  }>(
    `
      SELECT id, name, scope, commission_bps, is_active
      FROM commission_rules
      ORDER BY created_at DESC
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    scope: row.scope,
    commissionBps: row.commission_bps,
    isActive: row.is_active,
  }));
}

export type CommissionTransactionAdmin = {
  id: string;
  sellerOrderId: string;
  orderNumber: string;
  shopName: string;
  orderAmountLak: string;
  commissionBps: number;
  commissionAmountLak: string;
  status: "pending" | "available" | "credited" | "reversed";
};

export async function listCommissionTransactions(): Promise<CommissionTransactionAdmin[]> {
  const result = await query<{
    id: string;
    seller_order_id: string;
    order_number: string;
    shop_name: string;
    order_amount_lak: string;
    applied_commission_bps: number;
    commission_amount_lak: string;
    status: CommissionTransactionAdmin["status"];
  }>(
    `
      SELECT ct.id,
             ct.seller_order_id,
             o.order_number,
             sp.shop_name,
             ct.order_amount_lak::text AS order_amount_lak,
             ct.applied_commission_bps,
             ct.commission_amount_lak::text AS commission_amount_lak,
             ct.status
      FROM commission_transactions ct
      JOIN seller_orders so ON so.id = ct.seller_order_id
      JOIN orders o ON o.id = so.order_id
      JOIN seller_profiles sp ON sp.id = so.seller_profile_id
      ORDER BY ct.created_at DESC
      LIMIT 100
    `
  );

  return result.rows.map((row) => ({
    id: row.id,
    sellerOrderId: row.seller_order_id,
    orderNumber: row.order_number,
    shopName: row.shop_name,
    orderAmountLak: row.order_amount_lak,
    commissionBps: row.applied_commission_bps,
    commissionAmountLak: row.commission_amount_lak,
    status: row.status,
  }));
}
