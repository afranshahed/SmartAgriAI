"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import { Field } from "../login/LoginForm";

export function RegisterForm() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiPost("/api/auth/register", { email, password, userName });
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) throw new Error("Could not sign in after registering");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 dark:bg-rose-950/40">
          {error}
        </p>
      ) : null}
      <Field label="Name" type="text" value={userName} onChange={setUserName} placeholder="Your name" />
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="farmer@example.com" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
