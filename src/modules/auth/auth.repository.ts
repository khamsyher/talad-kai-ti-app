import { query } from "@/lib/db";

export type AuthUser = {
  id: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: "customer" | "seller" | "administrator" | "delivery_staff";
  status: "active" | "inactive" | "banned";
};

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const result = await query<{
    id: string;
    display_name: string;
    email: string;
    password_hash: string;
    role: AuthUser["role"];
    status: AuthUser["status"];
  }>(
    `
      SELECT id, display_name, email, password_hash, role, status
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
  };
}

export async function createCustomer(
  values: { displayName: string; email: string; phone?: string; passwordHash: string }
): Promise<AuthUser> {
  const result = await query<{
    id: string;
    display_name: string;
    email: string;
    password_hash: string;
    role: AuthUser["role"];
    status: AuthUser["status"];
  }>(
    `
      INSERT INTO users (display_name, email, phone, password_hash, role, status)
      VALUES ($1, $2, NULLIF($3, ''), $4, 'customer', 'active')
      RETURNING id, display_name, email, password_hash, role, status
    `,
    [values.displayName, values.email, values.phone ?? "", values.passwordHash]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
  };
}
