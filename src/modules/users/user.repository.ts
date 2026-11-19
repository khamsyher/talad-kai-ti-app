
import { query } from "../../lib/db";

export async function getUsers() {
  const result = await query(
    `SELECT id, display_name, email, role, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

export async function getUserByEmail(email: string) {
  const result = await query(
    `SELECT id, display_name, email, password_hash, role, status
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}
