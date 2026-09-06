"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { controlClass, controlClassSm, Notice } from "@/components/ui/Field";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  TableShell,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui/Table";
import type { Role, User } from "@/types";

interface UserRow extends User {
  createdAt: string;
  _count: { reports: number };
}

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
        err instanceof ApiError ? err.message : "Could not add the member"
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
      <PageHeader
        title="Team members"
        description="Add people to the team, change who can review reports, and remove accounts that were never used."
      />

      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Full name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={controlClass}
          />
        </label>

        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={controlClass}
          />
        </label>

        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">
            Temporary password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className={controlClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={controlClass}
          >
            <option value="TEAM_MEMBER">Team member</option>
            <option value="MANAGER">Manager</option>
          </select>
        </label>

        <Button type="submit" busy={creating}>
          {creating ? "Adding" : "Add member"}
        </Button>
      </form>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : (
        <TableShell>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Email</th>
              <th className={thClass}>Role</th>
              <th className={`${thClass} text-right`}>Reports</th>
              <th className={thClass}>Joined</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {users.map((row) => {
              const isSelf = row.id === currentUser?.id;
              const busy = busyId === row.id;

              return (
                <tr key={row.id} className={trClass}>
                  <td className={tdClass}>
                    <Link
                      href={`/users/${row.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {row.name}
                    </Link>
                    {isSelf && (
                      <span className="ml-2 text-xs text-ink-3">(you)</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-ink-2`}>{row.email}</td>
                  <td className={tdClass}>
                    <select
                      value={row.role}
                      disabled={isSelf || busy}
                      onChange={(e) =>
                        changeRole(row.id, e.target.value as Role)
                      }
                      className={`${controlClassSm} disabled:opacity-50`}
                      title={
                        isSelf ? "You cannot change your own role" : undefined
                      }
                    >
                      <option value="TEAM_MEMBER">Team member</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {row._count.reports}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-ink-2`}>
                    {formatDate(row.createdAt)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeUser(row)}
                      busy={busy}
                      disabled={isSelf || row._count.reports > 0}
                      title={
                        row._count.reports > 0
                          ? "This person has reports, so their account cannot be removed"
                          : isSelf
                            ? "You cannot remove your own account"
                            : undefined
                      }
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
