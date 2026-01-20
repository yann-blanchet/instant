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
          <span class="notes-tag">En cours</span>
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

    <div class="notes-section-header">
      <div class="notes-section-label">Open observations <span class="notes-count-badge">{{ sortedOpenTasks.length }}</span></div>
      <button
        class="notes-filter-swap-button"
        type="button"
        @click="toggleFilterMode"
      >
        {{ filterMode === "assignee" ? "By date" : "By assignee" }}
      </button>
    </div>

    <div class="notes-list notes-task-list-container">
      <div v-if="sortedOpenTasks.length === 0" class="notes-row notes-row-empty">
        Aucune tâche.
      </div>
      <template v-if="filterMode === 'assignee' && groupedTasksByAssignee">
        <div
          v-for="group in groupedTasksByAssignee"
          :key="group.assigneeId || '__unassigned__'"
          class="notes-assignee-group"
        >
          <div class="notes-assignee-header">
            <span class="notes-assignee-header-name">{{ group.assigneeName }}</span>
            <div v-if="group.assigneeCategories.length > 0" class="notes-assignee-header-badges">
              <span
                v-for="category in group.assigneeCategories"
                :key="category.id"
                class="notes-assignee-header-badge"
                :style="category.color ? { borderLeft: `3px solid ${category.color}` } : {}"
              >
                {{ category.name }}
              </span>
            </div>
          </div>
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="notes-row notes-task-row"
            @click="openTask(task)"
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
          <div class="notes-row-meta">
            <span>{{ formatRelativeTime(task.updated_at) }}</span>
            <span v-if="getTaskAssignee(task)" class="notes-assignee-meta">
              · {{ getTaskAssignee(task)?.name }}
            </span>
            <span v-if="task.opened_visit_id || task.done_visit_id" class="notes-visit-meta">
              <span v-if="task.opened_visit_id">
                · Ouverte V{{ formatVisitNumber(visitNumberMap.get(task.opened_visit_id)) }}
              </span>
              <span v-if="task.done_visit_id">
                · Terminée V{{ formatVisitNumber(visitNumberMap.get(task.done_visit_id)) }}
              </span>
            </span>
          </div>
          <div class="notes-task-actions">
            <button
              class="notes-assign"
              type="button"
              @click.stop.prevent="openAssignSheet(task)"
            >
              Assign
            </button>
            <button
              class="notes-status"
              type="button"
              @click.stop.prevent="toggleTaskStatus(task)"
            >
              {{ task.status === "done" ? "Mark as open" : "Mark as done" }}
            </button>
            <button
              class="notes-delete"
              type="button"
              @click.stop.prevent="deleteTask(task)"
            >
              Delete
            </button>
          </div>
        </div>
          </div>
        </div>
      </template>
      <template v-else-if="filterMode === 'date' && groupedTasksByVisit">
        <div
          v-for="group in groupedTasksByVisit"
          :key="group.visitId || '__novisit__'"
          class="notes-visit-group"
        >
          <div class="notes-visit-header">
            <span class="notes-visit-header-name">
              {{ group.visitNumber != null ? `Visite ${formatVisitNumber(group.visitNumber)}` : "Sans visite" }}
              <span v-if="group.visitDate" class="notes-visit-header-date"> · {{ formatDate(group.visitDate) }}</span>
            </span>
          </div>
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="notes-row notes-task-row"
            @click="openTask(task)"
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
            <div class="notes-row-meta">
              <span>{{ formatRelativeTime(task.updated_at) }}</span>
              <span v-if="getTaskAssignee(task)" class="notes-assignee-meta">
                · {{ getTaskAssignee(task)?.name }}
              </span>
              <span v-if="task.opened_visit_id || task.done_visit_id" class="notes-visit-meta">
                <span v-if="task.opened_visit_id">
                  · Ouverte V{{ formatVisitNumber(visitNumberMap.get(task.opened_visit_id)) }}
                </span>
                <span v-if="task.done_visit_id">
                  · Terminée V{{ formatVisitNumber(visitNumberMap.get(task.done_visit_id)) }}
                </span>
              </span>
            </div>
            <div class="notes-task-actions">
              <button
                class="notes-assign"
                type="button"
                @click.stop.prevent="openAssignSheet(task)"
              >
                Assign
              </button>
              <button
                class="notes-status"
                type="button"
                @click.stop.prevent="toggleTaskStatus(task)"
              >
                {{ task.status === "done" ? "Mark as open" : "Mark as done" }}
              </button>
              <button
                class="notes-delete"
                type="button"
                @click.stop.prevent="deleteTask(task)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        </div>
      </template>
      <template v-else>
        <div
          v-for="task in sortedOpenTasks"
          :key="task.id"
          class="notes-row notes-task-row"
          @click="openTask(task)"
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
            <div class="notes-row-meta">
              <span>{{ formatRelativeTime(task.updated_at) }}</span>
              <span v-if="getTaskAssignee(task)" class="notes-assignee-meta">
                · {{ getTaskAssignee(task)?.name }}
              </span>
              <span v-if="task.opened_visit_id || task.done_visit_id" class="notes-visit-meta">
                <span v-if="task.opened_visit_id">
                  · Ouverte V{{ formatVisitNumber(visitNumberMap.get(task.opened_visit_id)) }}
                </span>
                <span v-if="task.done_visit_id">
                  · Terminée V{{ formatVisitNumber(visitNumberMap.get(task.done_visit_id)) }}
                </span>
              </span>
            </div>
            <div class="notes-task-actions">
              <button
                class="notes-assign"
                type="button"
                @click.stop.prevent="openAssignSheet(task)"
              >
                Assign
              </button>
              <button
                class="notes-status"
                type="button"
                @click.stop.prevent="toggleTaskStatus(task)"
              >
                {{ task.status === "done" ? "Mark as open" : "Mark as done" }}
              </button>
              <button
                class="notes-delete"
                type="button"
                @click.stop.prevent="deleteTask(task)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="notes-bottom-bar">
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
        <button class="notes-sheet-row" type="button" @click="openEditProject">
          Edit project
        </button>
        <button class="notes-sheet-row" type="button" @click="openProjectIntervenants">
          Intervenants
        </button>
        <button class="notes-sheet-row" type="button" @click="openDoneObservations">
          View done observations
        </button>
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

    <div
      v-if="isDoneObservationsSheetOpen"
      class="notes-sheet-backdrop notes-sheet-backdrop-fullscreen"
      @click="closeDoneObservations"
    >
      <div class="notes-sheet notes-sheet-fullscreen" @click.stop>
        <div class="notes-sheet-title">Done observations</div>
        <div class="notes-list notes-sheet-task-list">
          <div v-if="doneTasks.length === 0" class="notes-row notes-row-empty">
            Aucune observation terminée.
          </div>
          <div
            v-for="task in doneTasks"
            :key="task.id"
            class="notes-row notes-task-row"
            @click="openTask(task)"
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
              <div class="notes-row-meta">
                <span>{{ formatRelativeTime(task.updated_at) }}</span>
                <span v-if="getTaskAssignee(task)" class="notes-assignee-meta">
                  · {{ getTaskAssignee(task)?.name }}
                </span>
                <span v-if="task.opened_visit_id || task.done_visit_id" class="notes-visit-meta">
                  <span v-if="task.opened_visit_id">
                    · Ouverte V{{ formatVisitNumber(visitNumberMap.get(task.opened_visit_id)) }}
                  </span>
                  <span v-if="task.done_visit_id">
                    · Terminée V{{ formatVisitNumber(visitNumberMap.get(task.done_visit_id)) }}
                  </span>
                </span>
              </div>
              <div class="notes-task-actions">
                <button
                  class="notes-status"
                  type="button"
                  @click.stop.prevent="toggleTaskStatus(task)"
                >
                  Mark as open
                </button>
                <button
                  class="notes-delete"
                  type="button"
                  @click.stop.prevent="deleteTask(task)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="notes-sheet-actions">
          <button class="notes-button" type="button" @click="closeDoneObservations">
            Close
          </button>
        </div>
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
import ProjectFormSheet from "../components/ProjectFormSheet.vue";
import type { Category, Intervenant, Task, TaskPhoto } from "../db/types";
import { formatDate, formatRelativeTime, formatVisitNumber } from "../utils/format";
import { makeId, nowIso, todayIso } from "../utils/time";

const props = defineProps<{ id: string }>();
const router = useRouter();
const filterMode = ref<"assignee" | "date">("date");
const isActionsSheetOpen = ref(false);
const isEditProjectSheetOpen = ref(false);
const isProjectIntervenantsSheetOpen = ref(false);
const isDoneObservationsSheetOpen = ref(false);
const isAssignSheetOpen = ref(false);
const assigningTask = ref<Task | null>(null);
const isImageModalOpen = ref(false);
const selectedImageUrl = ref<string | null>(null);
const projectIntervenantIds = ref<string[]>([]);


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

const sortedOpenTasks = computed(() => {
  const tasks = [...openTasks.value];
  if (filterMode.value === "assignee") {
    return tasks.sort((a, b) => {
      const aAssignee = getTaskAssignee(a)?.name || "";
      const bAssignee = getTaskAssignee(b)?.name || "";
      if (aAssignee === bAssignee) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (!aAssignee) return 1;
      if (!bAssignee) return -1;
      return aAssignee.localeCompare(bAssignee);
    });
  } else {
    // By date (ascending)
    return tasks.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
});

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return categories.value.filter((c) => intervenant.category_ids?.includes(c.id));
};

const groupedTasksByAssignee = computed(() => {
  if (filterMode.value !== "assignee") return null;
  
  const groups: Array<{ assigneeName: string; assigneeId: string | null; assigneeCategories: Category[]; tasks: Task[] }> = [];
  const assigneeMap = new Map<string | null, Task[]>();
  
  sortedOpenTasks.value.forEach((task) => {
    const assignee = getTaskAssignee(task);
    const assigneeId = assignee?.id || null;
    const assigneeName = assignee?.name || "Générale";
    
    if (!assigneeMap.has(assigneeId)) {
      assigneeMap.set(assigneeId, []);
    }
    assigneeMap.get(assigneeId)!.push(task);
  });
  
  // Convert to array and sort by assignee name
  assigneeMap.forEach((tasks, assigneeId) => {
    const assignee = assigneeId ? intervenants.value.find(i => i.id === assigneeId) : null;
    groups.push({
      assigneeName: assignee?.name || "Générale",
      assigneeId,
      assigneeCategories: getIntervenantCategories(assignee),
      tasks,
    });
  });
  
  // Sort groups: Générale last, others alphabetically
  return groups.sort((a, b) => {
    if (a.assigneeName === "Générale") return 1;
    if (b.assigneeName === "Générale") return -1;
    return a.assigneeName.localeCompare(b.assigneeName);
  });
});

const groupedTasksByVisit = computed(() => {
  if (filterMode.value !== "date") return null;
  
  const groups: Array<{ visitNumber: number | undefined; visitId: string | null; visitDate: string | null; tasks: Task[] }> = [];
  const visitMap = new Map<string | null, Task[]>();
  
  sortedOpenTasks.value.forEach((task) => {
    // Use opened_visit_id if available, otherwise visit_id
    const taskVisitId = task.opened_visit_id || task.visit_id || null;
    
    if (!visitMap.has(taskVisitId)) {
      visitMap.set(taskVisitId, []);
    }
    visitMap.get(taskVisitId)!.push(task);
  });
  
  // Convert to array and sort by visit number (descending, newest first)
  visitMap.forEach((tasks, visitId) => {
    const visit = visitId ? visits.value.find(v => v.id === visitId) : null;
    groups.push({
      visitNumber: visit?.visit_number,
      visitId,
      visitDate: visit?.date || null,
      tasks: tasks.sort((a, b) => a.created_at.localeCompare(b.created_at)), // Sort tasks within group by date
    });
  });
  
  // Sort groups: null/undefined visit numbers last, others by visit number ascending (older first)
  return groups.sort((a, b) => {
    if (a.visitNumber == null && b.visitNumber == null) return 0;
    if (a.visitNumber == null) return 1;
    if (b.visitNumber == null) return -1;
    return a.visitNumber - b.visitNumber; // Ascending order (older first)
  });
});

const toggleFilterMode = () => {
  filterMode.value = filterMode.value === "assignee" ? "date" : "assignee";
};


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

const openDoneObservations = () => {
  isActionsSheetOpen.value = false;
  isDoneObservationsSheetOpen.value = true;
};

const closeDoneObservations = () => {
  isDoneObservationsSheetOpen.value = false;
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
  router.push(`/projects/${props.id}/tasks/new?action=text`);
};

const openAddTaskWithImage = () => {
  router.push(`/projects/${props.id}/tasks/new?action=image`);
};

onBeforeUnmount(() => {
  revokeTaskContentUrls();
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

.notes-sheet-row.active {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
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

.notes-task-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--notes-border);
  padding-top: 8px;
}

.notes-task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.notes-filter-swap-button {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.notes-filter-swap-button:hover {
  background: var(--notes-hover);
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
  color: var(--notes-accent-contrast);
  font-weight: 600;
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
