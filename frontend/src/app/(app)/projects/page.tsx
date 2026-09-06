"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import { controlClass, Notice } from "@/components/ui/Field";
import { SkeletonTable } from "@/components/ui/Skeleton";
import {
  TableShell,
  tdClass,
  theadClass,
  thClass,
  trClass,
} from "@/components/ui/Table";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const { isManager } = useRequireManager();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

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

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Project name must be at least 2 characters");
      return;
    }

    setCreating(true);

    try {
      await api.post("/projects", {
        name: name.trim(),
        description: description.trim() === "" ? undefined : description.trim(),
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the project"
      );
    } finally {
      setCreating(false);
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setError(null);
  }

  async function saveEdit(projectId: string) {
    setBusyId(projectId);
    setError(null);

    try {
      await api.patch(`/projects/${projectId}`, {
        name: editName.trim(),
        description:
          editDescription.trim() === "" ? undefined : editDescription.trim(),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the project"
      );
    } finally {
      setBusyId(null);
    }
  }

  async function setActive(project: Project, isActive: boolean) {
    setBusyId(project.id);
    setError(null);

    try {
      if (isActive) {
        await api.patch(`/projects/${project.id}`, { isActive: true });
      } else {
        await api.delete(`/projects/${project.id}`);
      }
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not update the project"
      );
    } finally {
      setBusyId(null);
    }
  }

  if (!isManager) return null;

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Categories your team tags reports with. Archiving one hides it from new reports without touching past ones."
      />

      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client B Migration"
            className={controlClass}
          />
        </label>

        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-3">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this project covers"
            className={controlClass}
          />
        </label>

        <Button type="submit" busy={creating}>
          {creating ? "Adding" : "Add project"}
        </Button>
      </form>

      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <TableShell>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Name</th>
              <th className={thClass}>Description</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Created</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const editing = editingId === project.id;
              const busy = busyId === project.id;

              return (
                <tr key={project.id} className={trClass}>
                  <td className={`${tdClass} font-medium`}>
                    {editing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={controlClass}
                      />
                    ) : (
                      project.name
                    )}
                  </td>
                  <td className={`${tdClass} text-ink-2`}>
                    {editing ? (
                      <input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className={controlClass}
                      />
                    ) : (
                      (project.description ?? "-")
                    )}
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                        project.isActive
                          ? "bg-ok-soft text-ok-ink"
                          : "bg-idle-soft text-idle-ink"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
                      />
                      {project.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-ink-2`}>
                    {formatDate(project.createdAt)}
                  </td>
                  <td className={`${tdClass} text-right whitespace-nowrap`}>
                    {editing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(project.id)}
                          busy={busy}
                        >
                          {busy ? "Saving" : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="ml-1"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => startEditing(project)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActive(project, !project.isActive)}
                          busy={busy}
                          className="ml-2"
                        >
                          {project.isActive ? "Archive" : "Restore"}
                        </Button>
                      </>
                    )}
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
