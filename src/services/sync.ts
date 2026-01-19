import { supabase } from "../supabase";
import { db } from "../db";

export async function syncNow() {
  if (!supabase) {
    console.warn("Supabase not configured. Skipping sync.");
    return;
  }

  const tables = [
    "projects",
    "tasks",
    "visits",
    "task_photos",
    "intervenants",
    "categories",
  ] as const;

  for (const table of tables) {
    const rows = await db.table(table).toArray();
    const { error } = await supabase.from(table).upsert(rows, {
      onConflict: "id",
    });
    if (error) {
      console.error(`Sync failed for ${table}`, error);
    }
  }
}
