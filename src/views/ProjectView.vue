<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.push('/')">
          ‹
        </button>
        <div>
          <h1 class="notes-title">{{ project?.name ?? "Projet" }}</h1>
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

    <div v-if="ongoingVisit" class="notes-list">
      <div class="notes-row notes-visit-row">
        <div class="notes-row-left">
          <div class="notes-row-title">
            Visite {{ formatVisitNumber(ongoingVisit.visit_number) }} · {{ formatDate(ongoingVisit.date) }}
          </div>
        </div>
        <div class="notes-row-right">
          <button
            class="notes-end-visit-button"
            type="button"
            @click.stop="router.push(`/visits/${ongoingVisit.id}`)"
          >
            Terminer la visite
          </button>
        </div>
      </div>
    </div>

    <div v-if="!ongoingVisit" class="notes-cta notes-cta-empty">
      <div class="notes-row-title">Pas de visite en cours</div>
      <div class="notes-row-subtitle">Ajouter une observation pour commencer la visite</div>
    </div>

    <ProjectObservationsList
      :project-id="props.id"
      :tasks="tasks"
      :task-photos="taskPhotos"
      :visits="visits"
      :intervenants="intervenants"
      :categories="categories"
      :task-content-map="taskContentMap"
      status="open"
      @task-click="openTask"
      @image-click="openImageModal"
      @add-text="handleAddTextToTask"
      @add-photo="handleAddPhotoToTask"
      @edit-photo="handleEditPhoto"
      @manage-photos="handleManagePhotos"
      @manage-observations="handleManageObservations"
      @assign-intervenant="handleAssignIntervenant"
      @task-menu-click="openTaskActionsSheet"
      @mark-as-done="handleMarkAsDone"
      @delete-task="handleDeleteTask"
      @filter-mode-change="handleFilterModeChange"
    />

    <div v-if="currentFilterMode !== 'summary'" class="notes-bottom-bar">
      <button class="notes-bottom-icon" type="button" @click="openAddTaskWithText" aria-label="Add text observation">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </button>
      <button class="notes-bottom-icon" type="button" @click="openAddTaskWithImage" aria-label="Add image observation">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
    </div>

    <ImagePicker
      ref="imagePickerRef"
      @image-selected="handleImageSelected"
      @cancel="handleImageCancel"
    />

    <div
      v-if="isTaskActionsSheetOpen"
      class="notes-sheet-backdrop"
      @click="closeTaskActionsSheet"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-list notes-task-actions-list">
          <button
            v-if="taskActionsTask?.intervenant_id"
            class="notes-sheet-row"
            type="button"
            @click="handleTaskActionReassign"
          >
            Reassign
          </button>
          <button
            v-else
            class="notes-sheet-row"
            type="button"
            @click="handleTaskActionAssign"
          >
            Assign
          </button>
          <button
            v-if="taskActionsTask?.intervenant_id"
            class="notes-sheet-row"
            type="button"
            @click="handleTaskActionUnassign"
          >
            Unassign
          </button>
          <button
            v-if="taskActionsTask?.intervenant_id && taskActionsTask?.status === 'open'"
            class="notes-sheet-row"
            type="button"
            @click="handleTaskActionToggleStatus"
          >
            Mark as done
          </button>
          <button
            v-if="taskActionsTask?.status === 'done'"
            class="notes-sheet-row"
            type="button"
            @click="handleTaskActionToggleStatus"
          >
            Mark as open
          </button>
          <button
            class="notes-sheet-row notes-sheet-row-danger"
            type="button"
            @click="handleTaskActionDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <ImageModal
      :open="isImageModalOpen"
      :src="selectedImageUrl"
      alt="Task image"
      @close="closeImageModal"
    />

    <!-- Toast notification -->
    <div v-if="toastMessage" class="notes-toast">
      {{ toastMessage }}
    </div>

    <!-- Delete confirmation sheet -->
    <div
      v-if="isDeleteConfirmSheetOpen"
      class="notes-sheet-backdrop"
      @click="closeDeleteConfirmSheet"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-header">
          <h3 class="notes-sheet-title">Delete task</h3>
          <button
            class="notes-sheet-close"
            type="button"
            aria-label="Close"
            @click="closeDeleteConfirmSheet"
          >
            ✕
          </button>
        </div>
        <div class="notes-delete-confirm-content">
          <p v-if="deletingTask?.intervenant_id" class="notes-delete-confirm-message">
            This task is assigned to <strong>{{ getTaskAssigneeName(deletingTask) }}</strong>. Are you sure you want to delete it?
          </p>
          <p v-else class="notes-delete-confirm-message">
            Are you sure you want to delete this task?
          </p>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeDeleteConfirmSheet">
            Cancel
          </button>
          <button
            class="notes-button notes-button-danger"
            type="button"
            @click="confirmDeleteTask"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isActionsSheetOpen"
      class="notes-sheet-backdrop"
      @click="isActionsSheetOpen = false"
    >
      <div class="notes-sheet notes-actions-sheet" @click.stop>
        <button class="notes-sheet-row" type="button" @click="openEditProject">
          Edit project
        </button>
        <button class="notes-sheet-row" type="button" @click="openProjectIntervenants">
          Intervenants
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

    <ProjectFormSheet
      :open="isEditProjectSheetOpen"
      title="Edit project"
      :name="project?.name ?? ''"
      :address="project?.address ?? ''"
      @close="closeEditProject"
      @save="saveEditProject"
    />

    <div
      v-if="isProjectIntervenantsSheetOpen"
      class="notes-sheet-backdrop"
      @click="closeProjectIntervenants"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-title">Project intervenants</div>
        <div class="notes-list notes-form">
          <div class="notes-field">
            <span class="notes-label">Intervenants</span>
            <div class="notes-category-badges">
              <button
                v-for="intervenant in intervenants"
                :key="intervenant.id"
                class="notes-category-badge"
                :class="{
                  active: projectIntervenantIds.includes(intervenant.id),
                }"
                type="button"
                @click="toggleProjectIntervenant(intervenant.id)"
              >
                {{ intervenant.name }}
              </button>
            </div>
          </div>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeProjectIntervenants">
            Cancel
          </button>
          <button
            class="notes-button notes-button-primary"
            type="button"
            @click="saveProjectIntervenants"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="isAssignSheetOpen"
      class="notes-sheet-backdrop"
      @click="closeAssignSheet"
    >
      <div class="notes-sheet" @click.stop>
        <div class="notes-sheet-title">Assign task</div>
        <div class="notes-list">
          <button
            class="notes-sheet-row"
            type="button"
            :class="{ active: !assigningTask?.intervenant_id }"
            @click="assignTaskToIntervenant(null)"
          >
            Générale
          </button>
          <button
            v-for="intervenant in projectIntervenantsList"
            :key="intervenant.id"
            class="notes-sheet-row"
            :class="{ active: assigningTask?.intervenant_id === intervenant.id }"
            type="button"
            @click="assignTaskToIntervenant(intervenant.id)"
          >
            {{ intervenant.name }}
          </button>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeAssignSheet">
            Cancel
          </button>
        </div>
      </div>
    </div>

    <TextSheet
      v-model="isTextSheetOpen"
      :initial-text="editingObservationText"
      @send="handleTextSend"
      @close="closeTextSheet"
    />

    <PhotoEditorModal
      :is-active="isPhotoEditorOpen"
      :image-field="{ value: photoEditorSource }"
      :show-save="true"
      @close="closePhotoEditor"
      @update-image="handlePhotoUpdated"
      @send-image="handlePhotoEdited"
      @delete="handleDeletePhoto"
    />

    <ObservationsSheet
      v-model="isObservationsSheetOpen"
      :observations="managingTaskObservations"
      @close="closeObservationsSheet"
      @edit="handleEditObservation"
      @delete="handleDeleteObservation"
      @add="handleAddObservation"
    />

    <PhotosSheet
      v-model="isPhotosSheetOpen"
      :photos="managingTaskPhotos"
      @close="closePhotosSheet"
      @edit="handleEditPhotoFromSheet"
      @delete="handleDeletePhotoFromSheet"
      @add="handleAddPhotoToSheet"
      @view="handleViewPhotoFromSheet"
    />

    <IntervenantAssignSheet
      v-model="isIntervenantAssignSheetOpen"
      :intervenants="projectIntervenantsList"
      :categories="categories"
      :current-intervenant-id="assigningTaskId?.intervenant_id"
      @close="closeIntervenantAssignSheet"
      @assign="handleAssignIntervenantToTask"
      @create-generale="handleCreateGeneraleIntervenant"
      @create-me="handleCreateMeIntervenant"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { getNextVisitNumber } from "../db/visits";
import ImageModal from "../components/ImageModal.vue";
import ImagePicker from "../components/ImagePicker.vue";
import IntervenantAssignSheet from "../components/IntervenantAssignSheet.vue";
import ObservationsSheet from "../components/ObservationsSheet.vue";
import PhotosSheet from "../components/PhotosSheet.vue";
import PhotoEditorModal from "../components/PhotoEditorModal.vue";
import ProjectFormSheet from "../components/ProjectFormSheet.vue";
import ProjectObservationsList from "../components/ProjectObservationsList.vue";
import TextSheet from "../components/TextSheet.vue";
import type { Category, Intervenant, Task, TaskPhoto } from "../db/types";
import { formatDate, formatRelativeTime, formatVisitNumber } from "../utils/format";
import { makeId, nowIso, todayIso } from "../utils/time";
import { generatePdfContent, exportPdf } from "../utils/pdfGenerator";

const props = defineProps<{ id: string }>();
const router = useRouter();
const isActionsSheetOpen = ref(false);
const isEditProjectSheetOpen = ref(false);
const isProjectIntervenantsSheetOpen = ref(false);
const isAssignSheetOpen = ref(false);
const assigningTask = ref<Task | null>(null);
const isTaskActionsSheetOpen = ref(false);
const taskActionsTask = ref<Task | null>(null);
const isImageModalOpen = ref(false);
const selectedImageUrl = ref<string | null>(null);
const projectIntervenantIds = ref<string[]>([]);
const isTextSheetOpen = ref(false);
const imagePickerRef = ref<InstanceType<typeof ImagePicker> | null>(null);
const editingTaskId = ref<string | null>(null);
const isPhotoEditorOpen = ref(false);
const photoEditorSource = ref("");
const editingPhotoId = ref<string | null>(null);
const isObservationsSheetOpen = ref(false);
const isPhotosSheetOpen = ref(false);
const managingTaskId = ref<string | null>(null);
const editingObservationIndex = ref<number | null>(null);
const isIntervenantAssignSheetOpen = ref(false);
const assigningTaskId = ref<Task | null>(null);
const currentFilterMode = ref<"open" | "me" | "date" | "summary">("open");
const isDeleteConfirmSheetOpen = ref(false);
const deletingTask = ref<Task | null>(null);

const managingTaskObservations = computed(() => {
  if (!managingTaskId.value) return [];
  const task = tasks.value?.find((t) => t.id === managingTaskId.value);
  return task?.observations ?? [];
});

const editingObservationText = computed(() => {
  if (editingObservationIndex.value === null || !managingTaskId.value) return "";
  const task = tasks.value?.find((t) => t.id === managingTaskId.value);
  return task?.observations?.[editingObservationIndex.value] ?? "";
});


const project = useLiveQuery(
  () => db.projects.get(props.id),
  undefined,
);

const tasks = useLiveQuery(
  async () => {
    const taskList = await db.tasks
      .filter((task) => !task.deleted_at && task.project_id === props.id)
      .toArray();
    return taskList.sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
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

const intervenants = useLiveQuery(() => db.intervenants.toArray(), [] as Intervenant[]);
const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[]);

const ongoingVisit = computed(
  () => visits.value.find((visit) => !visit.ended_at) ?? null,
);

const visitNumberMap = computed(() => {
  const map = new Map<string, number | undefined>();
  visits.value.forEach((visit) => {
    map.set(visit.id, visit.visit_number);
  });
  return map;
});

const getTaskAssignee = (task: Task) => {
  if (!task.intervenant_id) return null;
  return intervenants.value.find((i) => i.id === task.intervenant_id) ?? null;
};

const getTaskAssigneeName = (task: Task | null): string => {
  if (!task?.intervenant_id) return "Not assigned";
  const assignee = intervenants.value.find((i) => i.id === task.intervenant_id);
  return assignee?.name || "Unknown";
};

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return categories.value.filter((c) => intervenant.category_ids?.includes(c.id));
};

const projectIntervenantsList = computed(() => {
  if (!project.value?.intervenant_ids || project.value.intervenant_ids.length === 0) {
    return [];
  }
  return intervenants.value.filter((intervenant) =>
    project.value?.intervenant_ids?.includes(intervenant.id)
  );
});

const openAssignSheet = (task: Task) => {
  assigningTask.value = task;
  isAssignSheetOpen.value = true;
};

const closeAssignSheet = () => {
  isAssignSheetOpen.value = false;
  assigningTask.value = null;
};

const assignTaskToIntervenant = async (intervenantId: string | null) => {
  if (!assigningTask.value) return;
  await db.tasks.update(assigningTask.value.id, {
    intervenant_id: intervenantId,
    updated_at: nowIso(),
  });
  closeAssignSheet();
};

const openTaskActionsSheet = (task: Task) => {
  taskActionsTask.value = task;
  isTaskActionsSheetOpen.value = true;
};

const closeTaskActionsSheet = () => {
  isTaskActionsSheetOpen.value = false;
  taskActionsTask.value = null;
};

const handleTaskActionAssignToIntervenant = async (intervenantId: string | null) => {
  if (!taskActionsTask.value) return;
  await db.tasks.update(taskActionsTask.value.id, {
    intervenant_id: intervenantId,
    updated_at: nowIso(),
  });
  closeTaskActionsSheet();
};

const toastMessage = ref<string | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const showToast = (message: string) => {
  toastMessage.value = message;
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => {
    toastMessage.value = null;
    toastTimeout = null;
  }, 3000);
};

const handleTaskActionAssign = () => {
  if (!taskActionsTask.value) return;
  const taskToAssign = taskActionsTask.value;
  closeTaskActionsSheet();
  handleAssignIntervenant(taskToAssign);
};

const handleTaskActionReassign = () => {
  if (!taskActionsTask.value) return;
  const taskToReassign = taskActionsTask.value;
  closeTaskActionsSheet();
  handleAssignIntervenant(taskToReassign);
};

const handleTaskActionUnassign = async () => {
  if (!taskActionsTask.value) return;
  await db.tasks.update(taskActionsTask.value.id, {
    intervenant_id: null,
    updated_at: nowIso(),
  });
  closeTaskActionsSheet();
};

const handleTaskActionToggleStatus = async () => {
  if (!taskActionsTask.value) return;
  // Prevent marking unassigned tasks as done and show message
  if (!taskActionsTask.value.intervenant_id && taskActionsTask.value.status === "open") {
    showToast("Assign an intervenant before closing this observation");
    return;
  }
  await toggleTaskStatus(taskActionsTask.value);
  closeTaskActionsSheet();
};

const handleTaskActionDelete = () => {
  if (!taskActionsTask.value) return;
  const taskToDelete = taskActionsTask.value;
  closeTaskActionsSheet();
  handleDeleteTask(taskToDelete);
};


const taskGroups = computed(() => {
  const grouped = {
    open: [] as Task[],
    done: [] as Task[],
    unassigned: [] as Task[],
  };
  tasks.value.forEach((task) => {
    if (!task.intervenant_id) {
      grouped.unassigned.push(task);
    }
    if (task.status === "done") {
      grouped.done.push(task);
    } else {
      grouped.open.push(task);
    }
  });
  return grouped;
});

const openTasks = computed(() => taskGroups.value.open);
const doneTasks = computed(() => taskGroups.value.done);


const taskContentMap = ref<
  Record<string, { observations: string[]; photos: string[]; photoIds: string[] }>
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
    const map: Record<string, { observations: string[]; photos: string[]; photoIds: string[] }> = {};
    const photosByTask = new Map<string, TaskPhoto[]>();
    photos.forEach((photo) => {
      const group = photosByTask.get(photo.task_id) ?? [];
      group.push(photo);
      photosByTask.set(photo.task_id, group);
    });

    taskList.forEach((task) => {
      if (!map[task.id]) {
        map[task.id] = { observations: [], photos: [], photoIds: [] };
      }
      const entry = map[task.id];
      entry.observations = [...(task.observations ?? [])];

      const taskPhotosList = photosByTask.get(task.id) ?? [];
      const photosById = new Map(taskPhotosList.map((photo) => [photo.id, photo]));
      const orderedPhotoIds = task.photo_ids ?? [];
      const photoUrls: string[] = [];
      const photoIdArray: string[] = [];
      orderedPhotoIds.forEach((photoId) => {
        const photo = photosById.get(photoId);
        if (photo?.image_blob) {
          photoUrls.push(URL.createObjectURL(photo.image_blob));
          photoIdArray.push(photoId);
        } else if (photo?.url) {
          photoUrls.push(photo.url);
          photoIdArray.push(photoId);
        }
      });
      entry.photos = photoUrls;
      entry.photoIds = photoIdArray;
    });
    taskContentMap.value = map;
  },
  { immediate: true },
);


const exportProjectPdf = () => {
  if (!project.value) return;
  
  const content = generatePdfContent({
    projectName: project.value.name,
    tasks: openTasks.value,
    taskContentMap: taskContentMap.value,
    intervenants: intervenants.value,
    categories: categories.value,
  });
  
  exportPdf(project.value.name, content);
};

const showPastVisits = () => {
  isActionsSheetOpen.value = false;
  router.push(`/projects/${props.id}/visits`);
};

const openEditProject = () => {
  isActionsSheetOpen.value = false;
  isEditProjectSheetOpen.value = true;
};

const closeEditProject = () => {
  isEditProjectSheetOpen.value = false;
};

const saveEditProject = async (payload: { name: string; address: string }) => {
  if (!project.value) return;
  await db.projects.update(project.value.id, {
    name: payload.name.trim() || project.value.name,
    address: payload.address.trim(),
    updated_at: nowIso(),
  });
  isEditProjectSheetOpen.value = false;
};

const openProjectIntervenants = () => {
  isActionsSheetOpen.value = false;
  projectIntervenantIds.value = [...(project.value?.intervenant_ids || [])];
  isProjectIntervenantsSheetOpen.value = true;
};

const closeProjectIntervenants = () => {
  isProjectIntervenantsSheetOpen.value = false;
  projectIntervenantIds.value = [];
};

const toggleProjectIntervenant = (intervenantId: string) => {
  const index = projectIntervenantIds.value.indexOf(intervenantId);
  if (index >= 0) {
    projectIntervenantIds.value.splice(index, 1);
  } else {
    projectIntervenantIds.value.push(intervenantId);
  }
};

const saveProjectIntervenants = async () => {
  if (!project.value) return;
  await db.projects.update(project.value.id, {
    intervenant_ids: [...projectIntervenantIds.value],
    updated_at: nowIso(),
  });
  closeProjectIntervenants();
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
    conclusion: "",
    visit_number: visitNumber,
    ended_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  router.push(`/visits/${visitId}`);
};

const endVisit = async () => {
  if (!ongoingVisit.value || ongoingVisit.value.ended_at) return;
  await db.visits.update(ongoingVisit.value.id, {
    ended_at: nowIso(),
    updated_at: nowIso(),
  });
};

const openImageModal = (url: string) => {
  selectedImageUrl.value = url;
  isImageModalOpen.value = true;
};

const closeImageModal = () => {
  isImageModalOpen.value = false;
  selectedImageUrl.value = null;
};

const openTask = (task: Task) => {
  router.push(`/tasks/${task.id}/edit`);
};

const openAddTaskWithText = () => {
  editingTaskId.value = null; // Clear any existing task ID to create new task
  isTextSheetOpen.value = true;
};

const openAddTaskWithImage = () => {
  editingTaskId.value = null; // Clear any existing task ID to create new task
  imagePickerRef.value?.open();
};

const handleImageSelected = async (blob: Blob) => {
  const timestamp = nowIso();
  const photoId = makeId();
  
  if (editingTaskId.value) {
    // Adding photo to existing task
    const task = await db.tasks.get(editingTaskId.value);
    if (task) {
      const nextPhotoIds = [...(task.photo_ids ?? []), photoId];
      await db.tasks.update(editingTaskId.value, {
        photo_ids: nextPhotoIds,
        updated_at: timestamp,
      });
      
      // Store photo with original blob (compression will happen in background during sync)
      await db.task_photos.add({
        id: photoId,
        task_id: editingTaskId.value,
        url: null,
        storage_path: null,
        image_blob: blob,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      });
      
      // Compress in background (non-blocking)
      const { compressImage } = await import("../utils/imageCompression");
      compressImage(blob, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        initialQuality: 0.80,
      }).then((compressedBlob) => {
        db.task_photos.update(photoId, {
          image_blob: compressedBlob,
          updated_at: nowIso(),
        }).catch((error) => {
          console.error('[ProjectView] Failed to update compressed image:', error);
        });
      }).catch((error) => {
        console.error('[ProjectView] Background compression failed:', error);
      });
    }
    editingTaskId.value = null;
  } else {
    // Create new task with the photo
    const visitId = await ensureOngoingVisit();
    const taskId = makeId();
    
    await db.tasks.add({
      id: taskId,
      project_id: props.id,
      visit_id: visitId,
      opened_visit_id: visitId,
      done_visit_id: null,
      status: "open",
      type: "photo",
      intervenant_id: null, // Unassigned by default
      photo_ids: [photoId],
      observations: [],
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
    
    // Store photo with original blob (compression will happen in background during sync)
    await db.task_photos.add({
      id: photoId,
      task_id: taskId,
      url: null,
      storage_path: null,
      image_blob: blob,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
    
    // Compress in background (non-blocking)
    const { compressImage } = await import("../utils/imageCompression");
    compressImage(blob, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1920,
      initialQuality: 0.80,
    }).then((compressedBlob) => {
      db.task_photos.update(photoId, {
        image_blob: compressedBlob,
        updated_at: nowIso(),
      }).catch((error) => {
        console.error('[ProjectView] Failed to update compressed image:', error);
      });
    }).catch((error) => {
      console.error('[ProjectView] Background compression failed:', error);
    });
  }
};

const closeTextSheet = () => {
  isTextSheetOpen.value = false;
  editingTaskId.value = null;
  editingObservationIndex.value = null;
};

const handleImageCancel = () => {
  editingTaskId.value = null;
};

const ensureOngoingVisit = async () => {
  if (!props.id) return null;
  const existing = await db.visits
    .filter((visit) => visit.project_id === props.id && !visit.ended_at)
    .first();
  if (existing) return existing.id;

  const timestamp = nowIso();
  const visitNumber = await getNextVisitNumber(props.id);
  const visitId = makeId();
  await db.visits.add({
    id: visitId,
    project_id: props.id,
    date: todayIso(),
    conclusion: "",
    visit_number: visitNumber,
    ended_at: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  return visitId;
};

const handleTextSend = async (text: string) => {
  if (editingTaskId.value) {
    const task = await db.tasks.get(editingTaskId.value);
    if (task) {
      if (editingObservationIndex.value !== null) {
        // Editing existing observation
        const currentObservations = [...(task.observations ?? [])];
        if (editingObservationIndex.value >= 0 && editingObservationIndex.value < currentObservations.length) {
          currentObservations[editingObservationIndex.value] = text;
          await db.tasks.update(editingTaskId.value, {
            observations: currentObservations,
            updated_at: nowIso(),
          });
        }
        editingObservationIndex.value = null;
      } else {
        // Adding text to existing task
        const nextObservations = [...(task.observations ?? []), text];
        await db.tasks.update(editingTaskId.value, {
          observations: nextObservations,
          updated_at: nowIso(),
        });
      }
    }
    editingTaskId.value = null;
  } else {
    // Create new task with the observation
    const visitId = await ensureOngoingVisit();
    const timestamp = nowIso();
    const taskId = makeId();
    
    await db.tasks.add({
      id: taskId,
      project_id: props.id,
      visit_id: visitId,
      opened_visit_id: visitId,
      done_visit_id: null,
      status: "open",
      type: "text",
      intervenant_id: null, // Unassigned by default
      photo_ids: [],
      observations: [text],
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }
};

const handleAddTextToTask = (task: Task) => {
  editingTaskId.value = task.id;
  isTextSheetOpen.value = true;
};

const handleAddPhotoToTask = async (task: Task) => {
  editingTaskId.value = task.id;
  imagePickerRef.value?.open();
};

const handleEditPhoto = async (payload: { task: Task; photoIndex: number }) => {
  const { task, photoIndex } = payload;
  const taskContent = taskContentMap.value[task.id];
  if (!taskContent || !taskContent.photoIds || photoIndex >= taskContent.photoIds.length) return;
  
  const photoId = taskContent.photoIds[photoIndex];
  const photo = await db.task_photos.get(photoId);
  if (!photo) return;
  
  editingPhotoId.value = photoId;
  editingTaskId.value = task.id;
  
  // Load the photo into the editor
  if (photo.image_blob) {
    // Use local blob
    const url = URL.createObjectURL(photo.image_blob);
    photoEditorSource.value = url;
    isPhotoEditorOpen.value = true;
  } else if (photo.url) {
    // Use URL from Supabase Storage
    photoEditorSource.value = photo.url;
    isPhotoEditorOpen.value = true;
  }
};

const closePhotoEditor = () => {
  if (photoEditorSource.value.startsWith("blob:")) {
    URL.revokeObjectURL(photoEditorSource.value);
  }
  photoEditorSource.value = "";
  isPhotoEditorOpen.value = false;
  editingPhotoId.value = null;
  editingTaskId.value = null;
};

const handlePhotoUpdated = async (dataUrl: string) => {
  // This is called when user updates image in PhotoEditorModal
  // The actual save happens in handlePhotoEdited when user clicks "Save"
};

const handlePhotoEdited = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  if (editingPhotoId.value && editingTaskId.value) {
    // Update existing photo
    await updatePhoto(editingPhotoId.value, blob);
  }
  
  closePhotoEditor();
};

const handleDeletePhoto = async () => {
  if (!editingPhotoId.value || !editingTaskId.value) {
    closePhotoEditor();
    return;
  }
  
  const timestamp = nowIso();
  
  // Soft delete the photo
  await db.task_photos.update(editingPhotoId.value, {
    deleted_at: timestamp,
    updated_at: timestamp,
  });
  
  // Remove photo_id from task's photo_ids array
  const task = await db.tasks.get(editingTaskId.value);
  if (task) {
    const currentPhotoIds = task.photo_ids ?? [];
    const updatedPhotoIds = currentPhotoIds.filter((id) => id !== editingPhotoId.value);
    await db.tasks.update(editingTaskId.value, {
      photo_ids: updatedPhotoIds,
      updated_at: timestamp,
    });
  }
  
  // If photo is already synced to Supabase Storage, delete it from storage
  const photo = await db.task_photos.get(editingPhotoId.value);
  if (photo?.storage_path) {
    try {
      const { supabase } = await import("../supabase");
      if (supabase) {
        const { error } = await supabase.storage
          .from('task-photos')
          .remove([photo.storage_path]);
        
        if (error) {
          console.error(`[ProjectView] Failed to delete photo from Storage:`, error);
        } else {
          console.log(`[ProjectView] ✓ Deleted photo from Storage: ${photo.storage_path}`);
        }
      }
    } catch (error) {
      console.error(`[ProjectView] Error deleting photo from Storage:`, error);
    }
  }
  
  closePhotoEditor();
};

const handleManageObservations = (task: Task) => {
  managingTaskId.value = task.id;
  editingObservationIndex.value = null;
  isObservationsSheetOpen.value = true;
};

const handleManagePhotos = (task: Task) => {
  managingTaskId.value = task.id;
  isPhotosSheetOpen.value = true;
};

const closeObservationsSheet = () => {
  isObservationsSheetOpen.value = false;
  managingTaskId.value = null;
  editingObservationIndex.value = null;
};

const managingTaskPhotos = computed(() => {
  if (!managingTaskId.value) return [];
  const task = tasks.value?.find((t) => t.id === managingTaskId.value);
  if (!task) return [];
  const taskContent = taskContentMap.value[task.id];
  return taskContent?.photos ?? [];
});

const closePhotosSheet = () => {
  isPhotosSheetOpen.value = false;
  managingTaskId.value = null;
};

const handleEditPhotoFromSheet = async (index: number) => {
  if (!managingTaskId.value) return;
  const task = tasks.value?.find((t) => t.id === managingTaskId.value);
  if (!task) return;
  const taskContent = taskContentMap.value[task.id];
  if (!taskContent || !taskContent.photoIds || index >= taskContent.photoIds.length) return;
  
  const photoId = taskContent.photoIds[index];
  const photo = await db.task_photos.get(photoId);
  if (!photo) return;
  
  editingPhotoId.value = photoId;
  editingTaskId.value = managingTaskId.value;
  isPhotosSheetOpen.value = false;
  
  // Load the photo into the editor
  if (photo.image_blob) {
    const url = URL.createObjectURL(photo.image_blob);
    photoEditorSource.value = url;
    isPhotoEditorOpen.value = true;
  } else if (photo.url) {
    photoEditorSource.value = photo.url;
    isPhotoEditorOpen.value = true;
  }
};

const handleDeletePhotoFromSheet = async (index: number) => {
  if (!managingTaskId.value) return;
  
  const task = await db.tasks.get(managingTaskId.value);
  if (!task) return;
  
  const taskContent = taskContentMap.value[task.id];
  if (!taskContent || !taskContent.photoIds || index >= taskContent.photoIds.length) return;
  
  const photoId = taskContent.photoIds[index];
  await handleDeletePhotoById(photoId);
};

const handleDeletePhotoById = async (photoId: string) => {
  const timestamp = nowIso();
  
  // Soft delete the photo
  await db.task_photos.update(photoId, {
    deleted_at: timestamp,
    updated_at: timestamp,
  });
  
  // Remove photo_id from task's photo_ids array
  const task = await db.tasks.get(managingTaskId.value!);
  if (task) {
    const currentPhotoIds = task.photo_ids ?? [];
    const updatedPhotoIds = currentPhotoIds.filter((id) => id !== photoId);
    await db.tasks.update(managingTaskId.value!, {
      photo_ids: updatedPhotoIds,
      updated_at: timestamp,
    });
  }
  
  // If photo is already synced to Supabase Storage, delete it from storage
  const photo = await db.task_photos.get(photoId);
  if (photo?.storage_path) {
    try {
      const { supabase } = await import("../supabase");
      if (supabase) {
        const { error } = await supabase.storage
          .from('task-photos')
          .remove([photo.storage_path]);
        
        if (error) {
          console.error(`[ProjectView] Failed to delete photo from Storage:`, error);
        }
      }
    } catch (error) {
      console.error(`[ProjectView] Error deleting photo from Storage:`, error);
    }
  }
};

const handleAddPhotoToSheet = () => {
  if (!managingTaskId.value) return;
  editingTaskId.value = managingTaskId.value;
  isPhotosSheetOpen.value = false;
  imagePickerRef.value?.open();
};

const handleViewPhotoFromSheet = (url: string) => {
  openImageModal(url);
};

const handleEditObservation = (index: number) => {
  if (!managingTaskId.value) return;
  const task = tasks.value?.find((t) => t.id === managingTaskId.value);
  if (!task) return;
  
  const observation = task.observations?.[index];
  if (observation === undefined) return;
  
  editingObservationIndex.value = index;
  editingTaskId.value = managingTaskId.value;
  isObservationsSheetOpen.value = false;
  isTextSheetOpen.value = true;
  // Set initial text in TextSheet
  nextTick(() => {
    // TextSheet will handle the initialText prop
  });
};

const handleDeleteObservation = async (index: number) => {
  if (!managingTaskId.value) return;
  
  const task = await db.tasks.get(managingTaskId.value);
  if (!task) return;
  
  const currentObservations = task.observations ?? [];
  if (index < 0 || index >= currentObservations.length) return;
  
  const updatedObservations = currentObservations.filter((_, i) => i !== index);
  await db.tasks.update(managingTaskId.value, {
    observations: updatedObservations,
    updated_at: nowIso(),
  });
};

const handleAddObservation = () => {
  if (!managingTaskId.value) return;
  editingObservationIndex.value = null;
  editingTaskId.value = managingTaskId.value;
  isObservationsSheetOpen.value = false;
  isTextSheetOpen.value = true;
};

const handleAssignIntervenant = (task: Task) => {
  assigningTaskId.value = task;
  isIntervenantAssignSheetOpen.value = true;
};

const closeIntervenantAssignSheet = () => {
  isIntervenantAssignSheetOpen.value = false;
  assigningTaskId.value = null;
};

const handleAssignIntervenantToTask = async (intervenantId: string | null) => {
  if (!assigningTaskId.value) return;
  await db.tasks.update(assigningTaskId.value.id, {
    intervenant_id: intervenantId,
    updated_at: nowIso(),
  });
  closeIntervenantAssignSheet();
};

const handleCreateMeIntervenant = async () => {
  // Check if Me intervenant already exists globally
  const existingMe = await db.intervenants
    .filter((i) => i.name.toLowerCase() === "me")
    .first();
  
  let meId: string;
  
  if (existingMe) {
    meId = existingMe.id;
  } else {
    // Create Me intervenant
    const timestamp = nowIso();
    meId = makeId();
    await db.intervenants.add({
      id: meId,
      name: "Me",
      email: null,
      phone: null,
      category_ids: [],
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }
  
  // Add to project if not already in project
  if (project.value && !project.value.intervenant_ids?.includes(meId)) {
    await db.projects.update(project.value.id, {
      intervenant_ids: [...(project.value.intervenant_ids || []), meId],
      updated_at: nowIso(),
    });
  }
  
  // Assign to task
  if (assigningTaskId.value) {
    await db.tasks.update(assigningTaskId.value.id, {
      intervenant_id: meId,
      updated_at: nowIso(),
    });
  }
  
  closeIntervenantAssignSheet();
};

const handleCreateGeneraleIntervenant = async () => {
  // Check if Générale intervenant already exists globally
  const existingGenerale = await db.intervenants
    .filter((i) => i.name.toLowerCase() === "générale" || i.name.toLowerCase() === "generale")
    .first();
  
  let generaleId: string;
  
  if (existingGenerale) {
    generaleId = existingGenerale.id;
  } else {
    // Create Générale intervenant
    const timestamp = nowIso();
    generaleId = makeId();
    await db.intervenants.add({
      id: generaleId,
      name: "Générale",
      email: null,
      phone: null,
      category_ids: [],
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    });
  }
  
  // Add to project if not already in project
  if (project.value && !project.value.intervenant_ids?.includes(generaleId)) {
    await db.projects.update(project.value.id, {
      intervenant_ids: [...(project.value.intervenant_ids || []), generaleId],
      updated_at: nowIso(),
    });
  }
  
  // Assign to task
  if (assigningTaskId.value) {
    await db.tasks.update(assigningTaskId.value.id, {
      intervenant_id: generaleId,
      updated_at: nowIso(),
    });
  }
  
  closeIntervenantAssignSheet();
};

const updatePhoto = async (photoId: string, newBlob: Blob) => {
  const timestamp = nowIso();
  
  // Get the photo to check if it was already synced
  const photo = await db.task_photos.get(photoId);
  const wasSynced = !!(photo?.storage_path && photo?.url);
  
  // Update immediately with original blob (fast, no compression delay)
  await db.task_photos.update(photoId, {
    image_blob: newBlob, // Store original first - will be compressed in background
    url: null, // Clear URL since we have a new version
    storage_path: null, // Clear storage path since we need to re-upload
    updated_at: timestamp,
  });
  
  // If it was synced, delete the old file from Storage
  if (wasSynced && photo?.storage_path) {
    try {
      const { supabase } = await import("../supabase");
      if (supabase) {
        const { error } = await supabase.storage
          .from('task-photos')
          .remove([photo.storage_path]);
        
        if (error) {
          console.error(`[ProjectView] Failed to delete old photo from Storage:`, error);
        } else {
          console.log(`[ProjectView] ✓ Deleted old photo from Storage: ${photo.storage_path}`);
        }
      }
    } catch (error) {
      console.error(`[ProjectView] Error deleting old photo from Storage:`, error);
    }
  }
  
  // Update task timestamp
  if (editingTaskId.value) {
    await db.tasks.update(editingTaskId.value, {
      updated_at: timestamp,
    });
  }
  
  // Compress in background (non-blocking) - update when done
  const { compressImage } = await import("../utils/imageCompression");
  compressImage(newBlob, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    initialQuality: 0.80,
  }).then((compressedBlob) => {
    // Update with compressed version when ready
    db.task_photos.update(photoId, {
      image_blob: compressedBlob,
      updated_at: nowIso(),
    }).catch((error) => {
      console.error('[ProjectView] Failed to update compressed image:', error);
    });
  }).catch((error) => {
    console.error('[ProjectView] Background compression failed:', error);
    // Keep original if compression fails
  });
};

onBeforeUnmount(() => {
  revokeTaskContentUrls();
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
});

const toggleTaskStatus = async (task: Task) => {
  const nextStatus = task.status === "done" ? "open" : "done";
  const visitId = ongoingVisit.value?.id ?? null;
  const openedVisitId = nextStatus === "open" ? visitId : task.opened_visit_id ?? null;
  const doneVisitId = nextStatus === "done" ? visitId : null;
  await db.tasks.update(task.id, {
    status: nextStatus,
    opened_visit_id: openedVisitId,
    done_visit_id: doneVisitId,
    updated_at: nowIso(),
  });
};

const handleMarkAsDone = async (task: Task) => {
  if (!task.intervenant_id) {
    showToast("Assign an intervenant before closing this observation");
    return;
  }
  await toggleTaskStatus(task);
};

const handleDeleteTask = (task: Task) => {
  deletingTask.value = task;
  isDeleteConfirmSheetOpen.value = true;
};

const closeDeleteConfirmSheet = () => {
  isDeleteConfirmSheetOpen.value = false;
  deletingTask.value = null;
};

const confirmDeleteTask = async () => {
  if (!deletingTask.value) return;
  await deleteTask(deletingTask.value);
  closeDeleteConfirmSheet();
};

const handleFilterModeChange = (mode: "open" | "me" | "date" | "summary") => {
  currentFilterMode.value = mode;
};

const deleteTask = async (task: Task) => {
  await db.tasks.update(task.id, {
    deleted_at: nowIso(),
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
  align-items: center;
  gap: 16px;
}

.notes-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notes-back {
  border: none;
  background: transparent;
  color: var(--notes-accent);
  font-size: 28px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
}

.notes-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.2px;
  line-height: 1;
  margin: 0;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.notes-assignee-group {
  margin-bottom: 16px;
}

.notes-assignee-group:last-child {
  margin-bottom: 0;
}

.notes-assignee-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--notes-text);
  padding: 8px 16px;
  background: var(--notes-panel-strong);
  border-radius: 8px;
  margin-bottom: 8px;
}

.notes-assignee-header-name {
  flex-shrink: 0;
}

.notes-assignee-header-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.notes-assignee-header-badge {
  background: var(--notes-chip);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 500;
}

.notes-visit-group {
  margin-bottom: 16px;
}

.notes-visit-group:last-child {
  margin-bottom: 0;
}

.notes-visit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--notes-text);
  padding: 8px 16px;
  background: var(--notes-panel-strong);
  border-radius: 8px;
  margin-bottom: 8px;
}

.notes-visit-header-name {
  flex-shrink: 0;
}

.notes-visit-header-date {
  font-weight: 400;
  color: var(--notes-muted);
}

.notes-count-badge {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
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

.notes-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  border-top: none;
  padding: 12px 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 10;
}

.notes-bottom-icon {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  color: var(--notes-text);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  flex: 1;
  max-width: 44px;
}

.notes-bottom-icon:hover {
  background: var(--notes-hover);
}

.notes-bottom-icon svg {
  width: 24px;
  height: 24px;
}

.notes-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 12px 12px;
  z-index: 50;
}

.notes-sheet-backdrop-fullscreen {
  z-index: 60;
}

.notes-sheet-backdrop-overlay {
  z-index: 70;
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

.notes-task-actions-list .notes-sheet-row + .notes-sheet-row {
  margin-top: 8px;
}

.notes-sheet-row.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
}

.notes-sheet-row-danger {
  color: #ff6b6b;
}

.notes-sheet-row-danger:hover {
  background: rgba(255, 107, 107, 0.1);
}

.notes-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 193, 7, 0.95);
  color: #000;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: calc(100% - 40px);
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.notes-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notes-sheet-close {
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 20px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
}

.notes-sheet-close:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

.notes-delete-confirm-content {
  padding: 16px 0;
}

.notes-delete-confirm-message {
  font-size: 14px;
  color: var(--notes-text);
  line-height: 1.5;
  margin: 0;
}

.notes-delete-confirm-message strong {
  font-weight: 600;
  color: var(--notes-text);
}

.notes-sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.notes-button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--notes-border);
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-button:hover {
  background: var(--notes-hover);
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

.notes-button-primary:hover {
  opacity: 0.9;
}

.notes-button-danger {
  background: #ff6b6b;
  color: #fff;
  border-color: #ff6b6b;
}

.notes-button-danger:hover {
  background: #ff5252;
}

.notes-sheet-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.notes-sheet-section-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  padding: 12px 16px 8px;
  font-weight: 600;
}

.notes-sheet-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 16px;
}

.notes-sheet-chip {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border: 1px solid var(--notes-border);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.notes-sheet-chip:hover {
  background: var(--notes-hover);
  border-color: var(--notes-text);
}

.notes-sheet-chip.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

.notes-sheet-chip-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.notes-sheet-chip-name {
  font-weight: 500;
  line-height: 1.2;
}

.notes-sheet-chip-category {
  font-size: 11px;
  opacity: 0.7;
  line-height: 1.2;
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

.notes-task-list-container {
  padding-bottom: 80px;
}


.notes-list .notes-task-row + .notes-task-row {
  margin-top: 4px;
  border-top: none;
  box-shadow: 0 -4px 0 0 #000;
}

.notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  color: inherit;
  background: transparent;
  border: none;
  text-align: left;
  gap: 12px;
}

.notes-task-row {
  align-items: flex-start;
  gap: 12px;
}

.notes-task-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
  min-width: 100px;
}

.notes-visit-row {
  padding: 10px 16px;
}

.notes-visit-row .notes-row-left {
  gap: 0;
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
  flex: 1;
  min-width: 0;
}

.notes-row-title {
  font-weight: 600;
}

.notes-row-subtitle {
  font-size: 12px;
  color: var(--notes-text);
}

.notes-row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--notes-muted);
}

.notes-assignee-meta {
  font-size: 11px;
  color: var(--notes-text);
  font-weight: 500;
}

.notes-visit-meta {
  display: inline-flex;
  gap: 4px;
  font-size: 11px;
  color: var(--notes-muted);
}

.notes-row-text {
  flex: 1;
  min-width: 0;
}

.notes-task-menu {
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 18px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
}

.notes-task-menu:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

.notes-observations {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}


.notes-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
  margin-top: 6px;
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

.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-filter-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.notes-filter-badge {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-muted);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-filter-badge:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
  border-color: var(--notes-text);
}

.notes-filter-badge.active {
  background: transparent;
  color: var(--notes-text);
  border-color: var(--notes-accent);
}

.notes-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notes-badge {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.notes-badge.active {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
}

.notes-badge-count {
  font-size: 11px;
  color: var(--notes-muted);
  font-weight: 500;
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

.notes-end-visit-button {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.notes-end-visit-button:hover {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-assign {
  border: none;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
}

.notes-assign:hover {
  background: var(--notes-hover);
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

.notes-delete {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-muted);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
}

.notes-delete:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

.notes-status:hover {
  background: var(--notes-hover);
}

.notes-cta {
  display: flex;
  justify-content: flex-start;
}

.notes-cta-empty {
  flex-direction: column;
  gap: 6px;
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
  color: #fff;
}

.notes-button-primary {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  font-weight: 600;
}

.notes-button-danger {
  color: #ff6b6b;
}

.notes-button-danger:hover {
  background: rgba(255, 107, 107, 0.1);
}

.notes-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.notes-category-badge {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border: 1px solid var(--notes-border);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.notes-category-badge.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
  border-color: var(--notes-accent);
}

.notes-sheet-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
  padding: 16px 16px 8px;
}

.notes-sheet-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding: 16px;
}

.notes-sheet-actions .notes-button {
  flex: 1;
}

.notes-sheet-actions .notes-button-primary {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
}

.notes-sheet-backdrop-fullscreen {
  align-items: stretch;
  padding: 0;
}

.notes-sheet-fullscreen {
  width: 100%;
  height: 100%;
  max-height: 100vh;
  border-radius: 0;
  display: flex;
  flex-direction: column;
}

.notes-sheet-task-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
