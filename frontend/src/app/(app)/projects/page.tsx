"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRequireManager } from "@/lib/useRequireManager";
import { formatDate } from "@/lib/format";
import type { Project } from "@/types";

const inputClass =
  "rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-300";

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

  async function load() {
    const data = await api.get<{ projects: Project[] }>(
      "/projects?includeInactive=true"
    );
    setProjects(data.projects);
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
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Categories your team tags reports with. Archiving one hides it from new
        reports without touching past ones.
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      >
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium">Project name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client B Migration"
            className={inputClass}
          />
        </label>

        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-sm font-medium">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this project covers"
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={creating}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {creating ? "Adding..." : "Add project"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-neutral-500">Loading projects...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs tracking-wide text-neutral-500 uppercase dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const editing = editingId === project.id;
                const busy = busyId === project.id;

                return (
                  <tr
                    key={project.id}
                    className="border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3">
                      {editing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`${inputClass} w-full`}
                        />
                      ) : (
                        project.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                      {editing ? (
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className={`${inputClass} w-full`}
                        />
                      ) : (
                        (project.description ?? "-")
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          project.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                      >
                        {project.isActive ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(project.id)}
                            disabled={busy}
                            className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                          >
                            {busy ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="ml-2 rounded px-2 py-1 text-xs text-neutral-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(project)}
                            className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setActive(project, !project.isActive)}
                            disabled={busy}
                            className="ml-2 rounded-md border border-neutral-300 px-2.5 py-1 text-xs disabled:opacity-50 dark:border-neutral-700"
                          >
                            {project.isActive ? "Archive" : "Restore"}
                          </button>
                        </>
                      )}
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