<template>
  <div class="notes-row notes-task-row">
    <div class="notes-task-header">
      <div class="notes-row-meta">
        <span>{{ formatRelativeTime(task.updated_at) }}</span>
      </div>
      <div class="notes-task-header-actions">
        <button
          class="notes-task-assign"
          type="button"
          @click.stop="$emit('assign-intervenant', task)"
          aria-label="Assign intervenant"
        >
          Assign
        </button>
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
    <div class="notes-row-text">
      <div class="notes-section">
        <div class="notes-section-header">
          <div class="notes-section-label">Observations</div>
          <button
            class="notes-section-action"
            type="button"
            aria-label="Add observation"
            @click.stop="$emit('add-text', task)"
          >
            +
          </button>
        </div>
        <div
          v-if="!taskContentMap[task.id]?.observations?.length"
          class="notes-row notes-row-empty notes-observations-clickable"
          @click.stop="$emit('manage-observations', task)"
        >
          Aucune observation.
        </div>
        <div
          v-else
          class="notes-observations notes-observations-clickable"
          @click.stop="$emit('manage-observations', task)"
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
        <div class="notes-section-header">
          <div class="notes-section-label">Photos</div>
          <button
            class="notes-section-action"
            type="button"
            aria-label="Add photo"
            @click.stop="$emit('add-photo', task)"
          >
            +
          </button>
        </div>
        <div v-if="!taskContentMap[task.id]?.photos?.length" class="notes-row notes-row-empty">
          Aucune photo.
        </div>
        <div v-else class="notes-photo-grid">
          <img
            v-for="(url, index) in taskContentMap[task.id].photos"
            :key="`${task.id}-photo-${index}`"
            class="notes-content-image"
            :src="url"
            alt="Task photo"
            @click.stop="$emit('edit-photo', { task, photoIndex: index })"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category, Intervenant, Task } from "../db/types";
import { formatRelativeTime } from "../utils/format";
import CategoryBadge from "./CategoryBadge.vue";

const props = withDefaults(
  defineProps<{
    task: Task;
    taskContentMap: Record<string, { observations: string[]; photos: string[]; photoIds: string[] }>;
    intervenants: Intervenant[];
    categories: Category[];
    showCategoryBadges?: boolean;
    showAssigneeMeta?: boolean;
    showUnassignedBadge?: boolean;
  }>(),
  {
    showUnassignedBadge: true,
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
  padding-bottom: 4px;
  border-bottom: 1px solid var(--notes-border);
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


.notes-assignee-meta {
  font-size: 11px;
  color: var(--notes-text);
  font-weight: 500;
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
  gap: 8px;
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