export type UserRole =
  | "customer"
  | "seller"
  | "administrator"
  | "delivery_staff";

export function isAllowedRole(
  role: UserRole | undefined,
  allowedRoles: readonly UserRole[]
) {
  return Boolean(role && allowedRoles.includes(role));
}
