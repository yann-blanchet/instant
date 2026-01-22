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
            class="notes-observation-item"
          >
            <div 
              class="notes-item-text notes-item-text-editable"
              @click="editObservation(index)"
            >
              {{ text }}
            </div>
            <button
              class="notes-observation-delete"
              type="button"
              aria-label="Delete observation"
              @click.stop="deleteObservation(index)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
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
          <div
            v-for="photoId in (taskRecord?.photo_ids ?? []).filter(id => photoIdToUrlMap.has(id))"
            :key="`photo-${photoId}`"
            class="notes-photo-wrapper"
          >
            <img
              :src="photoIdToUrlMap.get(photoId)"
              class="notes-photo notes-photo-editable"
              alt="Task photo"
              @click="editPhoto(photoId)"
            />
            <button
              class="notes-photo-delete"
              type="button"
              aria-label="Delete photo"
              @click.stop="deletePhoto(photoId)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>

    </div>

    <div class="notes-bottom-bar">
      <button class="notes-bottom-icon" type="button" @click="openTextSheet" aria-label="Add text">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </button>
      <button class="notes-bottom-icon" type="button" @click="openImagePicker" aria-label="Add image">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
      <button class="notes-bottom-icon notes-bottom-close" type="button" @click="handleBack" aria-label="Close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <ImagePicker
      ref="imagePickerRef"
      @image-selected="handleImageSelected"
      @cancel="handleImageCancel"
    />

    <TextSheet
      v-model="isTextSheetOpen"
      :initial-text="textDraft"
      @send="handleTextSend"
      @close="closeTextSheet"
    />


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
        <div v-if="projectIntervenants.length === 0 && project?.intervenant_ids && project.intervenant_ids.length > 0" class="notes-sheet-row notes-sheet-empty">
          No matching intervenants found (IDs may be invalid)
        </div>
        <div v-else-if="projectIntervenants.length === 0" class="notes-sheet-row notes-sheet-empty">
          No intervenants assigned to this project
        </div>
        <button
          v-for="person in projectIntervenants"
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

    <PhotoEditorModal
      :is-active="isPhotoEditorOpen"
      :image-field="{ value: photoEditorSource }"
      :show-save="true"
      @close="closePhotoEditor"
      @update-image="handlePhotoUpdated"
      @send-image="handlePhotoEdited"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { liveQuery, type Subscription } from "dexie";
import { useRoute, useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { getNextVisitNumber } from "../db/visits";
import type { Task, TaskPhoto } from "../db/types";
import { makeId, nowIso } from "../utils/time";
import ImagePicker from "../components/ImagePicker.vue";
import PhotoEditorModal from "../components/PhotoEditorModal.vue";
import TextSheet from "../components/TextSheet.vue";
import { compressImage } from "../utils/imageCompression";
import { supabase } from "../supabase";

const router = useRouter();
const route = useRoute();

const editingTaskId = computed(() => {
  const id = route.params.taskId;
  return typeof id === "string" && id.length > 0 ? id : null;
});

// Initialize taskRecord early so projectId can reference it
const taskRecord = ref<Task | null>(null);

const projectId = computed(() => {
  const id = route.params.id;
  if (typeof id === "string" && id.length > 0) return id;
  const queryId = route.query.projectId;
  if (typeof queryId === "string" && queryId.length > 0) return queryId;
  return taskRecord.value?.project_id ?? null;
});

// Watch projectId to ensure reactivity and recreate query when it changes
const project = ref<Awaited<ReturnType<typeof db.projects.get>> | null>(null);
let projectSubscription: Subscription | null = null;

const updateProjectQuery = () => {
  // Unsubscribe from previous query
  if (projectSubscription) {
    projectSubscription.unsubscribe();
  }
  
  const pid = projectId.value;
  
  if (!pid) {
    project.value = null;
    return;
  }
  
  // Create new subscription
  projectSubscription = liveQuery(() => db.projects.get(pid)).subscribe({
    next: (value) => {
      project.value = value;
    },
    error: (error) => {
      console.error("Project query error:", error);
    },
  });
};

// Watch projectId and update query when it changes
watch(projectId, updateProjectQuery, { immediate: true });

// Watch project changes
watch(project, (p) => {
}, { immediate: true, deep: true });

onBeforeUnmount(() => {
  if (projectSubscription) {
    projectSubscription.unsubscribe();
  }
});

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const isAssigneeSheetOpen = ref(false);

// Force refresh project when assignee sheet opens
watch(isAssigneeSheetOpen, async (isOpen) => {
  if (isOpen && projectId.value) {
    // Force a refresh by re-querying the project
    const freshProject = await db.projects.get(projectId.value);
  }
});

const projectIntervenants = computed(() => {
  if (!project.value) {
    return [];
  }
  const projectIntervenantIds = project.value.intervenant_ids;
  if (!projectIntervenantIds || !Array.isArray(projectIntervenantIds) || projectIntervenantIds.length === 0) {
    return [];
  }
  if (!intervenants.value || !Array.isArray(intervenants.value) || intervenants.value.length === 0) {
    return [];
  }
  const filtered = intervenants.value.filter((intervenant) =>
    projectIntervenantIds.includes(intervenant.id)
  );
  return filtered;
});
const headerTitle = computed(() => 
  editingTaskId.value ? "Observation" : "Nouvelle observation"
);

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
const taskPhotos = ref<TaskPhoto[]>([]);
let taskItemsSubscription: Subscription | null = null;
const taskItemViews = ref<
  Array<
    | { id: string; type: "text"; text: string }
    | { id: string; type: "image"; imageUrl: string }
  >
>([]);
const photoPreviewUrls = ref<string[]>([]);
const photoIdToUrlMap = ref<Map<string, string>>(new Map());
const isTextSheetOpen = ref(false);
const isPhotoEditorOpen = ref(false);
const photoEditorSource = ref("");
const textDraft = ref("");
const editingObservationIndex = ref<number | null>(null);
const imagePickerRef = ref<InstanceType<typeof ImagePicker> | null>(null);
const contentListRef = ref<HTMLDivElement | null>(null);
const editingPhotoId = ref<string | null>(null);

const hasContent = computed(() => {
  const observationsCount = taskRecord.value?.observations?.length ?? 0;
  const photoCount = taskRecord.value?.photo_ids?.length ?? 0;
  return observationsCount + photoCount > 0;
});


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
    const orderedPhotoIds = (task?.photo_ids ?? []).filter((id) => {
      const photo = photosById.get(id);
      return photo && !photo.deleted_at; // Only include non-deleted photos
    });
    const nextPhotoUrls: string[] = [];
    const nextPhotoIdToUrlMap = new Map<string, string>();
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
        nextPhotoIdToUrlMap.set(photoId, url);
      } else if (photo?.url) {
        nextViews.push({
          id: photoId,
          type: "image",
          imageUrl: photo.url,
        });
        nextPhotoUrls.push(photo.url);
        nextPhotoIdToUrlMap.set(photoId, photo.url);
      }
    });
    photoPreviewUrls.value = nextPhotoUrls;
    photoIdToUrlMap.value = nextPhotoIdToUrlMap;

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

const ensureTask = async (visitId: string | null) => {
  if (createdTaskId.value) return createdTaskId.value;
  const taskId = makeId();
  const timestamp = nowIso();
  await db.tasks.add({
    id: taskId,
    project_id: projectId.value,
    visit_id: visitId,
    opened_visit_id: visitId,
    done_visit_id: null,
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
      const visitId = await ensureOngoingVisit();
      await ensureTask(visitId);
      return;
    }
    await db.tasks.update(createdTaskId.value, {
      intervenant_id: form.intervenant_id,
      updated_at: nowIso(),
    });
  },
);

const openTextSheet = (observationIndex?: number) => {
  if (observationIndex !== undefined && taskRecord.value) {
    // Editing existing observation
    editingObservationIndex.value = observationIndex;
    textDraft.value = taskRecord.value.observations[observationIndex] || "";
  } else {
    // Adding new observation
    editingObservationIndex.value = null;
    textDraft.value = "";
  }
  isTextSheetOpen.value = true;
};

const editObservation = (index: number) => {
  openTextSheet(index);
};

const closeTextSheet = () => {
  isTextSheetOpen.value = false;
  textDraft.value = "";
  editingObservationIndex.value = null;
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
  const visitId = await ensureOngoingVisit();
  const taskId = await ensureTask(visitId);
  const task = await db.tasks.get(taskId);
  
  if (editingObservationIndex.value !== null && task) {
    // Editing existing observation
    const currentObservations = [...(task.observations ?? [])];
    if (editingObservationIndex.value >= 0 && editingObservationIndex.value < currentObservations.length) {
      currentObservations[editingObservationIndex.value] = text;
      await db.tasks.update(taskId, {
        observations: currentObservations,
        updated_at: nowIso(),
      });
    }
  } else {
    // Adding new observation
    const nextObservations = [...(task?.observations ?? []), text];
    await db.tasks.update(taskId, {
      observations: nextObservations,
      updated_at: nowIso(),
    });
  }
  
  closeTextSheet();
};

const deleteObservation = async (index: number) => {
  if (!taskRecord.value) return;
  
  const currentObservations = taskRecord.value.observations ?? [];
  if (index < 0 || index >= currentObservations.length) return;
  
  const updatedObservations = currentObservations.filter((_, i) => i !== index);
  await db.tasks.update(taskRecord.value.id, {
    observations: updatedObservations,
    updated_at: nowIso(),
  });
};

const openImagePicker = () => {
  imagePickerRef.value?.open();
};

// Handle query parameter actions
onMounted(() => {
  const action = route.query.action;
  if (action === "text") {
    nextTick(() => {
      openTextSheet();
    });
  } else if (action === "image") {
    nextTick(() => {
      openImagePicker();
    });
  }
});

const handleImageSelected = async (blob: Blob) => {
  // For new images (not editing), use sendImage logic
  if (!editingPhotoId.value) {
    await sendImage(blob);
  } else {
    // For editing existing images, use updateImage logic
    await updateImage(editingPhotoId.value, blob);
  }
};

const handleImageCancel = () => {
  // Reset editing state if user cancelled
  editingPhotoId.value = null;
};

const closePhotoEditor = () => {
  if (photoEditorSource.value.startsWith("blob:")) {
    URL.revokeObjectURL(photoEditorSource.value);
  }
  photoEditorSource.value = "";
  isPhotoEditorOpen.value = false;
  editingPhotoId.value = null; // Reset editing state
};

const handlePhotoUpdated = async (dataUrl: string) => {
  // This is called when user updates image in PhotoEditorModal (for editing existing photos)
  // The actual save happens in handlePhotoEdited when user clicks "Save"
};

const handlePhotoEdited = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  // Check if editing before closing editor (closePhotoEditor resets editingPhotoId)
  const photoIdToUpdate = editingPhotoId.value;
  closePhotoEditor();
  
  if (photoIdToUpdate) {
    // Editing existing photo
    await updateImage(photoIdToUpdate, blob);
  } else {
    // Adding new photo (shouldn't happen via PhotoEditorModal, but handle it)
    await sendImage(blob);
  }
};

const editPhoto = async (photoId: string) => {
  const photo = await db.task_photos.get(photoId);
  if (!photo) return;
  
  editingPhotoId.value = photoId;
  
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

const updateImage = async (photoId: string, newBlob: Blob) => {
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
  if (wasSynced && photo?.storage_path && supabase) {
    try {
      const { error } = await supabase.storage
        .from('task-photos')
        .remove([photo.storage_path]);
      
      if (error) {
        console.error(`[TaskCreateView] Failed to delete old photo from Storage:`, error);
      } else {
        console.log(`[TaskCreateView] ✓ Deleted old photo from Storage: ${photo.storage_path}`);
      }
    } catch (error) {
      console.error(`[TaskCreateView] Error deleting old photo from Storage:`, error);
    }
  }
  
  // Update task timestamp
  if (taskRecord.value) {
    await db.tasks.update(taskRecord.value.id, {
      updated_at: timestamp,
    });
  }
  
  editingPhotoId.value = null;
  
  // Compress in background (non-blocking) - update when done
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
      console.error('[TaskCreateView] Failed to update compressed image:', error);
    });
  }).catch((error) => {
    console.error('[TaskCreateView] Background compression failed:', error);
    // Keep original if compression fails
  });
};

const sendImage = async (blob: Blob) => {
  const visitId = await ensureOngoingVisit();
  const taskId = await ensureTask(visitId);
  const timestamp = nowIso();
  const photoId = makeId();
  
  // Store photo immediately with original blob (fast, no compression delay)
  // Compression will happen in background for better UX
  await db.task_photos.add({
    id: photoId,
    task_id: taskId,
    url: null,
    storage_path: null,
    image_blob: blob, // Store original - will be compressed in background
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  
  const task = await db.tasks.get(taskId);
  const nextPhotoIds = [...(task?.photo_ids ?? []), photoId];
  await db.tasks.update(taskId, { photo_ids: nextPhotoIds, updated_at: timestamp });
  
  // Compress in background (non-blocking) - update when done
  // This provides instant feedback while compression happens async
  compressImage(blob, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    initialQuality: 0.80,
  }).then((compressedBlob) => {
    // Update with compressed version when ready
    db.task_photos.update(photoId, {
      image_blob: compressedBlob,
      updated_at: nowIso(),
    }).catch((error) => {
      console.error('[TaskCreateView] Failed to update compressed image:', error);
    });
  }).catch((error) => {
    console.error('[TaskCreateView] Background compression failed:', error);
    // Keep original if compression fails
  });
};

const deletePhoto = async (photoId: string) => {
  if (!taskRecord.value) return;
  
  const timestamp = nowIso();
  
  // Soft delete the photo
  await db.task_photos.update(photoId, {
    deleted_at: timestamp,
    updated_at: timestamp,
  });
  
  // Remove photo_id from task's photo_ids array
  const currentPhotoIds = taskRecord.value.photo_ids ?? [];
  const updatedPhotoIds = currentPhotoIds.filter((id) => id !== photoId);
  await db.tasks.update(taskRecord.value.id, {
    photo_ids: updatedPhotoIds,
    updated_at: timestamp,
  });
  
  // If photo is already synced to Supabase Storage, delete it from storage
  const photo = await db.task_photos.get(photoId);
  if (photo?.storage_path && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('task-photos')
        .remove([photo.storage_path]);
      
      if (error) {
        console.error(`[TaskCreateView] Failed to delete photo from Storage:`, error);
        console.error(`[TaskCreateView] Storage path: ${photo.storage_path}`);
      } else {
        console.log(`[TaskCreateView] ✓ Deleted photo from Storage: ${photo.storage_path}`);
        if (data && data.length > 0) {
          console.log(`[TaskCreateView] Deleted files:`, data);
        }
      }
    } catch (error) {
      console.error(`[TaskCreateView] Error deleting photo from Storage:`, error);
      // Continue even if storage deletion fails - it will be cleaned up later
    }
  } else if (photo && !photo.storage_path) {
    console.log(`[TaskCreateView] Photo not yet synced to Storage (no storage_path), skipping Storage deletion`);
  } else if (!supabase) {
    console.log(`[TaskCreateView] Supabase not configured, skipping Storage deletion`);
  }
};

// Removed sendAndBack - tasks are saved automatically when adding text/image
// The close button just navigates back

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

.notes-observation-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
}

.notes-item-text {
  white-space: pre-wrap;
  color: var(--notes-text);
  font-size: 14px;
  flex: 1;
  line-height: 1.5;
}

.notes-item-text-editable {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.notes-item-text-editable:hover {
  background: var(--notes-hover);
}

.notes-item-text-editable:active {
  background: var(--notes-panel-strong);
}

.notes-observation-delete {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid var(--notes-border);
  color: var(--notes-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 1; /* Always visible on mobile, hover on desktop */
  transition: opacity 0.2s, background 0.2s, border-color 0.2s, transform 0.1s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Hide on desktop until hover */
@media (hover: hover) and (pointer: fine) {
  .notes-observation-delete {
    opacity: 0;
  }
  
  .notes-observation-item:hover .notes-observation-delete {
    opacity: 1;
  }
  
  .notes-observation-delete:hover {
    background: rgba(220, 38, 38, 0.1);
    border-color: rgba(220, 38, 38, 0.3);
    color: #dc2626;
  }
}

/* Always visible and larger on mobile/touch devices */
@media (hover: none) and (pointer: coarse) {
  .notes-observation-delete {
    opacity: 1;
    width: 32px;
    height: 32px;
    min-width: 32px;
  }
  
  .notes-observation-delete:active {
    background: rgba(220, 38, 38, 0.15);
    border-color: rgba(220, 38, 38, 0.4);
    color: #dc2626;
    transform: scale(0.9);
  }
}

.notes-observation-delete:active {
  transform: scale(0.9);
}

.notes-item-image {
  width: 100%;
  border-radius: 12px;
  display: block;
}

.notes-observation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notes-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}

.notes-photo-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.notes-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  display: block;
}

.notes-photo-editable {
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.notes-photo-editable:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.notes-photo-editable:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.notes-photo-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.75);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 1; /* Always visible on mobile, hover on desktop */
  transition: opacity 0.2s, background 0.2s, transform 0.1s;
  touch-action: manipulation; /* Better touch handling */
  -webkit-tap-highlight-color: transparent; /* Remove tap highlight on mobile */
}

/* Hide on desktop until hover */
@media (hover: hover) and (pointer: fine) {
  .notes-photo-delete {
    opacity: 0;
  }
  
  .notes-photo-wrapper:hover .notes-photo-delete {
    opacity: 1;
  }
  
  .notes-photo-delete:hover {
    background: rgba(220, 38, 38, 0.9);
    border-color: rgba(255, 255, 255, 0.5);
  }
}

/* Always visible and larger on mobile/touch devices */
@media (hover: none) and (pointer: coarse) {
  .notes-photo-delete {
    opacity: 1;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.8);
  }
  
  .notes-photo-delete:active {
    background: rgba(220, 38, 38, 0.95);
    transform: scale(0.9);
  }
}

.notes-photo-delete:active {
  transform: scale(0.9);
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

.notes-bottom-close {
  color: var(--notes-accent);
}

.notes-bottom-send svg {
  width: 24px;
  height: 24px;
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

.notes-bottom-close {
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

.notes-sheet-row {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border: none;
  padding: 14px;
  border-radius: 12px;
  text-align: left;
  width: 100%;
  font-size: 14px;
  cursor: pointer;
}

.notes-sheet-row:hover {
  background: var(--notes-hover);
}

.notes-sheet-row-empty {
  color: var(--notes-muted);
  cursor: default;
  font-style: italic;
}

.notes-sheet-row-empty:hover {
  background: var(--notes-panel-strong);
}

.notes-sheet-cancel {
  margin-top: 8px;
  border-top: 1px solid var(--notes-border);
  padding-top: 14px;
}
</style>
