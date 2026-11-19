"use server";

import { signIn } from "@/lib/auth";
import { loginSchema, registrationSchema } from "@/modules/auth/auth.validation";
import { registerCustomer } from "@/modules/auth/auth.service";

export type AuthFormState = {
  error?: string;
  errors?: Record<string, string[]>;
} | null;

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registrationSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const result = await registerCustomer(parsed.data);
    if (!result.ok) {
      return { error: result.error };
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return { error: "An account with this email already exists." };
    }
    return { error: "Unable to create the account." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (
        ("type" in error && error.type === "CredentialsSignin") ||
        ("name" in error && error.name === "CredentialsSignin")
      )
    ) {
      return { error: "Unable to create the account." };
    }
    throw error;
  }
  return null;
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (
        ("type" in error && error.type === "CredentialsSignin") ||
        ("name" in error && error.name === "CredentialsSignin")
      )
    ) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
  return null;
}
