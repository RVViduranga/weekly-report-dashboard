"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import Field, { controlClass, Notice } from "@/components/ui/Field";

const DEMO_ACCOUNTS = [
  { label: "Manager", email: "manager@example.com" },
  { label: "Team member", email: "alex@example.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function signIn(withEmail: string, withPassword: string) {
    setError(null);
    setSubmitting(true);

    try {
      await login(withEmail.trim(), withPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not reach the server"
      );
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your email and password");
      return;
    }

    await signIn(email, password);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-on-accent shadow-raised"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 14.5V9m4 5.5v-9m4 9V11m4 3.5V6.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h1 className="text-xl font-semibold tracking-tight">
            Weekly Report Dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Sign in to submit or review weekly reports.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                className={controlClass}
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className={controlClass}
              />
            </Field>

            {error && <Notice>{error}</Notice>}

            <Button type="submit" busy={submitting} className="mt-1 w-full">
              {submitting ? "Signing in" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 border-t border-line-soft pt-5">
            <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
              Demo accounts
            </p>
            <p className="mt-1 text-xs text-ink-3">
              Seeded data, password <code className="font-mono">password123</code>.
            </p>
            <div className="mt-3 flex gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={submitting}
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("password123");
                    void signIn(account.email, "password123");
                  }}
                  className="flex-1"
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-ink-3">
          No account?{" "}
          <Link
            href="/register"
            className="font-medium text-accent-ink underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
