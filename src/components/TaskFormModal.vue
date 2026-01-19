<template>
  <dialog class="modal notes-modal" :open="open">
    <div class="modal-box notes-modal-box">
      <h3 class="notes-title">{{ title }}</h3>
      <form class="notes-form" @submit.prevent="save">
        <label class="notes-field">
          <span class="notes-label">Description</span>
          <textarea v-model="form.description" class="notes-textarea" />
        </label>
        <div class="notes-grid">
          <label class="notes-field">
            <span class="notes-label">Assignee</span>
            <select v-model="form.intervenant_id" class="notes-select">
              <option :value="null">Unassigned</option>
              <option v-for="person in intervenants" :key="person.id" :value="person.id">
                {{ person.name }}
              </option>
            </select>
          </label>
          <label class="notes-field">
            <span class="notes-label">Status</span>
            <select v-model="form.status" class="notes-select">
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </label>
        </div>
        <label class="notes-field">
          <span class="notes-label">Photo URL (optional)</span>
          <input v-model="photoUrl" class="notes-input" />
        </label>
        <div class="notes-actions">
          <button type="button" class="notes-button" @click="close">Cancel</button>
          <button class="notes-button notes-button-primary" type="submit">Save</button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop notes-backdrop" @click="close">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { db } from "../db";
import type { TaskStatus } from "../db/types";
import { useLiveQuery } from "../composables/useLiveQuery";
import { makeId, nowIso } from "../utils/time";

const props = defineProps<{
  open: boolean;
  projectId?: string | null;
  title: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);

const form = reactive<{
  description: string;
  status: TaskStatus;
  intervenant_id: string | null;
}>({
  description: "",
  status: "open",
  intervenant_id: null,
});

const photoUrl = ref("");

const reset = () => {
  form.description = "";
  form.status = "open";
  form.intervenant_id = null;
  photoUrl.value = "";
};

const close = () => {
  emit("close");
  reset();
};

const save = async () => {
  const timestamp = nowIso();
  const taskId = makeId();

  await db.tasks.add({
    id: taskId,
    project_id: props.projectId ?? null,
    description: form.description || null,
    status: form.status,
    intervenant_id: form.intervenant_id,
    audio_url: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });

  if (photoUrl.value.trim()) {
    await db.task_photos.add({
      id: makeId(),
      task_id: taskId,
      url: photoUrl.value.trim(),
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }

  close();
};
</script>

<style scoped>
.notes-modal {
  color: #f3f4f6;
}

.notes-modal-box {
  background: var(--notes-panel);
  border-radius: 18px;
  padding: 20px;
  box-shadow: none;
}

.notes-title {
  font-size: 20px;
  font-weight: 600;
}

.notes-form {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-label {
  font-size: 12px;
  color: var(--notes-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.notes-input,
.notes-textarea,
.notes-select {
  width: 100%;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--notes-text);
  font-size: 14px;
}

.notes-input::placeholder,
.notes-textarea::placeholder {
  color: var(--notes-muted);
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.notes-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.notes-button {
  background: var(--notes-panel-strong);
  border: none;
  color: var(--notes-text);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-backdrop {
  background: rgba(0, 0, 0, 0.6);
}
</style>
