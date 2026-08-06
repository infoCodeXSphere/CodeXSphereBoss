import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useClients } from "../hooks/useClients";
import { Card, Badge } from "../components/ui/Card";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  health: string;
  client: { id: string; name: string; company: string | null };
  _count: { tasks: number; milestones: number };
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee: { name: string } | null;
}

interface ProjectDetail extends Project {
  tasks: Task[];
  milestones: { id: string; title: string; completed: boolean }[];
}

const HEALTH_TONE: Record<string, "low" | "medium" | "high"> = { GREEN: "low", YELLOW: "medium", RED: "high" };

function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => api.get<Project[]>("/projects") });
}

function useProjectDetail(id: string | null) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get<ProjectDetail>(`/projects/${id}`),
    enabled: Boolean(id),
  });
}

function NewProjectForm({ onCreated }: { onCreated: () => void }) {
  const { data: clients } = useClients();
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => api.post("/projects", { clientId, name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setName("");
      setDescription("");
      onCreated();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clientId && name) create.mutate();
      }}
      className="grid sm:grid-cols-2 gap-3"
    >
      <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required>
        <option value="">Select client…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.company ? `(${c.company})` : ""}
          </option>
        ))}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" required />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:col-span-2"
      />
      <button type="submit" disabled={create.isPending} className="sm:col-span-2 bg-brand-indigo text-white text-sm font-medium rounded-lg py-2 disabled:opacity-60">
        {create.isPending ? "Creating…" : "Create Project"}
      </button>
    </form>
  );
}

function ProjectDetailPanel({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProjectDetail(projectId);
  const [taskTitle, setTaskTitle] = useState("");
  const queryClient = useQueryClient();

  const addTask = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/tasks`, { title: taskTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      setTaskTitle("");
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) => api.patch(`/projects/tasks/${taskId}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  if (isLoading || !project) return <p className="text-xs text-white/40 px-4 pb-4">Loading…</p>;

  return (
    <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
      <div>
        <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Tasks ({project.tasks.length})</div>
        <div className="space-y-1.5">
          {project.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm bg-white/[0.02] rounded-lg px-3 py-2">
              <span className="text-white">{t.title}</span>
              <select
                value={t.status}
                onChange={(e) => updateTaskStatus.mutate({ taskId: t.id, status: e.target.value })}
                className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1"
              >
                {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {project.tasks.length === 0 && <p className="text-xs text-white/30">No tasks yet.</p>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (taskTitle) addTask.mutate();
          }}
          className="flex gap-2 mt-2"
        >
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="New task title…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs"
          />
          <button type="submit" className="bg-white/10 text-white text-xs rounded-lg px-3">
            Add
          </button>
        </form>
      </div>
      <div>
        <div className="text-xs text-white/40 uppercase tracking-wide mb-2">Milestones ({project.milestones.length})</div>
        {project.milestones.map((m) => (
          <div key={m.id} className="text-sm text-white/70">
            {m.completed ? "✅" : "⬜"} {m.title}
          </div>
        ))}
        {project.milestones.length === 0 && <p className="text-xs text-white/30">No milestones yet.</p>}
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, health }: { id: string; health: string }) => api.patch(`/projects/${id}`, { health }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Project Management</h1>
          <p className="text-sm text-white/40 mt-1">Projects, tasks, and milestones for every client engagement.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-brand-indigo text-white text-sm font-medium rounded-lg px-4 py-2">
          {showForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showForm && (
        <Card>
          <NewProjectForm onCreated={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading && <p className="text-white/40 text-sm">Loading…</p>}

      <div className="space-y-3">
        {projects?.map((p) => (
          <Card key={p.id}>
            <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="w-full text-left flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">{p.name}</div>
                <div className="text-xs text-white/40 mt-0.5">
                  {p.client.name} {p.client.company ? `· ${p.client.company}` : ""} — {p._count.tasks} tasks, {p._count.milestones} milestones
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={HEALTH_TONE[p.health]}>{p.health}</Badge>
                <select
                  value={p.health}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateStatus.mutate({ id: p.id, health: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/5 border border-white/10 rounded text-xs px-2 py-1"
                >
                  {["GREEN", "YELLOW", "RED"].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </button>
            {expanded === p.id && <ProjectDetailPanel projectId={p.id} />}
          </Card>
        ))}
        {projects?.length === 0 && <p className="text-white/40 text-sm">No projects yet — convert a won lead into a client, then create a project for them.</p>}
      </div>
    </div>
  );
}
