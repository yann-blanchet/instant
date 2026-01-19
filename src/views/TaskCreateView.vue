<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="handleBack">
          ‹
        </button>
        <div>
          <h1 class="notes-title">Add Task</h1>
          <div class="notes-subtitle">
            {{ project ? project.name : "Quick task" }}
          </div>
        </div>
      </div>
    </header>

    <div class="notes-stack">
      <div class="notes-list notes-form">
        <div class="notes-grid">
          <label class="notes-field">
            <span class="notes-label">Status</span>
            <select v-model="form.status" class="notes-select">
              <option value="open">Open</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label class="notes-field">
            <span class="notes-label">Assignee</span>
            <select v-model="form.intervenant_id" class="notes-select">
              <option :value="null">Unassigned</option>
              <option v-for="person in intervenants" :key="person.id" :value="person.id">
                {{ person.name }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div ref="contentListRef" class="notes-list">
        <div v-if="taskItems.length === 0" class="notes-row notes-row-empty">
          Aucun contenu.
        </div>
        <div v-for="item in taskItemViews" :key="item.id" class="notes-item">
          <div v-if="item.type === 'text'" class="notes-item-text">
            {{ item.text }}
          </div>
          <img
            v-else
            class="notes-item-image"
            :src="item.imageUrl"
            alt="Draft item"
          />
        </div>
      </div>

    </div>

    <div class="notes-bottom-bar">
      <button class="notes-bottom-btn" type="button" aria-label="Text" @click="openTextSheet">
        <svg class="notes-bottom-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20h4l11-11a2.5 2.5 0 0 0-4-4L4 16v4z"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
          <path
            d="M13.5 6.5l4 4"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.8"
          />
        </svg>
      </button>
      <button class="notes-bottom-btn" type="button" aria-label="Image" @click="openImagePicker">
        <svg class="notes-bottom-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 7h2l1.2-2h5.6L16 7h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
          <circle
            cx="12"
            cy="12"
            r="3.3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          />
        </svg>
      </button>
      <button class="notes-bottom-send" type="button" aria-label="Send" @click="sendAndBack">
        <svg class="notes-send-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 12h14M15 6l4 6-4 6"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.8"
          />
        </svg>
      </button>
      <input
        ref="imageInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="notes-hidden-input"
        @change="handleImagePicked"
      />
    </div>

    <div v-if="isTextSheetOpen" class="notes-sheet-backdrop" @click="closeTextSheet">
      <div class="notes-sheet" @click.stop>
        <textarea
          ref="textAreaRef"
          v-model="textDraft"
          class="notes-sheet-textarea"
          rows="4"
          placeholder="Écrire un texte..."
        />
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeTextSheet">Cancel</button>
          <button
            class="notes-button notes-button-primary"
            type="button"
            aria-label="Send text"
            @click="sendText"
          >
            <svg class="notes-send-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h14M15 6l4 6-4 6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="isImageSheetOpen" class="notes-sheet-backdrop" @click="closeImageSheet">
      <div class="notes-sheet" @click.stop>
        <div class="notes-image-preview">
          <img v-if="imagePreviewUrl" :src="imagePreviewUrl" alt="Preview" />
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeImageSheet">Cancel</button>
          <button
            class="notes-button notes-button-primary"
            type="button"
            aria-label="Send image"
            @click="sendImage"
          >
            <svg class="notes-send-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h14M15 6l4 6-4 6"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { useRoute, useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { getNextVisitNumber } from "../db/visits";
import type { TaskItem, TaskStatus } from "../db/types";
import { makeId, nowIso } from "../utils/time";

const router = useRouter();
const route = useRoute();

const projectId = computed(() => {
  const id = route.params.id;
  if (typeof id === "string" && id.length > 0) return id;
  const queryId = route.query.projectId;
  return typeof queryId === "string" && queryId.length > 0 ? queryId : null;
});

const project = useLiveQuery(
  () => {
    if (!projectId.value) return null;
    return db.projects.get(projectId.value);
  },
  null,
);

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);

const form = reactive<{
  status: TaskStatus;
  intervenant_id: string | null;
}>({
  status: "open",
  intervenant_id: null,
});

const createdTaskId = ref<string | null>(null);
const taskItems = ref<TaskItem[]>([]);
let taskItemsSubscription: Subscription | null = null;
const taskItemViews = ref<
  Array<
    | { id: string; type: "text"; text: string }
    | { id: string; type: "image"; imageUrl: string }
  >
>([]);
const isTextSheetOpen = ref(false);
const isImageSheetOpen = ref(false);
const textDraft = ref("");
const imageFile = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const textAreaRef = ref<HTMLTextAreaElement | null>(null);
const contentListRef = ref<HTMLDivElement | null>(null);

const revokePreview = () => {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = null;
  }
};

watch(
  taskItems,
  (items) => {
    taskItemViews.value.forEach((item) => {
      if (item.type === "image") URL.revokeObjectURL(item.imageUrl);
    });
    taskItemViews.value = items.map((item) => {
      if (item.type === "image" && item.image_blob) {
        return {
          id: item.id,
          type: "image",
          imageUrl: URL.createObjectURL(item.image_blob),
        };
      }
      return {
        id: item.id,
        type: "text",
        text: item.text ?? "",
      };
    });
    nextTick(() => {
      if (contentListRef.value) {
        contentListRef.value.scrollTo({
          top: contentListRef.value.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  },
  { immediate: true },
);

const subscribeTaskItems = (taskId: string | null) => {
  taskItemsSubscription?.unsubscribe();
  taskItems.value = [];
  if (!taskId) return;
  taskItemsSubscription = liveQuery(() =>
    db.task_items.where("task_id").equals(taskId).sortBy("created_at"),
  ).subscribe({
    next: (items) => {
      taskItems.value = items;
    },
    error: (error) => {
      console.error("LiveQuery error", error);
    },
  });
};

watch(
  createdTaskId,
  (taskId) => {
    subscribeTaskItems(taskId);
  },
  { immediate: true },
);

const ensureTask = async () => {
  if (createdTaskId.value) return createdTaskId.value;
  const taskId = makeId();
  const timestamp = nowIso();
  await db.tasks.add({
    id: taskId,
    project_id: projectId.value,
    status: form.status,
    intervenant_id: form.intervenant_id,
    audio_url: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  createdTaskId.value = taskId;
  return taskId;
};

watch(
  () => [form.status, form.intervenant_id],
  async () => {
    if (!createdTaskId.value) {
      const hasChanges = form.status !== "open" || form.intervenant_id !== null;
      if (!hasChanges) return;
      await ensureTask();
      return;
    }
    await db.tasks.update(createdTaskId.value, {
      status: form.status,
      intervenant_id: form.intervenant_id,
      updated_at: nowIso(),
    });
  },
);

const openTextSheet = async () => {
  isTextSheetOpen.value = true;
  await nextTick();
  textAreaRef.value?.focus();
};

const closeTextSheet = () => {
  isTextSheetOpen.value = false;
  textDraft.value = "";
};

const ensureOngoingVisit = async () => {
  if (!projectId.value) return null;
  const existing = await db.visits
    .filter((visit) => visit.project_id === projectId.value && !visit.ended_at)
    .first();
  if (existing) return existing.id;

  const timestamp = nowIso();
  const visitNumber = await getNextVisitNumber(projectId.value);
  const visitId = makeId();
  await db.visits.add({
    id: visitId,
    project_id: projectId.value,
    date: new Date().toISOString().slice(0, 10),
    comment: "",
    visit_number: visitNumber,
    ended_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  return visitId;
};

const sendText = async () => {
  if (!textDraft.value.trim()) return;
  await ensureOngoingVisit();
  const taskId = await ensureTask();
  await db.task_items.add({
    id: makeId(),
    task_id: taskId,
    type: "text",
    text: textDraft.value.trim(),
    image_blob: null,
    created_at: nowIso(),
  });
  closeTextSheet();
};

const openImagePicker = () => {
  imageInput.value?.click();
};

const handleImagePicked = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  imageFile.value = file;
  revokePreview();
  imagePreviewUrl.value = URL.createObjectURL(file);
  isImageSheetOpen.value = true;
  input.value = "";
};

const closeImageSheet = () => {
  isImageSheetOpen.value = false;
  imageFile.value = null;
  revokePreview();
};

const sendImage = async () => {
  if (!imageFile.value) return;
  await ensureOngoingVisit();
  const taskId = await ensureTask();
  await db.task_items.add({
    id: makeId(),
    task_id: taskId,
    type: "image",
    text: null,
    image_blob: imageFile.value,
    created_at: nowIso(),
  });
  closeImageSheet();
};

const sendAndBack = async () => {
  await ensureOngoingVisit();
  await ensureTask();
  handleBack();
};

const handleBack = () => {
  if (projectId.value) {
    router.push(`/projects/${projectId.value}`);
    return;
  }
  router.push("/");
};

onBeforeUnmount(() => {
  taskItemViews.value.forEach((item) => {
    if (item.type === "image") URL.revokeObjectURL(item.imageUrl);
  });
  revokePreview();
  taskItemsSubscription?.unsubscribe();
});
</script>

<style scoped>
.notes-screen {
  min-height: 100vh;
  background: var(--notes-bg);
  color: var(--notes-text);
  padding: 28px 20px 96px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.notes-header-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.notes-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.notes-subtitle {
  color: var(--notes-muted);
  font-size: 14px;
  margin-top: 4px;
}

.notes-back {
  border: none;
  background: transparent;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  padding: 2px 6px;
}

.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  margin-top: 4px;
}

.notes-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notes-list {
  background: var(--notes-panel);
  border-radius: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-form {
  gap: 16px;
}

.notes-row-empty {
  color: var(--notes-muted);
  font-size: 14px;
}

.notes-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-label {
  font-size: 13px;
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

.notes-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.notes-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--notes-border);
}

.notes-item:last-child {
  border-bottom: none;
}

.notes-item-text {
  white-space: pre-wrap;
  color: var(--notes-text);
  font-size: 14px;
}

.notes-item-image {
  width: 100%;
  border-radius: 12px;
  display: block;
}

.notes-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  border-top: none;
  padding: 12px 20px;
  display: flex;
  gap: 12px;
  justify-content: space-evenly;
}

.notes-bottom-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--notes-accent);
  padding: 0;
  border-radius: 999px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notes-bottom-send {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--notes-accent);
  padding: 0;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notes-bottom-icon {
  width: 22px;
  height: 22px;
}

.notes-send-icon {
  width: 18px;
  height: 18px;
}


.notes-hidden-input {
  display: none;
}

.notes-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 12px 12px;
  z-index: 50;
}

.notes-sheet {
  width: 100%;
  max-width: none;
  background: var(--notes-panel);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notes-sheet-textarea {
  width: 100%;
  min-height: 120px;
  background: var(--notes-panel-strong);
  border: 1px solid var(--notes-panel-strong);
  border-radius: 12px;
  padding: 12px;
  color: var(--notes-text);
  font-size: 14px;
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.notes-image-preview {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--notes-panel-strong);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notes-image-preview img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
