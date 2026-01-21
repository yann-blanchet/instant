import { db } from "./index";
import { scheduleSync } from "../composables/useAutoSync";
import { supabase } from "../supabase";

/**
 * Wrapper functions that automatically trigger sync after database operations
 * Use these instead of direct db.table.add/update/delete calls
 */

export const dbSync = {
  async add<T>(table: string, record: T): Promise<string> {
    const result = await (db.table(table) as any).add(record);
    if (supabase) {
      scheduleSync();
    }
    return result;
  },

  async update<T>(table: string, id: string, changes: Partial<T>): Promise<number> {
    const result = await (db.table(table) as any).update(id, changes);
    if (supabase) {
      scheduleSync();
    }
    return result;
  },

  async delete(table: string, id: string): Promise<void> {
    await (db.table(table) as any).delete(id);
    if (supabase) {
      scheduleSync();
    }
  },

  async bulkAdd<T>(table: string, records: T[]): Promise<string> {
    const result = await (db.table(table) as any).bulkAdd(records);
    if (supabase) {
      scheduleSync();
    }
    return result;
  },

  async bulkPut<T>(table: string, records: T[]): Promise<void> {
    await (db.table(table) as any).bulkPut(records);
    if (supabase) {
      scheduleSync();
    }
  },

  // Keep direct access to read operations (no sync needed)
  get: <T>(table: string, id: string) => (db.table(table) as any).get(id) as Promise<T | undefined>,
  getAll: <T>(table: string) => (db.table(table) as any).toArray() as Promise<T[]>,
  where: (table: string, index: string) => (db.table(table) as any).where(index),
  filter: (table: string, filterFn: (item: any) => boolean) => (db.table(table) as any).filter(filterFn),
};
