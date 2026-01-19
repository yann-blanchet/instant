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
      <router-link
        v-for="task in activeTaskGroup.items"
        :key="task.id"
        :to="`/tasks/${task.id}`"
        class="notes-row"
      >
        <div class="notes-row-left">
          <span class="notes-folder">📁</span>
          <div class="notes-row-text">
            <div class="notes-row-title">
              {{ task.description || "Tâche" }}
            </div>
            <div class="notes-row-subtitle">Mis à jour {{ task.updated_at }}</div>
          </div>
        </div>
        <div class="notes-row-right">
          <span class="notes-chevron">›</span>
        </div>
      </router-link>
    </div>

    <button
      class="notes-fab"
      type="button"
      aria-label="Add task"
      @click="router.push(`/projects/${props.id}/tasks/new`)"
    >
      +
    </button>

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
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import type { Task } from "../db/types";

const props = defineProps<{ id: string }>();
const router = useRouter();
const activeTaskTab = ref<"open" | "done">("open");
const isActionsSheetOpen = ref(false);

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
  color: var(--notes-muted);
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
</style>
