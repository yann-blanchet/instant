<template>
  <div class="notes-row notes-task-row">
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
        <div v-if="!taskContentMap[task.id]?.observations?.length" class="notes-row notes-row-empty">
          Aucune observation.
        </div>
        <div v-else class="notes-observations">
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
    <div class="notes-task-bottom" @click="$emit('task-click', task)">
      <div
        v-if="showCategoryBadges && (getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0 || !getTaskAssignee(task))"
        class="notes-task-category-badges"
      >
        <template v-if="getTaskAssignee(task) && getIntervenantCategories(getTaskAssignee(task)).length > 0">
          <CategoryBadge
            v-for="category in getIntervenantCategories(getTaskAssignee(task))"
            :key="category.id"
            :category="category"
            variant="task"
          />
        </template>
        <CategoryBadge
          v-else-if="!getTaskAssignee(task)"
          :label="UNASSIGNED_LABEL"
          variant="task"
        />
      </div>
      <div class="notes-row-meta">
        <span v-if="showAssigneeMeta && getTaskAssignee(task)" class="notes-assignee-meta">
          {{ getTaskAssignee(task)?.name }}
        </span>
        <span>{{ formatRelativeTime(task.updated_at) }}</span>
      </div>
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
</template>

<script setup lang="ts">
import type { Category, Intervenant, Task } from "../db/types";
import { formatRelativeTime } from "../utils/format";
import CategoryBadge from "./CategoryBadge.vue";

const props = defineProps<{
  task: Task;
  taskContentMap: Record<string, { observations: string[]; photos: string[]; photoIds: string[] }>;
  intervenants: Intervenant[];
  categories: Category[];
  showCategoryBadges?: boolean;
  showAssigneeMeta?: boolean;
}>();

const emit = defineEmits<{
  "task-click": [task: Task];
  "task-menu-click": [task: Task];
  "image-click": [url: string];
  "add-text": [task: Task];
  "add-photo": [task: Task];
  "edit-photo": [payload: { task: Task; photoIndex: number }];
}>();

const UNASSIGNED_LABEL = "Générale";

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

.notes-task-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--notes-border);
  flex-wrap: wrap;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 0 0 8px 8px;
  margin-left: -12px;
  margin-right: -12px;
  margin-bottom: -10px;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 10px;
}

.notes-task-bottom:hover {
  background: var(--notes-hover);
}

.notes-task-category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
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
  margin-left: auto;
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