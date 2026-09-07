"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  EllipsisVertical,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Dialog, { ConfirmDialog } from "@/components/ui/Dialog";
import DropdownMenu from "@/components/ui/DropdownMenu";
import EmptyState from "@/components/ui/EmptyState";
import Field, {
  controlClass,
  Notice,
  SearchInput,
} from "@/components/ui/Field";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
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

function RoleBadge({ role }: { role: Role }) {
  const manager = role === "MANAGER";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        manager ? "bg-accent-soft text-accent-ink" : "bg-idle-soft text-idle-ink"
      }`}
    >
      {manager ? <ShieldCheck size={12} /> : <UserRound size={12} />}
      {manager ? "Manager" : "Team member"}
    </span>
  );
}

export default function UsersPage() {
  const { isManager } = useRequireManager();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("TEAM_MEMBER");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingRemoval, setPendingRemoval] = useState<UserRow | null>(null);

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

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle)
    );
  }, [users, search]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (name.trim().length < 2) return setFormError("Name must be at least 2 characters");
    if (!email.includes("@")) return setFormError("Enter a valid email address");
    if (password.length < 8) return setFormError("Password must be at least 8 characters");

    setCreating(true);

    try {
      await api.post("/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      await load();
      toast.success(`${name.trim()} was added to the team`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("TEAM_MEMBER");
      setAddOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not add the member"
      );
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(row: UserRow, nextRole: Role) {
    setBusyId(row.id);

    try {
      await api.patch(`/users/${row.id}/role`, { role: nextRole });
      await load();
      toast.success(
        `${row.name} is now a ${nextRole === "MANAGER" ? "manager" : "team member"}`
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not change the role"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemoval() {
    if (!pendingRemoval) return;
    setBusyId(pendingRemoval.id);

    try {
      await api.delete(`/users/${pendingRemoval.id}`);
      await load();
      toast.success(`${pendingRemoval.name}'s account was removed`);
      setPendingRemoval(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not remove the account"
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isManager) return null;

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team members</h1>
          <p className="mt-1 text-sm text-ink-2">
            Who is on the team, who can review reports, and how much each person
            has filed.
          </p>
        </div>

        <Button onClick={() => setAddOpen(true)}>
          <UserPlus size={15} />
          Add member
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email"
          className="w-full max-w-xs"
        />

        <span className="text-sm text-ink-3">
          <span className="font-medium text-ink-2 tabular-nums">
            {visible.length}
          </span>{" "}
          of {users.length}
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nobody matches that search"
          description="Try part of a name or an email address."
          action={
            <Button variant="secondary" onClick={() => setSearch("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <TableShell>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>User</th>
              <th className={thClass}>Role</th>
              <th className={`${thClass} text-right`}>Reports</th>
              <th className={thClass}>Joined</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const isSelf = row.id === currentUser?.id;
              const hasReports = row._count.reports > 0;

              return (
                <tr key={row.id} className={trClass}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} size="md" />
                      <div className="min-w-0">
                        <Link
                          href={`/users/${row.id}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          {row.name}
                        </Link>
                        {isSelf && (
                          <span className="ml-2 text-xs text-ink-3">(you)</span>
                        )}
                        <p className="truncate text-xs text-ink-3">
                          {row.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={tdClass}>
                    <RoleBadge role={row.role} />
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {row._count.reports}
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-ink-2`}>
                    {formatDate(row.createdAt)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <DropdownMenu
                      label={`Actions for ${row.name}`}
                      trigger={<EllipsisVertical size={16} />}
                      items={[
                        {
                          label: "View profile",
                          icon: <ArrowRight />,
                          onSelect: () => router.push(`/users/${row.id}`),
                        },
                        {
                          label:
                            row.role === "MANAGER"
                              ? "Make team member"
                              : "Make manager",
                          icon: <ShieldCheck />,
                          disabled: isSelf || busyId === row.id,
                          disabledReason: "You cannot change your own role",
                          onSelect: () =>
                            changeRole(
                              row,
                              row.role === "MANAGER" ? "TEAM_MEMBER" : "MANAGER"
                            ),
                        },
                        {
                          label: "Remove account",
                          icon: <Trash2 />,
                          tone: "danger",
                          disabled: isSelf || hasReports || busyId === row.id,
                          disabledReason: hasReports
                            ? "This person has reports, so their account cannot be removed"
                            : "You cannot remove your own account",
                          onSelect: () => setPendingRemoval(row),
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <Dialog
        open={addOpen}
        title="Add a team member"
        description="They can sign in straight away with the password you set here."
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" form="add-member" busy={creating}>
              {creating ? "Adding" : "Add member"}
            </Button>
          </>
        }
      >
        <form
          id="add-member"
          onSubmit={handleCreate}
          className="flex flex-col gap-3.5"
          noValidate
        >
          <Field label="Full name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={controlClass}
              data-autofocus
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="them@company.com"
              className={controlClass}
            />
          </Field>

          <Field label="Temporary password" hint="At least 8 characters.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className={controlClass}
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

          {formError && <Notice>{formError}</Notice>}
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={`Remove ${pendingRemoval?.name ?? ""}?`}
        description="Their account is deleted and they can no longer sign in. This cannot be undone."
        confirmLabel="Remove account"
        busy={busyId === pendingRemoval?.id}
        onConfirm={confirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}
