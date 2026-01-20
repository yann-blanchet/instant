<template>
  <div>
    <div class="notes-section-header">
      <div class="notes-section-label">{{ title || (status === 'done' ? 'Done observations' : 'Open observations') }} <span class="notes-count-badge">{{ sortedTasks.length }}</span></div>
      <div class="notes-filter-badges">
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'date' }"
          type="button"
          @click="filterMode = 'date'"
        >
          Date
        </button>
        <button
          class="notes-filter-badge"
          :class="{ active: filterMode === 'assignee' }"
          type="button"
          @click="filterMode = 'assignee'"
        >
          Assignee
        </button>
      </div>
    </div>

    <div class="notes-list" :class="{ 'notes-task-list-container': !inSheet, 'notes-sheet-task-list': inSheet }">
      <div v-if="sortedTasks.length === 0" class="notes-row notes-row-empty">
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
                  :style="category.color ? { borderColor: category.color } : {}"
                >
                  {{ category.name }}
                </span>
            </div>
          </div>
          <div
            v-for="task in group.tasks"
            :key="task.id"
            class="notes-row notes-task-row"
            @click="$emit('task-click', task)"
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
                  @click.stop="$emit('image-click', url)"
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
            <div class="notes-task-right">
              <button
                class="notes-task-menu"
                type="button"
                @click.stop.prevent="$emit('task-menu-click', task)"
                aria-label="Task actions"
              >
                ⋯
              </button>
              <div class="notes-task-right-content">
                <div v-if="filterMode === 'date' && (getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0 || !getTaskAssignee(task))" class="notes-task-category-badges">
                  <template v-if="getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0">
                    <span
                      v-for="category in getIntervenantCategories(getTaskAssignee(task))"
                      :key="category.id"
                      class="notes-task-category-badge"
                      :style="category.color ? { borderColor: category.color } : {}"
                    >
                      {{ category.name }}
                    </span>
                  </template>
                  <span
                    v-else-if="!getTaskAssignee(task)"
                    class="notes-task-category-badge"
                  >
                    Générale
                  </span>
                </div>
                <div class="notes-row-meta">
                  <span v-if="filterMode !== 'assignee' && getTaskAssignee(task)" class="notes-assignee-meta">
                    {{ getTaskAssignee(task)?.name }}
                  </span>
                  <span>{{ formatRelativeTime(task.updated_at) }}</span>
                </div>
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
            @click="$emit('task-click', task)"
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
                  @click.stop="$emit('image-click', url)"
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
            <div class="notes-task-right">
              <button
                class="notes-task-menu"
                type="button"
                @click.stop.prevent="$emit('task-menu-click', task)"
                aria-label="Task actions"
              >
                ⋯
              </button>
              <div class="notes-task-right-content">
                <div v-if="filterMode === 'date' && (getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0 || !getTaskAssignee(task))" class="notes-task-category-badges">
                  <template v-if="getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0">
                    <span
                      v-for="category in getIntervenantCategories(getTaskAssignee(task))"
                      :key="category.id"
                      class="notes-task-category-badge"
                      :style="category.color ? { borderColor: category.color } : {}"
                    >
                      {{ category.name }}
                    </span>
                  </template>
                  <span
                    v-else-if="!getTaskAssignee(task)"
                    class="notes-task-category-badge"
                  >
                    Générale
                  </span>
                </div>
                <div class="notes-row-meta">
                  <span v-if="filterMode !== 'assignee' && getTaskAssignee(task)" class="notes-assignee-meta">
                    {{ getTaskAssignee(task)?.name }}
                  </span>
                  <span>{{ formatRelativeTime(task.updated_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div
          v-for="task in sortedTasks"
          :key="task.id"
          class="notes-row notes-task-row"
          @click="$emit('task-click', task)"
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
                @click.stop="$emit('image-click', url)"
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
          <div class="notes-task-right">
            <button
              class="notes-task-menu"
              type="button"
              @click.stop.prevent="$emit('task-menu-click', task)"
              aria-label="Task actions"
            >
              ⋯
            </button>
            <div class="notes-task-right-content">
              <div v-if="filterMode === 'date' && (getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0 || !getTaskAssignee(task))" class="notes-task-category-badges">
                <template v-if="getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0">
                  <span
                    v-for="category in getIntervenantCategories(getTaskAssignee(task))"
                    :key="category.id"
                    class="notes-task-category-badge"
                    :style="category.color ? { borderColor: category.color } : {}"
                  >
                    {{ category.name }}
                  </span>
                </template>
                <span
                  v-else-if="!getTaskAssignee(task)"
                  class="notes-task-category-badge"
                >
                  Générale
                </span>
              </div>
              <div class="notes-row-meta">
                <span v-if="filterMode !== 'assignee' && getTaskAssignee(task)" class="notes-assignee-meta">
                  {{ getTaskAssignee(task)?.name }}
                </span>
                <span>{{ formatRelativeTime(task.updated_at) }}</span>
              </div>
            </div>
          </div>
        </div>
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

const props = defineProps<{
  projectId: string;
  tasks: Task[];
  taskPhotos: TaskPhoto[];
  visits: Visit[];
  intervenants: Intervenant[];
  categories: Category[];
  taskContentMap: Record<string, { observations: string[]; photos: string[] }>;
  status?: "open" | "done";
  title?: string;
  inSheet?: boolean;
}>();

const emit = defineEmits<{
  "task-click": [task: Task];
  "task-menu-click": [task: Task];
  "image-click": [url: string];
}>();

const filterMode = ref<"assignee" | "date">("date");

const getTaskAssignee = (task: Task) => {
  if (!task.intervenant_id) return null;
  return props.intervenants.find((i) => i.id === task.intervenant_id) ?? null;
};

const filteredTasks = computed(() => {
  const statusFilter = props.status || "open";
  return props.tasks.filter((task) => task.status === statusFilter);
});

const sortedTasks = computed(() => {
  const tasks = [...filteredTasks.value];
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
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

const groupedTasksByAssignee = computed(() => {
  if (filterMode.value !== "assignee") return null;
  
  const groups: Array<{ assigneeName: string; assigneeId: string | null; assigneeCategories: Category[]; tasks: Task[] }> = [];
  const assigneeMap = new Map<string | null, Task[]>();
  
  sortedTasks.value.forEach((task) => {
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
    const assignee: Intervenant | null = assigneeId ? props.intervenants.find(i => i.id === assigneeId) ?? null : null;
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

const visitNumberMap = computed(() => {
  const map = new Map<string, number | undefined>();
  props.visits.forEach((visit) => {
    map.set(visit.id, visit.visit_number);
  });
  return map;
});

const groupedTasksByVisit = computed(() => {
  if (filterMode.value !== "date") return null;
  
  const groups: Array<{ visitNumber: number | undefined; visitId: string | null; visitDate: string | null; tasks: Task[] }> = [];
  const visitMap = new Map<string | null, Task[]>();
  
  sortedTasks.value.forEach((task) => {
    // Use opened_visit_id if available, otherwise visit_id
    const taskVisitId = task.opened_visit_id || task.visit_id || null;
    
    if (!visitMap.has(taskVisitId)) {
      visitMap.set(taskVisitId, []);
    }
    visitMap.get(taskVisitId)!.push(task);
  });
  
  // Convert to array and sort by visit number (ascending, older first)
  visitMap.forEach((tasks, visitId) => {
    const visit = visitId ? props.visits.find(v => v.id === visitId) : null;
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
</script>

<style>
.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  display: flex;
  align-items: center;
  gap: 8px;
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

.notes-task-category-badge {
  background: transparent;
  color: var(--notes-text);
  border: 1px solid var(--notes-border);
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
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

.notes-assignee-header-badge {
  background: transparent;
  color: var(--notes-text);
  border: 1px solid var(--notes-border);
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
</style>
