<template>
  <div class="notes-row notes-task-row">
    <div class="notes-task-header">
      <div class="notes-row-meta">
        <span class="notes-task-version">{{ taskVersion }}</span>
        <span>{{ formatRelativeTime(task.updated_at) }}</span>
        <div v-if="showAssigneeMeta && task.intervenant_id" class="notes-task-category-badges">
          <CategoryBadge
            v-for="category in getIntervenantCategories(getTaskAssignee(task))"
            :key="category.id"
            :category="category"
            variant="header"
          />
        </div>
      </div>
      <div v-if="!readOnly" class="notes-task-header-actions">
        <!-- Desktop: Show individual buttons -->
        <div class="notes-task-header-actions-desktop">
          <button
            v-if="showAssigneeMeta && task.intervenant_id"
            class="notes-task-reassign"
            type="button"
            @click.stop="$emit('assign-intervenant', task)"
            aria-label="Reassign intervenant"
          >
            Reassign
          </button>
          <button
            v-else
            class="notes-task-assign"
            type="button"
            @click.stop="$emit('assign-intervenant', task)"
            aria-label="Assign intervenant"
          >
            Assign
          </button>
          <button
            v-if="task.intervenant_id && task.status === 'open'"
            class="notes-task-mark-done"
            type="button"
            @click.stop="$emit('mark-as-done', task)"
            aria-label="Mark as done"
          >
            ✓
          </button>
          <button
            class="notes-task-delete"
            type="button"
            @click.stop="$emit('delete-task', task)"
            aria-label="Delete task"
          >
            ✕
          </button>
        </div>
        <!-- Mobile: Show 3-dots menu -->
        <button
          class="notes-task-menu"
          type="button"
          @click.stop.prevent="$emit('task-menu-click', task)"
          aria-label="Task actions"
        >
          ⋯
        </button>
      </div>
    </div>
    <div v-if="task.status === 'open' && !readOnly" class="notes-task-secondary-row">
      <button
        class="notes-task-secondary-action"
        type="button"
        @click.stop="$emit('add-text', task)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>Add note</span>
      </button>
      <button
        class="notes-task-secondary-action"
        type="button"
        @click.stop="$emit('add-photo', task)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>Add photo</span>
      </button>
    </div>
    <div class="notes-row-text">
      <div class="notes-section">
        <div
          v-if="taskContentMap[task.id]?.observations?.length"
          class="notes-observations"
          :class="{ 'notes-observations-clickable': !readOnly }"
          @click.stop="!readOnly && $emit('manage-observations', task)"
        >
          <div
            v-for="(text, index) in taskContentMap[task.id].observations"
            :key="`${task.id}-obs-${index}`"
            class="notes-row-subtitle"
          >
            {{ text }}
          </div>
        </div>
      </div>

      <div class="notes-section">
        <div v-if="taskContentMap[task.id]?.photos?.length" class="notes-photo-grid">
          <img
            v-for="(url, index) in taskContentMap[task.id].photos"
            :key="`${task.id}-photo-${index}`"
            class="notes-content-image"
            :class="{ 'notes-content-image-clickable': !readOnly }"
            :src="url"
            alt="Task photo"
            @click.stop="!readOnly && $emit('edit-photo', { task, photoIndex: index })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category, Intervenant, Task, Visit } from "../db/types";
import { formatRelativeTime, formatVisitNumber } from "../utils/format";
import CategoryBadge from "./CategoryBadge.vue";

const props = withDefaults(
  defineProps<{
    task: Task;
    taskContentMap: Record<string, { observations: string[]; photos: string[]; photoIds: string[] }>;
    intervenants: Intervenant[];
    categories: Category[];
    visits: Visit[];
    showCategoryBadges?: boolean;
    showAssigneeMeta?: boolean;
    showUnassignedBadge?: boolean;
    readOnly?: boolean;
  }>(),
  {
    showUnassignedBadge: true,
    readOnly: false,
  }
);

const emit = defineEmits<{
  "task-click": [task: Task];
  "task-menu-click": [task: Task];
  "image-click": [url: string];
  "add-text": [task: Task];
  "add-photo": [task: Task];
  "edit-photo": [payload: { task: Task; photoIndex: number }];
  "manage-observations": [task: Task];
  "assign-intervenant": [task: Task];
  "mark-as-done": [task: Task];
  "delete-task": [task: Task];
}>();

const UNASSIGNED_LABEL = "Not assigned";

const getTaskAssignee = (task: Task): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return props.intervenants.find((i) => i.id === task.intervenant_id) ?? null;
};

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

const taskVersion = computed(() => {
  const visitId = props.task.opened_visit_id || props.task.visit_id;
  if (!visitId) return "v1";
  const visit = props.visits.find((v) => v.id === visitId);
  if (!visit?.visit_number) return "v1";
  return `v${formatVisitNumber(visit.visit_number)}`;
});
</script>

<style scoped>
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
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  min-height: 60px;
}

.notes-task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 0;
  border-bottom: none;
  margin-left: -12px;
  margin-right: -12px;
  margin-top: -10px;
  padding-left: 12px;
  padding-right: 12px;
  padding-top: 4px;
  min-height: 20px;
}

.notes-row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.notes-row-subtitle {
  font-size: 12px;
  color: var(--notes-text);
}

.notes-row-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--notes-muted);
}

.notes-task-version {
  font-size: 11px;
  color: var(--notes-text);
  font-weight: 600;
  opacity: 1;
}


.notes-task-category-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.notes-clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.notes-clickable:hover {
  opacity: 0.7;
}


.notes-task-header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notes-task-header-actions-desktop {
  display: none;
  align-items: center;
  gap: 16px;
}

.notes-task-menu {
  display: block;
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 18px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.notes-task-menu:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

@media (min-width: 768px) {
  .notes-task-header-actions-desktop {
    display: flex;
  }
  
  .notes-task-menu {
    display: none;
  }
}

.notes-task-secondary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  margin-left: -12px;
  margin-right: -12px;
  margin-top: -4px;
  padding-left: 12px;
  padding-right: 12px;
  background: var(--notes-panel-strong);
  border-radius: 0 0 6px 6px;
  border-top: 1px solid var(--notes-border);
}

.notes-task-secondary-action {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--notes-muted);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.notes-task-secondary-action:hover {
  background: var(--notes-hover);
  color: var(--notes-text);
}

.notes-task-secondary-action svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.notes-task-assign {
  background: transparent;
  border: 1px solid var(--notes-border);
  color: var(--notes-text);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.notes-task-assign:hover {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-task-reassign {
  background: transparent;
  border: 1px solid var(--notes-border);
  color: var(--notes-text);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.notes-task-reassign:hover {
  background: var(--notes-hover);
  border-color: var(--notes-accent);
}

.notes-task-mark-done {
  background: transparent;
  border: 1px solid var(--notes-accent);
  color: var(--notes-accent);
  font-size: 16px;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.notes-task-mark-done:hover {
  background: var(--notes-accent);
  color: var(--notes-accent-contrast);
}

.notes-task-delete {
  background: transparent;
  border: none;
  color: #ff6b6b;
  font-size: 16px;
  font-weight: 600;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  transition: all 0.2s;
}

.notes-task-delete:hover {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b;
}

.notes-observations {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 2px;
}

.notes-observations-clickable {
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
}

.notes-observations-clickable:hover {
  background: var(--notes-hover);
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
}

.notes-content-image-clickable {
  cursor: pointer;
}

.notes-section {
  margin-bottom: 12px;
}

.notes-section:last-child {
  margin-bottom: 0;
}

.notes-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.notes-section-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  font-weight: 600;
}

.notes-section-action {
  background: transparent;
  border: none;
  color: var(--notes-accent);
  font-size: 18px;
  font-weight: 600;
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notes-section-action:hover {
  background: var(--notes-hover);
}

.notes-row-empty {
  color: var(--notes-muted);
  font-size: 12px;
  padding: 4px 0;
}
</style>