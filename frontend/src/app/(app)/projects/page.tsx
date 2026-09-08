"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  EllipsisVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
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
import type { Project } from "@/types";

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        active ? "bg-ok-soft text-ok-ink" : "bg-idle-soft text-idle-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {active ? "Active" : "Archived"}
    </span>
  );
}

export default function ProjectsPage() {
  const { isManager } = useRequireManager();
  const toast = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // One dialog serves both jobs; `editing` decides which.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [pendingRemoval, setPendingRemoval] = useState<Project | null>(null);

  function load() {
    return api
      .get<{ projects: Project[] }>("/projects?includeInactive=true")
      .then((data) => setProjects(data.projects));
  }

  useEffect(() => {
    if (!isManager) return;

    load()
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Could not load projects"
        )
      )
      .finally(() => setLoading(false));
  }, [isManager]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(needle) ||
        (project.description ?? "").toLowerCase().includes(needle)
    );
  }, [projects, search]);

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setName(project.name);
    setDescription(project.description ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (name.trim().length < 2) {
      setFormError("Project name must be at least 2 characters");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() === "" ? undefined : description.trim(),
    };

    try {
      if (editing) {
        await api.patch(`/projects/${editing.id}`, payload);
      } else {
        await api.post("/projects", payload);
      }
      await load();
      toast.success(
        editing ? `${payload.name} was updated` : `${payload.name} was created`
      );
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save the project"
      );
    } finally {
      setSaving(false);
    }
  }

  async function restore(project: Project) {
    setBusyId(project.id);

    try {
      await api.patch(`/projects/${project.id}`, { isActive: true });
      await load();
      toast.success(`${project.name} was restored`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not restore the project"
      );
    } finally {
      setBusyId(null);
    }
  }

  /**
   * The server decides between deleting and archiving - it is the only side
   * that can count the reports at the moment the request arrives - and says
   * which it did, so the message here is never a guess.
   */
  async function remove(project: Project) {
    setBusyId(project.id);

    try {
      const result = await api.delete<{ deleted: boolean; reportCount: number }>(
        `/projects/${project.id}`
      );
      await load();
      toast.success(
        result.deleted
          ? `${project.name} was deleted`
          : `${project.name} was archived, because ${result.reportCount} reports reference it`
      );
      setPendingRemoval(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not remove the project"
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
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-ink-2">
            The categories reports are filed against. Archiving one hides it from
            new reports without touching past ones.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus size={15} />
          Add project
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects"
          className="w-full max-w-xs"
        />

        <span className="text-sm text-ink-3">
          <span className="font-medium text-ink-2 tabular-nums">
            {visible.length}
          </span>{" "}
          of {projects.length}
        </span>
      </div>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={projects.length === 0 ? "empty" : "search"}
          title={
            projects.length === 0
              ? "No projects yet"
              : "No projects match that search"
          }
          description={
            projects.length === 0
              ? "Add the first project so the team has something to file reports against."
              : "Try part of a project name or description."
          }
          action={
            projects.length === 0 ? (
              <Button onClick={openCreate}>
                <Plus size={15} />
                Add project
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setSearch("")}>
                Clear search
              </Button>
            )
          }
        />
      ) : (
        <TableShell>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Project</th>
              <th className={thClass}>Description</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Created</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {visible.map((project) => (
              <tr key={project.id} className={trClass}>
                <td className={`${tdClass} font-medium`}>{project.name}</td>
                <td className={`${tdClass} max-w-md text-ink-2`}>
                  {project.description ?? "-"}
                </td>
                <td className={tdClass}>
                  <StatusPill active={project.isActive} />
                </td>
                <td className={`${tdClass} whitespace-nowrap text-ink-2`}>
                  {formatDate(project.createdAt)}
                </td>
                <td className={`${tdClass} text-right`}>
                  <DropdownMenu
                    label={`Actions for ${project.name}`}
                    trigger={<EllipsisVertical size={16} />}
                    items={[
                      {
                        label: "Edit details",
                        icon: <Pencil />,
                        onSelect: () => openEdit(project),
                      },
                      ...(project.isActive
                        ? []
                        : [
                            {
                              label: "Restore",
                              icon: <ArchiveRestore />,
                              disabled: busyId === project.id,
                              onSelect: () => restore(project),
                            },
                          ]),
                      // An archived project with reports has nowhere left to
                      // go, so it is not offered a dead action.
                      ...(project.isActive || project.reportCount === 0
                        ? [
                            {
                              label: "Delete",
                              icon: <Trash2 />,
                              disabled: busyId === project.id,
                              onSelect: () => setPendingRemoval(project),
                            },
                          ]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Dialog
        open={formOpen}
        title={editing ? "Edit project" : "Add a project"}
        description={
          editing
            ? "Reports already filed against it keep their link."
            : "It becomes available to everyone filing a report."
        }
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" form="project-form" busy={saving}>
              {saving ? "Saving" : editing ? "Save changes" : "Add project"}
            </Button>
          </>
        }
      >
        <form
          id="project-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-3.5"
          noValidate
        >
          <Field label="Project name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client B Migration"
              className={controlClass}
              data-autofocus
            />
          </Field>

          <Field label="Description" hint="Optional.">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this project covers"
              className={controlClass}
            />
          </Field>

          {formError && <Notice>{formError}</Notice>}
        </form>
      </Dialog>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={
          pendingRemoval?.reportCount === 0
            ? `Delete ${pendingRemoval?.name ?? ""}?`
            : `Archive ${pendingRemoval?.name ?? ""}?`
        }
        description={
          pendingRemoval?.reportCount === 0
            ? "No reports reference this project, so it will be removed permanently. This cannot be undone."
            : `${pendingRemoval?.reportCount} reports reference this project, so it will be archived rather than deleted. It disappears from the list people pick from when filing a report, every report already filed against it stays readable, and you can restore it at any time.`
        }
        confirmLabel={
          pendingRemoval?.reportCount === 0 ? "Delete project" : "Archive project"
        }
        busy={busyId === pendingRemoval?.id}
        onConfirm={() => pendingRemoval && remove(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  );
}
