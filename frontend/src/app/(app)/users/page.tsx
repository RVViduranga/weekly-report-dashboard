"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
import type { Role, User } from "@/types";

interface UserRow extends User {
  createdAt: string;
  _count: { reports: number };
}

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

export default function UsersPage() {
  const { isManager } = useRequireManager();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("TEAM_MEMBER");
  const [creating, setCreating] = useState(false);

  function load() {
    return api
      .get<{ users: UserRow[] }>("/users")
      .then((data) => setUsers(data.users));
  }

  useEffect(() => {
    if (!isManager) return;

    load()
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load users")
      )
      .finally(() => setLoading(false));
  }, [isManager]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (!email.includes("@")) return setError("Enter a valid email address");
    if (password.length < 8) return setError("Password must be at least 8 characters");

    setCreating(true);

    try {
      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      setName("");
      setEmail("");
      setPassword("");
      setRole("TEAM_MEMBER");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not add the team member"
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(userId: string, nextRole: Role) {
    setBusyId(userId);
    setError(null);

    try {
      await api.patch(`/users/${userId}/role`, { role: nextRole });
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not change the role"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(userRow: UserRow) {
    if (
      !window.confirm(
        `Remove ${userRow.name}? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusyId(userRow.id);
    setError(null);

    try {
      await api.delete(`/users/${userRow.id}`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not remove the account"
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isManager) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Team members</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Add people to the team, change who can review reports, and remove
        accounts that were never used.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Temporary password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClass}
          >
            <option value="TEAM_MEMBER">Team member</option>
            <option value="MANAGER">Manager</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {creating ? "Adding..." : "Add member"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-neutral-500">Loading team...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Reports</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((row) => {
                const isSelf = row.id === currentUser?.id;
                const busy = busyId === row.id;

                return (
                  <tr
                    key={row.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${row.id}`}
                        className="underline underline-offset-2"
                      >
                        {row.name}
                      </Link>
                      {isSelf && (
                        <span className="ml-2 text-xs text-neutral-500">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {row.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={row.role}
                        disabled={isSelf || busy}
                        onChange={(e) =>
                          changeRole(row.id, e.target.value as Role)
                        }
                        className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm disabled:opacity-50 dark:border-neutral-700"
                        title={
                          isSelf ? "You cannot change your own role" : undefined
                        }
                      >
                        <option value="TEAM_MEMBER">Team member</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row._count.reports}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeUser(row)}
                        disabled={isSelf || busy || row._count.reports > 0}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
                        title={
                          row._count.reports > 0
                            ? "This person has reports, so their account cannot be removed"
                            : isSelf
                              ? "You cannot remove your own account"
                              : undefined
                        }
                      >
                        {busy ? "..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}