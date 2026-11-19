"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/modules/auth/auth.actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action={action} className="w-full max-w-md rounded-xl border p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        {state?.error && (
          <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}
        <label className="mt-6 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded border px-3 py-2"
        />
        {state?.errors?.email?.map((error) => (
          <p key={error} className="mt-1 text-sm text-red-700">{error}</p>
        ))}
        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-2 w-full rounded border px-3 py-2"
        />
        {state?.errors?.password?.map((error) => (
          <p key={error} className="mt-1 text-sm text-red-700">{error}</p>
        ))}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Login"}
        </button>
        <p className="mt-4 text-center text-sm">
          <Link href="/register" className="underline">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
