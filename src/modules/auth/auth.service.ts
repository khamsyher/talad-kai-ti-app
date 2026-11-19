import bcrypt from "bcryptjs";
import {
  createCustomer,
  findAuthUserByEmail,
} from "@/modules/auth/auth.repository";

export async function authenticateCustomer(email: string, password: string) {
  const user = await findAuthUserByEmail(email);
  if (!user || user.status !== "active") {
    return null;
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    role: user.role,
  };
}

export async function registerCustomer(values: {
  displayName: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const existing = await findAuthUserByEmail(values.email);
  if (existing) {
    return { ok: false as const, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(values.password, 12);
  const user = await createCustomer({
    displayName: values.displayName,
    email: values.email,
    phone: values.phone,
    passwordHash,
  });

  return {
    ok: true as const,
    user: {
      id: user.id,
      name: user.displayName,
      email: user.email,
      role: user.role,
    },
  };
}
