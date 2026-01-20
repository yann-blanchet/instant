<template>
  <section class="notes-screen">
    <header class="notes-header">
      <h1 class="notes-title">Projets</h1>
      <router-link class="notes-action" to="/settings" aria-label="Settings">
        ⚙︎
      </router-link>
    </header>

    <div class="notes-search">
      <span class="notes-search-icon">🔎</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Recherche"
        class="notes-search-input"
      />
      <span class="notes-search-mic">🎤</span>
    </div>

    <div class="notes-list">
      <router-link
        v-for="project in filteredProjects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="notes-row"
      >
        <div class="notes-row-left">
          <span class="notes-folder">📁</span>
          <div class="notes-row-text">
            <div class="notes-row-title">{{ project.name }}</div>
            <div class="notes-row-subtitle">{{ project.address }}</div>
          </div>
        </div>
        <div class="notes-row-right">
          <span class="notes-count">{{ taskCounts[project.id] ?? 0 }}</span>
          <span class="notes-chevron">›</span>
        </div>
      </router-link>
    </div>

    <button
      class="notes-fab"
      type="button"
      aria-label="Add project"
      @click="isCreateProjectOpen = true"
    >
      +
    </button>

    <ProjectFormSheet
      :open="isCreateProjectOpen"
      title="Add project"
      :name="createProjectForm.name"
      :address="createProjectForm.address"
      @close="closeCreateProject"
      @save="saveCreateProject"
    />

  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import ProjectFormSheet from "../components/ProjectFormSheet.vue";
import { makeId, nowIso } from "../utils/time";

const searchQuery = ref("");
const isCreateProjectOpen = ref(false);

const createProjectForm = reactive({
  name: "",
  address: "",
});

const projects = useLiveQuery(
  () => db.projects.filter((item) => !item.deleted_at).toArray(),
  [],
);

const tasks = useLiveQuery(
  () => db.tasks.filter((item) => !item.deleted_at).toArray(),
  [],
);

const filteredProjects = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return projects.value;
  return projects.value.filter(
    (project) =>
      project.name.toLowerCase().includes(query) ||
      project.address.toLowerCase().includes(query),
  );
});

const taskCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const task of tasks.value) {
    if (!task.project_id) continue;
    counts[task.project_id] = (counts[task.project_id] ?? 0) + 1;
  }
  return counts;
});

const closeCreateProject = () => {
  isCreateProjectOpen.value = false;
};

const saveCreateProject = async (payload: { name: string; address: string }) => {
  const name = payload.name.trim();
  const address = payload.address.trim();
  if (!name) return;
  const timestamp = nowIso();
  await db.projects.add({
    id: makeId(),
    name,
    address,
    intervenant_ids: [],
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  });
  createProjectForm.name = "";
  createProjectForm.address = "";
  isCreateProjectOpen.value = false;
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
}

.notes-title {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.notes-action {
  color: var(--notes-accent);
  font-weight: 700;
  font-size: 32px;
  line-height: 1;
  padding: 2px 8px;
}


.notes-search {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--notes-panel);
  border-radius: 14px;
  padding: 10px 12px;
  gap: 10px;
}

.notes-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--notes-text);
  font-size: 16px;
}

.notes-search-input::placeholder {
  color: var(--notes-muted);
}

.notes-search-icon,
.notes-search-mic {
  color: var(--notes-muted);
}

.notes-section-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--notes-muted);
  margin-top: 4px;
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
}

.notes-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--notes-muted);
  font-size: 14px;
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

.notes-fab {
  position: fixed;
  right: 20px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
  font-size: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
