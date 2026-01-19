<template>
  <section class="notes-screen notes-bottom-sheet">
    <div class="notes-sheet-handle" aria-hidden="true"></div>
    <header class="notes-header">
      <div class="notes-header-left">
        <div>
          <h1 class="notes-title">{{ headerTitle }}</h1>
          <div class="notes-subtitle">
            {{ project ? project.name : "Quick task" }}
          </div>
        </div>
      </div>
      <div class="notes-header-right">
        <button
          class="notes-assignee-button"
          type="button"
          @click="isAssigneeSheetOpen = true"
        >
          {{ assigneeLabel }}
        </button>
      </div>
    </header>

    <div class="notes-stack">
      <div class="notes-list">
        <div class="notes-section-header">
          <div class="notes-section-label">Observations</div>
          <button
            class="notes-section-action"
            type="button"
            aria-label="Add observation"
            @click="openTextSheet"
          >
            +
          </button>
        </div>
        <div v-if="!taskRecord?.observations?.length" class="notes-row notes-row-empty">
          Aucune observation.
        </div>
        <div v-else class="notes-observation-list">
          <div
            v-for="(text, index) in taskRecord.observations"
            :key="`obs-${index}`"
            class="notes-item-text"
          >
            {{ text }}
          </div>
        </div>
      </div>

      <div class="notes-list">
        <div class="notes-section-header">
          <div class="notes-section-label">Photos</div>
          <button
            class="notes-section-action"
            type="button"
            aria-label="Add photo"
            @click="openImagePicker"
          >
            +
          </button>
        </div>
        <div v-if="photoPreviewUrls.length === 0" class="notes-row notes-row-empty">
          Aucune photo.
        </div>
        <div v-else class="notes-photo-grid">
          <img
            v-for="(url, index) in photoPreviewUrls"
            :key="`photo-${index}`"
            class="notes-photo"
            :src="url"
            alt="Task photo"
          />
        </div>
      </div>

    </div>

    <div class="notes-bottom-bar">
      <button class="notes-bottom-cancel" type="button" @click="handleBack">Cancel</button>
      <button class="notes-bottom-save" type="button" @click="sendAndBack">Save</button>
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

    <div
      v-if="isAssigneeSheetOpen"
      class="notes-sheet-backdrop"
      @click="isAssigneeSheetOpen = false"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-title">Assignee</div>
        <button
          class="notes-sheet-row"
          type="button"
          @click="selectAssignee(null)"
        >
          Unassigned
        </button>
        <button
          v-for="person in intervenants"
          :key="person.id"
          class="notes-sheet-row"
          type="button"
          @click="selectAssignee(person.id)"
        >
          {{ person.name }}
        </button>
        <button
          class="notes-sheet-row notes-sheet-cancel"
          type="button"
          @click="isAssigneeSheetOpen = false"
        >
          Cancel
        </button>
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
import type { Task, TaskPhoto } from "../db/types";
import { makeId, nowIso } from "../utils/time";

const router = useRouter();
const route = useRoute();

const editingTaskId = computed(() => {
  const id = route.params.taskId;
  return typeof id === "string" && id.length > 0 ? id : null;
});

const projectId = computed(() => {
  const id = route.params.id;
  if (typeof id === "string" && id.length > 0) return id;
  const queryId = route.query.projectId;
  if (typeof queryId === "string" && queryId.length > 0) return queryId;
  return taskRecord.value?.project_id ?? null;
});

const project = useLiveQuery(
  () => {
    if (!projectId.value) return null;
    return db.projects.get(projectId.value);
  },
  null,
);

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const isAssigneeSheetOpen = ref(false);
const headerTitle = computed(() => (editingTaskId.value ? "Edit Task" : "Add Task"));

const form = reactive<{
  intervenant_id: string | null;
}>({
  intervenant_id: null,
});

const assigneeLabel = computed(() => {
  if (!form.intervenant_id) return "Unassigned";
  return (
    intervenants.value.find((person) => person.id === form.intervenant_id)?.name ??
    "Unassigned"
  );
});

const selectAssignee = (id: string | null) => {
  form.intervenant_id = id;
  isAssigneeSheetOpen.value = false;
};

const createdTaskId = ref<string | null>(null);
const taskRecord = ref<Task | null>(null);
const taskPhotos = ref<TaskPhoto[]>([]);
let taskItemsSubscription: Subscription | null = null;
const taskItemViews = ref<
  Array<
    | { id: string; type: "text"; text: string }
    | { id: string; type: "image"; imageUrl: string }
  >
>([]);
const photoPreviewUrls = ref<string[]>([]);
const isTextSheetOpen = ref(false);
const isImageSheetOpen = ref(false);
const textDraft = ref("");
const imageFile = ref<File | null>(null);
const imagePreviewUrl = ref<string | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const textAreaRef = ref<HTMLTextAreaElement | null>(null);
const contentListRef = ref<HTMLDivElement | null>(null);

const hasContent = computed(() => {
  const observationsCount = taskRecord.value?.observations?.length ?? 0;
  const photoCount = taskRecord.value?.photo_ids?.length ?? 0;
  return observationsCount + photoCount > 0;
});

const revokePreview = () => {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = null;
  }
};

const revokePhotoUrls = (urls: string[]) => {
  urls.forEach((url) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
};

watch(
  [taskPhotos, taskRecord],
  ([photos, task]) => {
    taskItemViews.value.forEach((item) => {
      if (item.type === "image") URL.revokeObjectURL(item.imageUrl);
    });

    const nextViews: Array<
      | { id: string; type: "text"; text: string }
      | { id: string; type: "image"; imageUrl: string }
    > = [];

    (task?.observations ?? []).forEach((text, index) => {
      nextViews.push({
        id: `${task?.id ?? "task"}-obs-${index}`,
        type: "text",
        text,
      });
    });

    revokePhotoUrls(photoPreviewUrls.value);
    const photosById = new Map(photos.map((photo) => [photo.id, photo]));
    const orderedPhotoIds = task?.photo_ids ?? [];
    const nextPhotoUrls: string[] = [];
    orderedPhotoIds.forEach((photoId) => {
      const photo = photosById.get(photoId);
      if (photo?.image_blob) {
        const url = URL.createObjectURL(photo.image_blob);
        nextViews.push({
          id: photoId,
          type: "image",
          imageUrl: url,
        });
        nextPhotoUrls.push(url);
      } else if (photo?.url) {
        nextViews.push({
          id: photoId,
          type: "image",
          imageUrl: photo.url,
        });
        nextPhotoUrls.push(photo.url);
      }
    });
    photoPreviewUrls.value = nextPhotoUrls;

    const remainingPhotos = photos.filter((photo) => !orderedPhotoIds.includes(photo.id));
    remainingPhotos
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((photo) => {
        if (photo.image_blob) {
          nextViews.push({
            id: photo.id,
            type: "image",
            imageUrl: URL.createObjectURL(photo.image_blob),
          });
        } else if (photo.url) {
          nextViews.push({
            id: photo.id,
            type: "image",
            imageUrl: photo.url,
          });
        }
      });

    taskItemViews.value = nextViews;
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
  taskRecord.value = null;
  taskPhotos.value = [];
  if (!taskId) return;
  taskItemsSubscription = liveQuery(async () => {
    const [task, photos] = await Promise.all([
      db.tasks.get(taskId),
      db.task_photos.where("task_id").equals(taskId).toArray(),
    ]);
    return { task: task ?? null, photos };
  }).subscribe({
    next: ({ task, photos }) => {
      taskRecord.value = task;
      taskPhotos.value = photos;
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

watch(
  editingTaskId,
  (taskId) => {
    if (taskId) {
      createdTaskId.value = taskId;
    }
  },
  { immediate: true },
);

watch(
  () => taskRecord.value?.intervenant_id,
  (id) => {
    if (editingTaskId.value) {
      form.intervenant_id = id ?? null;
    }
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
    status: "open",
    intervenant_id: form.intervenant_id,
    audio_url: null,
    photo_ids: [],
    observations: [],
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  createdTaskId.value = taskId;
  return taskId;
};

watch(
  () => form.intervenant_id,
  async () => {
    if (!createdTaskId.value) {
      if (form.intervenant_id == null || !hasContent.value) return;
      await ensureTask();
      return;
    }
    await db.tasks.update(createdTaskId.value, {
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
  const task = await db.tasks.get(taskId);
  const nextObservations = [...(task?.observations ?? []), textDraft.value.trim()];
  await db.tasks.update(taskId, {
    observations: nextObservations,
    updated_at: nowIso(),
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
  const timestamp = nowIso();
  const photoId = makeId();
  await db.task_photos.add({
    id: photoId,
    task_id: taskId,
    url: null,
    image_blob: imageFile.value,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  const task = await db.tasks.get(taskId);
  const nextPhotoIds = [...(task?.photo_ids ?? []), photoId];
  await db.tasks.update(taskId, { photo_ids: nextPhotoIds, updated_at: timestamp });
  closeImageSheet();
};

const sendAndBack = async () => {
  if (!hasContent.value) {
    handleBack();
    return;
  }
  await ensureOngoingVisit();
  handleBack();
};

const handleBack = () => {
  const targetProjectId = projectId.value ?? taskRecord.value?.project_id ?? null;
  if (targetProjectId) {
    router.push(`/projects/${targetProjectId}`);
    return;
  }
  router.push("/");
};

onBeforeUnmount(() => {
  taskItemViews.value.forEach((item) => {
    if (item.type === "image") URL.revokeObjectURL(item.imageUrl);
  });
  revokePhotoUrls(photoPreviewUrls.value);
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

.notes-bottom-sheet {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.45);
  padding-bottom: calc(96px + env(safe-area-inset-bottom));
}

.notes-sheet-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: var(--notes-border);
  margin: 10px auto 6px;
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

.notes-header-right {
  display: flex;
  align-items: flex-start;
}

.notes-assignee-button {
  border: 1px solid var(--notes-border);
  background: var(--notes-panel);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
  min-width: 140px;
  text-align: left;
}

.notes-assignee-button:hover {
  background: var(--notes-hover);
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

.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-section-action {
  border: 2px solid var(--notes-border);
  background: transparent;
  color: var(--notes-accent);
  border-radius: 999px;
  width: 40px;
  height: 40px;
  font-size: 26px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notes-section-action:hover {
  background: var(--notes-hover);
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

.notes-observation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notes-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.notes-photo {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
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
  justify-content: space-between;
}

.notes-bottom-cancel,
.notes-bottom-save {
  flex: 1;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
}

.notes-bottom-cancel {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
}

.notes-bottom-save {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
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
