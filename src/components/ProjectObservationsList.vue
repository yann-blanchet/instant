<template>
  <div>
    <div class="notes-section-label">{{ title || (status === 'done' ? 'Done observations' : 'Observations') }}</div>
    <div class="notes-section-header">
      <div class="notes-filter-badges">
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'open' }"
          type="button"
          @click="filterMode = 'open'"
        >
          Open <span class="notes-badge-count">{{ openTasksCount }}</span>
        </button>
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'date' }"
          type="button"
          @click="filterMode = 'date'"
        >
          Non assignée <span class="notes-badge-count">{{ nonAssignedTasksCount }}</span>
        </button>
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'assigned' }"
          type="button"
          @click="filterMode = 'assigned'"
        >
          Assignée <span class="notes-badge-count">{{ assignedTasksCount }}</span>
        </button>
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'done' }"
          type="button"
          @click="filterMode = 'done'"
        >
          Done <span class="notes-badge-count">{{ doneTasksCount }}</span>
        </button>
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'summary' }"
          type="button"
          @click="filterMode = 'summary'"
        >
          Summary <span class="notes-badge-count">{{ summaryTasksCount }}</span>
        </button>
      </div>
    </div>

    <div class="notes-list" :class="{ 'notes-task-list-container': !inSheet, 'notes-sheet-task-list': inSheet }">
      <div v-if="sortedTasks.length === 0" class="notes-row notes-row-empty">
        Aucune tâche.
      </div>
      <template v-if="filterMode === 'summary' && groupedTasksByIntervenant">
        <div
          v-for="group in groupedTasksByIntervenant"
          :key="group.intervenantId || 'unassigned'"
          class="notes-assignee-group"
        >
          <div class="notes-assignee-header">
            <span class="notes-assignee-header-name">{{ group.intervenantName }}</span>
            <div v-if="group.intervenantCategories.length > 0" class="notes-assignee-header-badges">
              <CategoryBadge
                v-for="category in group.intervenantCategories"
                :key="category.id"
                :category="category"
                variant="header"
              />
            </div>
          </div>
          <TaskCard
            v-for="task in group.tasks"
            :key="task.id"
            :task="task"
            :task-content-map="taskContentMap"
            :intervenants="intervenants"
            :categories="categories"
            :visits="visits"
            :show-category-badges="false"
            :show-assignee-meta="false"
            :show-unassigned-badge="false"
            :read-only="true"
            @task-click="$emit('task-click', $event)"
            @image-click="$emit('image-click', $event)"
          />
        </div>
      </template>
      <template v-else>
        <TaskCard
          v-for="task in sortedTasks"
          :key="task.id"
          :task="task"
          :task-content-map="taskContentMap"
          :intervenants="intervenants"
          :categories="categories"
          :visits="visits"
          :show-category-badges="filterMode === 'date' || filterMode === 'assigned'"
          :show-assignee-meta="filterMode === 'open' || filterMode === 'assigned'"
          :show-unassigned-badge="filterMode === 'open'"
          @task-click="$emit('task-click', $event)"
          @image-click="$emit('image-click', $event)"
          @add-text="$emit('add-text', $event)"
          @add-photo="$emit('add-photo', $event)"
          @edit-photo="$emit('edit-photo', $event)"
          @manage-photos="$emit('manage-photos', $event)"
        @manage-observations="$emit('manage-observations', $event)"
        @assign-intervenant="$emit('assign-intervenant', $event)"
        @task-menu-click="$emit('task-menu-click', $event)"
        @mark-as-done="$emit('mark-as-done', $event)"
        @delete-task="$emit('delete-task', $event)"
      />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import type { Category, Intervenant, Task, TaskPhoto, Visit } from "../db/types";
import { formatDate, formatRelativeTime, formatVisitNumber } from "../utils/format";
import CategoryBadge from "./CategoryBadge.vue";
import TaskCard from "./TaskCard.vue";

const props = defineProps<{
  projectId: string;
  tasks: Task[];
  taskPhotos: TaskPhoto[];
  visits: Visit[];
  intervenants: Intervenant[];
  categories: Category[];
  taskContentMap: Record<string, { observations: string[]; photos: string[]; photoIds: string[] }>;
  status?: "open" | "done";
  title?: string;
  inSheet?: boolean;
}>();

const emit = defineEmits<{
  "task-click": [task: Task];
  "task-menu-click": [task: Task];
  "image-click": [url: string];
  "add-text": [task: Task];
  "add-photo": [task: Task];
  "edit-photo": [payload: { task: Task; photoIndex: number }];
  "manage-photos": [task: Task];
  "manage-observations": [task: Task];
  "assign-intervenant": [task: Task];
  "mark-as-done": [task: Task];
  "delete-task": [task: Task];
  "filter-mode-change": [mode: "open" | "done" | "assigned" | "date" | "summary"];
}>();

const filterMode = ref<"open" | "done" | "assigned" | "date" | "summary">("open");

watch(filterMode, (newMode) => {
  emit("filter-mode-change", newMode);
}, { immediate: true });

// Constants
const UNASSIGNED_LABEL = "Not assigned";
const UNASSIGNED_ID = "__unassigned__";

// Helper functions
const getTaskAssignee = (task: Task): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return props.intervenants.find((i) => i.id === task.intervenant_id) ?? null;
};

const getAssigneeId = (task: Task): string | null => {
  return task.intervenant_id || UNASSIGNED_ID;
};

const getAssigneeDisplayName = (task: Task): string => {
  const assignee = getTaskAssignee(task);
  return assignee?.name || UNASSIGNED_LABEL;
};

const isUnassigned = (assigneeId: string | null): boolean => {
  return assigneeId === null || assigneeId === UNASSIGNED_ID;
};

const filteredTasks = computed(() => {
  const statusFilter = props.status || "open";
  return props.tasks.filter((task) => task.status === statusFilter);
});

const assignedTasks = computed(() => {
  return filteredTasks.value.filter((task) => task.intervenant_id != null);
});

const unassignedTasksCount = computed(() => {
  return filteredTasks.value.filter((task) => !task.intervenant_id).length;
});

const openTasksCount = computed(() => {
  return props.tasks.filter((task) => task.status === "open").length;
});

const doneTasksCount = computed(() => {
  return props.tasks.filter((task) => task.status === "done").length;
});

const assignedTasksCount = computed(() => {
  return filteredTasks.value.filter((task) => task.intervenant_id != null).length;
});

const nonAssignedTasksCount = computed(() => {
  return filteredTasks.value.filter((task) => !task.intervenant_id).length;
});

const summaryTasksCount = computed(() => {
  return filteredTasks.value.length;
});

const sortedTasks = computed(() => {
  let tasks: Task[] = [];
  
  // Apply filtering based on filter mode
  if (filterMode.value === "done") {
    // In done filter mode, show all done tasks
    tasks = props.tasks.filter((task) => task.status === "done");
  } else {
    // For other modes, start with the status-filtered tasks
    tasks = [...filteredTasks.value];
    
    if (filterMode.value === "assigned") {
      // In assigned filter mode, only show assigned tasks
      tasks = tasks.filter((task) => task.intervenant_id != null);
    } else if (filterMode.value === "date") {
      // In date filter mode, only show not assigned tasks
      tasks = tasks.filter((task) => !task.intervenant_id);
    } else if (filterMode.value === "summary") {
      // In summary mode, show all tasks (will be grouped by intervenant)
      // No filtering needed
    }
    // In open filter mode, show all open tasks (both assigned and not assigned)
    // No filtering needed - show everything
  }
  
  // By date (descending - newest first, oldest last)
  return tasks.sort((a, b) => b.created_at.localeCompare(a.created_at));
});

const groupedTasksByIntervenant = computed(() => {
  if (filterMode.value !== "summary") return null;
  
  const groups: Array<{ 
    intervenantName: string; 
    intervenantId: string | null; 
    intervenantCategories: Category[]; 
    tasks: Task[] 
  }> = [];
  const intervenantMap = new Map<string | null, Task[]>();
  
  // Group tasks by intervenant ID
  sortedTasks.value.forEach((task) => {
    const intervenantId = task.intervenant_id || null;
    
    if (!intervenantMap.has(intervenantId)) {
      intervenantMap.set(intervenantId, []);
    }
    intervenantMap.get(intervenantId)!.push(task);
  });
  
  // Convert to array and create group objects
  intervenantMap.forEach((tasks, intervenantId) => {
    const intervenant: Intervenant | null = intervenantId 
      ? props.intervenants.find(i => i.id === intervenantId) ?? null
      : null;
    
    const intervenantName = intervenant?.name || UNASSIGNED_LABEL;
    
    groups.push({
      intervenantName,
      intervenantId: intervenantId,
      intervenantCategories: getIntervenantCategories(intervenant),
      tasks: tasks.sort((a, b) => b.created_at.localeCompare(a.created_at)), // Sort by date descending
    });
  });
  
  // Sort groups alphabetically by intervenant name
  return groups.sort((a, b) => {
    return a.intervenantName.localeCompare(b.intervenantName);
  });
});

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

</script>

<style>
.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}

.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.notes-count-badge {
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
}

.notes-filter-badges {
  display: flex;
  gap: 4px;
  align-items: center;
}

.notes-filter-badge {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-muted);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-badge-count {
  display: inline-block;
  background: var(--notes-panel-strong);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 2px 5px;
  font-size: 9px;
  font-weight: 700;
  margin-left: 3px;
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

.notes-filter-badge:last-child {
  display: none;
}

@media (min-width: 769px) {
  .notes-filter-badge:last-child {
    display: block;
  }
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

.notes-sheet-task-list {
  flex: 1;
  overflow-y: auto;
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
  align-items: stretch;
  gap: 12px;
  min-height: 60px;
}

.notes-task-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  min-width: 100px;
  align-self: stretch;
}

.notes-task-right-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.notes-task-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}


.notes-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.notes-row-subtitle {
  font-size: 12px;
  color: var(--notes-text);
}

.notes-row-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 11px;
  color: var(--notes-muted);
}

.notes-assignee-meta {
  font-size: 11px;
  color: var(--notes-text);
  font-weight: 500;
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
</style>
