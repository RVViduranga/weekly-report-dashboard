"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";
import Field, {
  controlClass,
  invalidClass,
  Notice,
} from "@/components/ui/Field";
import type { Role } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("TEAM_MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (name.trim().length < 2) errors.name = "Name must be at least 2 characters";
    if (!email.includes("@")) errors.email = "Enter a valid email address";
    if (password.length < 8) errors.password = "Password must be at least 8 characters";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      await register({ name: name.trim(), email: email.trim(), password, role });
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(
          Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message]))
        );
      } else {
        setError("Could not reach the server");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass = (field: string) =>
    `${controlClass} ${fieldErrors[field] ? invalidClass : ""}`;

  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Join your team and start filing weekly reports.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Full name" error={fieldErrors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={fieldClass("name")}
              />
            </Field>

            <Field label="Email" error={fieldErrors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@company.com"
                className={fieldClass("email")}
              />
            </Field>

            <Field
              label="Password"
              error={fieldErrors.password}
              hint="At least 8 characters."
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={fieldClass("password")}
              />
            </Field>

            <Field label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className={controlClass}
              >
                <option value="TEAM_MEMBER">Team member</option>
                <option value="MANAGER">Manager</option>
              </select>
            </Field>

            {error && <Notice>{error}</Notice>}

            <Button type="submit" busy={submitting} className="mt-1 w-full">
              {submitting ? "Creating account" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-3">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-accent-ink underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
