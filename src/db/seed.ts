import { db } from "./index";
import type { Category, Intervenant, Project, Task, Visit } from "./types";

const nowIso = () => new Date().toISOString();
const todayIso = () => new Date().toISOString().slice(0, 10);

const makeId = () => crypto.randomUUID();

export async function seedIfEmpty() {
  const projectCount = await db.projects.count();
  if (projectCount > 0) return;

  const created_at = nowIso();

  const project: Project = {
    id: makeId(),
    name: "Riverside Loft",
    address: "12 Rue des Arches, Lyon",
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  const intervenant: Intervenant = {
    id: makeId(),
    name: "Marie Dubois",
    color: "primary",
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  const category: Category = {
    id: makeId(),
    name: "Electricity",
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  const task: Task = {
    id: makeId(),
    project_id: project.id,
    description: "Fix kitchen outlets. Two sockets not grounded. Add GFCI protection.",
    status: "open",
    intervenant_id: intervenant.id,
    audio_url: null,
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  const quickTask: Task = {
    id: makeId(),
    project_id: null,
    description: "Check stair railing height",
    status: "open",
    intervenant_id: null,
    audio_url: null,
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  const visit: Visit = {
    id: makeId(),
    project_id: project.id,
    date: todayIso(),
    comment: "Initial walkthrough and rough measurements.",
    visit_number: 1,
    ended_at: null,
    created_at,
    updated_at: created_at,
    deleted_at: null,
  };

  await db.transaction(
    "rw",
    db.projects,
    db.tasks,
    db.visits,
    db.intervenants,
    db.categories,
    async () => {
    await db.projects.add(project);
    await db.tasks.bulkAdd([task, quickTask]);
    await db.visits.add(visit);
    await db.intervenants.add(intervenant);
    await db.categories.add(category);
    },
  );
}
