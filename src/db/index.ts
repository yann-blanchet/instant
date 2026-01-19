import Dexie, { type Table } from "dexie";
import type {
  Project,
  Task,
  Visit,
  TaskPhoto,
  VisitPhoto,
  TaskItem,
  Intervenant,
  Category,
} from "./types";

export class AppDB extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  visits!: Table<Visit, string>;
  task_photos!: Table<TaskPhoto, string>;
  visit_photos!: Table<VisitPhoto, string>;
  task_items!: Table<TaskItem, string>;
  intervenants!: Table<Intervenant, string>;
  categories!: Table<Category, string>;

  constructor() {
    super("instant_site_inspection");
    const schema = {
      projects: "id, name, updated_at, deleted_at",
      tasks: "id, project_id, status, updated_at, deleted_at",
      visits: "id, project_id, date, ended_at, updated_at, deleted_at",
      task_photos: "id, task_id, updated_at, deleted_at",
      visit_photos: "id, visit_id, updated_at, deleted_at",
      task_items: "id, task_id, type, created_at",
      intervenants: "id, name, updated_at, deleted_at",
      categories: "id, name, updated_at, deleted_at",
    };

    this.version(1).stores(schema);
    this.version(2).stores(schema);
    this.version(3).stores(schema);
    this.version(4)
      .stores(schema)
      .upgrade((tx) =>
        tx
          .table("tasks")
          .toCollection()
          .modify((task) => {
            if (task.status === "todo" || task.status === "doing") {
              task.status = "open";
            }
          }),
      );
  }
}

export const db = new AppDB();
