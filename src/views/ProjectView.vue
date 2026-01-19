<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.back()">
          ‹
        </button>
        <div>
          <h1 class="notes-title">{{ project?.name ?? "Projet" }}</h1>
          <div class="notes-subtitle">{{ project?.address }}</div>
        </div>
      </div>
      <button
        class="notes-action"
        type="button"
        aria-label="Actions"
        @click="isActionsSheetOpen = true"
      >
        ⋯
      </button>
    </header>

    <div class="notes-list">
      <div v-if="!ongoingVisit" class="notes-row notes-row-empty">
        Aucune visite en cours.
      </div>
      <router-link
        v-else
        class="notes-row"
        :to="`/visits/${ongoingVisit.id}`"
      >
        <div class="notes-row-left">
          <span class="notes-folder">📁</span>
          <div class="notes-row-text">
          <div class="notes-row-title">
            Visite {{ formatVisitNumber(ongoingVisit.visit_number) }}
          </div>
          <div class="notes-row-subtitle">
            {{ ongoingVisit.date }} · {{ ongoingVisit.comment || "Visite en cours" }}
          </div>
          </div>
        </div>
        <div class="notes-row-right">
          <span class="notes-tag">En cours</span>
          <span class="notes-chevron">›</span>
        </div>
      </router-link>
    </div>

    <div v-if="!ongoingVisit" class="notes-cta">
      <button class="notes-button notes-button-primary" type="button" @click="startVisit">
        Démarrer une visite
      </button>
    </div>

    <div class="notes-tabs notes-tabs-small">
      <button
        class="notes-tab"
        :class="{ active: activeTaskTab === 'open' }"
        type="button"
        @click="activeTaskTab = 'open'"
      >
        <span>Open</span>
        <span class="notes-tab-count">{{ taskGroups.open.length }}</span>
      </button>
      <button
        class="notes-tab"
        :class="{ active: activeTaskTab === 'done' }"
        type="button"
        @click="activeTaskTab = 'done'"
      >
        <span>Done</span>
        <span class="notes-tab-count">{{ taskGroups.done.length }}</span>
      </button>
    </div>

    <div class="notes-list">
      <div v-if="activeTaskGroup.items.length === 0" class="notes-row notes-row-empty">
        Aucune tâche.
      </div>
      <div
        v-for="task in activeTaskGroup.items"
        :key="task.id"
        class="notes-row notes-task-row"
      >
        <div class="notes-row-text">
          <div
            v-if="taskContentMap[task.id]?.observations?.length"
            class="notes-observations"
          >
            <div
              v-for="(text, index) in taskContentMap[task.id].observations"
              :key="`${task.id}-obs-${index}`"
              class="notes-row-subtitle"
            >
              {{ text }}
            </div>
          </div>

          <div
            v-if="taskContentMap[task.id]?.photos?.length"
            class="notes-photo-grid"
          >
            <img
              v-for="(url, index) in taskContentMap[task.id].photos"
              :key="`${task.id}-photo-${index}`"
              class="notes-content-image"
              :src="url"
              alt="Task photo"
              @click.stop="openImageModal(url)"
            />
          </div>

          <div
            v-if="
              !taskContentMap[task.id]?.observations?.length &&
              !taskContentMap[task.id]?.photos?.length
            "
            class="notes-row-subtitle"
          >
            Aucun contenu.
          </div>
        </div>
        <div class="notes-task-footer">
          <span class="notes-row-meta">{{ formatRelativeTime(task.updated_at) }}</span>
          <button
            class="notes-status"
            type="button"
            @click.stop.prevent="toggleTaskStatus(task)"
          >
            {{ task.status === "done" ? "Done" : "Open" }}
          </button>
        </div>
      </div>
    </div>

    <button
      class="notes-fab"
      type="button"
      aria-label="Add task"
      @click="router.push(`/projects/${props.id}/tasks/new`)"
    >
      +
    </button>

    <ImageModal
      :open="isImageModalOpen"
      :src="selectedImageUrl"
      alt="Task image"
      @close="closeImageModal"
    />

    <div
      v-if="isActionsSheetOpen"
      class="notes-sheet-backdrop"
      @click="isActionsSheetOpen = false"
    >
      <div class="notes-sheet notes-actions-sheet" @click.stop>
        <button class="notes-sheet-row" type="button" @click="handleExportReport">
          Export report (PDF)
        </button>
        <button class="notes-sheet-row" type="button" @click="showPastVisits">
          View past visits
        </button>
        <button
          class="notes-sheet-row notes-sheet-cancel"
          type="button"
          @click="isActionsSheetOpen = false"
        >
          Cancel
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { getNextVisitNumber } from "../db/visits";
import ImageModal from "../components/ImageModal.vue";
import type { Task, TaskPhoto } from "../db/types";
import { formatRelativeTime, formatVisitNumber } from "../utils/format";
import { makeId, nowIso, todayIso } from "../utils/time";

const props = defineProps<{ id: string }>();
const router = useRouter();
const activeTaskTab = ref<"open" | "done">("open");
const isActionsSheetOpen = ref(false);
const isImageModalOpen = ref(false);
const selectedImageUrl = ref<string | null>(null);

const project = useLiveQuery(
  () => db.projects.get(props.id),
  undefined,
);

const tasks = useLiveQuery(
  () =>
    db.tasks
      .filter((task) => !task.deleted_at && task.project_id === props.id)
      .toArray(),
  [] as Task[],
);

const taskPhotos = useLiveQuery(
  async () => {
    const taskIds = await db.tasks
      .filter((task) => !task.deleted_at && task.project_id === props.id)
      .primaryKeys();
    if (taskIds.length === 0) return [] as TaskPhoto[];
    return db.task_photos
      .filter((photo) => taskIds.includes(photo.task_id))
      .toArray();
  },
  [] as TaskPhoto[],
);

const visits = useLiveQuery(
  () =>
    db.visits
      .filter((visit) => !visit.deleted_at && visit.project_id === props.id)
      .toArray(),
  [],
);

const ongoingVisit = computed(
  () => visits.value.find((visit) => !visit.ended_at) ?? null,
);


const taskGroups = computed(() => {
  const grouped = {
    open: [] as Task[],
    done: [] as Task[],
  };
  tasks.value.forEach((task) => {
    if (task.status === "done") {
      grouped.done.push(task);
    } else {
      grouped.open.push(task);
    }
  });
  return grouped;
});

const activeTaskGroup = computed(() => {
  const items = taskGroups.value[activeTaskTab.value] ?? [];
  const labelMap = {
    open: "Open",
    done: "Done",
  };
  return { label: labelMap[activeTaskTab.value], items };
});

const taskContentMap = ref<
  Record<string, { observations: string[]; photos: string[] }>
>({});

const revokeTaskContentUrls = () => {
  Object.values(taskContentMap.value).forEach((entry) => {
    entry.photos.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  });
};

watch(
  [taskPhotos, tasks],
  ([photos, taskList]) => {
    revokeTaskContentUrls();
    const map: Record<string, { observations: string[]; photos: string[] }> = {};
    const photosByTask = new Map<string, TaskPhoto[]>();
    photos.forEach((photo) => {
      const group = photosByTask.get(photo.task_id) ?? [];
      group.push(photo);
      photosByTask.set(photo.task_id, group);
    });

    taskList.forEach((task) => {
      const entry = map[task.id] ?? { observations: [], photos: [] };
      entry.observations = [...(task.observations ?? [])];

      const taskPhotosList = photosByTask.get(task.id) ?? [];
      const photosById = new Map(taskPhotosList.map((photo) => [photo.id, photo]));
      const orderedPhotoIds = task.photo_ids ?? [];
      const photoUrls: string[] = [];
      orderedPhotoIds.forEach((photoId) => {
        const photo = photosById.get(photoId);
        if (photo?.image_blob) {
          photoUrls.push(URL.createObjectURL(photo.image_blob));
        } else if (photo?.url) {
          photoUrls.push(photo.url);
        }
      });
      entry.photos = photoUrls;

      map[task.id] = entry;
    });
    taskContentMap.value = map;
  },
  { immediate: true },
);


const exportPdf = () => {
  alert("PDF export is ready for implementation. Use print for now.");
  window.print();
};

const handleExportReport = () => {
  isActionsSheetOpen.value = false;
  exportPdf();
};

const showPastVisits = () => {
  isActionsSheetOpen.value = false;
  router.push(`/projects/${props.id}/visits`);
};

const startVisit = async () => {
  if (ongoingVisit.value) {
    router.push(`/visits/${ongoingVisit.value.id}`);
    return;
  }
  const timestamp = nowIso();
  const visitNumber = await getNextVisitNumber(props.id);
  const visitId = makeId();
  await db.visits.add({
    id: visitId,
    project_id: props.id,
    date: todayIso(),
    comment: "",
    visit_number: visitNumber,
    ended_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  router.push(`/visits/${visitId}`);
};

const openImageModal = (url: string) => {
  selectedImageUrl.value = url;
  isImageModalOpen.value = true;
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  selectedImageUrl.value = null;
};

onBeforeUnmount(() => {
  revokeTaskContentUrls();
});

const toggleTaskStatus = async (task: Task) => {
  const nextStatus = task.status === "done" ? "open" : "done";
  await db.tasks.update(task.id, {
    status: nextStatus,
    updated_at: nowIso(),
  });
};
</script>

<style scoped>
.notes-screen {
  min-height: 100vh;
  background: var(--notes-bg);
  color: var(--notes-text);
  padding: 28px 20px 36px;
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

.notes-back {
  border: none;
  background: transparent;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  padding: 2px 6px;
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

.notes-action {
  color: var(--notes-accent);
  font-weight: 700;
  font-size: 28px;
  line-height: 1;
  padding: 2px 8px;
  background: transparent;
  border: none;
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

.notes-plus {
  border: none;
  background: var(--notes-panel);
  color: var(--notes-accent);
  width: 28px;
  height: 28px;
  border-radius: 999px;
  font-size: 20px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notes-fab {
  position: fixed;
  right: 24px;
  bottom: 28px;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
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
  padding: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notes-actions-sheet {
  background: #000;
}

.notes-sheet-row {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border: none;
  padding: 14px;
  border-radius: 12px;
  text-align: left;
  font-weight: 600;
}

.notes-sheet-cancel {
  background: transparent;
  color: var(--notes-accent);
  text-align: center;
}

.notes-list {
  background: var(--notes-panel);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notes-list .notes-task-row + .notes-task-row {
  margin-top: 8px;
  border-top: none;
  box-shadow: 0 -8px 0 0 #000;
}

.notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  color: inherit;
  background: transparent;
  border: none;
  text-align: left;
  gap: 16px;
}

.notes-task-row {
  flex-direction: column;
  align-items: stretch;
}

.notes-row + .notes-row {
  border-top: 1px solid var(--notes-border);
}

.notes-row:hover {
  background: var(--notes-hover);
}

.notes-row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.notes-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--notes-muted);
  font-size: 14px;
  flex-shrink: 0;
}

.notes-folder {
  font-size: 20px;
}

.notes-chevron {
  font-size: 18px;
}

.notes-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notes-row-title {
  font-weight: 600;
}

.notes-row-subtitle {
  font-size: 12px;
  color: var(--notes-text);
}

.notes-row-meta {
  font-size: 11px;
  color: var(--notes-muted);
}

.notes-task-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--notes-border);
  padding-top: 8px;
}

.notes-observations {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.notes-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.notes-content-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
}

.notes-row-empty {
  color: var(--notes-muted);
}

.notes-row-stack {
  align-items: flex-start;
}

.notes-tabs {
  display: flex;
  gap: 8px;
  background: var(--notes-panel);
  padding: 6px;
  border-radius: 14px;
}

.notes-tabs-small {
  width: 100%;
}

.notes-tab {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--notes-muted);
  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 600;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
}

.notes-tab.active {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
}

.notes-tab-count {
  font-size: 12px;
  color: var(--notes-muted);
  font-weight: 500;
}

.notes-tab.active .notes-tab-count {
  color: var(--notes-text);
}

.notes-pill {
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  font-size: 12px;
}

.notes-pill-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-tag {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
}

.notes-status {
  border: none;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
}

.notes-status:hover {
  background: var(--notes-hover);
}

.notes-cta {
  display: flex;
  justify-content: flex-start;
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
</style>
