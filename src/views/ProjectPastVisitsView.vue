<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.back()">
          ‹
        </button>
        <div>
          <h1 class="notes-title">Visites</h1>
          <div class="notes-subtitle">{{ project?.name }}</div>
        </div>
      </div>
    </header>

    <div class="notes-list">
      <div v-if="visitList.length === 0" class="notes-row notes-row-empty">
        Aucune visite.
      </div>
      <router-link
        v-for="visit in visitList"
        :key="visit.id"
        :to="`/visits/${visit.id}`"
        class="notes-row"
      >
        <div class="notes-row-left">
          <span class="notes-folder">📁</span>
          <div class="notes-row-text">
          <div class="notes-row-title">
            Visite {{ formatVisitNumber(visit.visit_number) }}
          </div>
          <div class="notes-row-subtitle">
            {{ visit.date }} · {{ visit.comment || "Visite" }}
            <span v-if="visit.id === ongoingVisit?.id">· En cours</span>
          </div>
          </div>
        </div>
        <div class="notes-row-right">
          <span v-if="visit.id === ongoingVisit?.id" class="notes-tag">En cours</span>
          <span class="notes-chevron">›</span>
        </div>
      </router-link>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { formatVisitNumber } from "../utils/format";

const props = defineProps<{ id: string }>();
const router = useRouter();

const project = useLiveQuery(
  () => db.projects.get(props.id),
  undefined,
);

const visits = useLiveQuery(
  () =>
    db.visits
      .filter((visit) => !visit.deleted_at && visit.project_id === props.id)
      .toArray(),
  [],
);


const visitList = computed(() => {
  const items = visits.value.filter((visit) => visit.ended_at);
  return items.sort((a, b) => {
    return b.date.localeCompare(a.date);
  });
});

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
  padding: 16px;
}

</style>
