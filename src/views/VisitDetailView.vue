<template>
  <section class="notes-screen">
    <header class="notes-header">
      <div class="notes-header-left">
        <button class="notes-back" type="button" aria-label="Back" @click="router.back()">
          ‹
        </button>
        <div>
          <h1 class="notes-title">Visit Detail</h1>
          <div class="notes-subtitle">{{ project?.name }}</div>
        </div>
      </div>
      <button
        class="notes-action"
        type="button"
        @click="endVisit"
        :disabled="!!visit?.ended_at"
      >
        End Visit
      </button>
    </header>

    <div v-if="!visit" class="notes-list">
      <div class="notes-row notes-row-empty">Visit not found.</div>
    </div>

    <div v-else class="notes-stack">
      <div class="notes-section-label">Details</div>
      <div class="notes-list notes-form">
        <label class="notes-field">
          <span class="notes-label">Date</span>
          <input v-model="draft.date" type="date" class="notes-input" />
        </label>
        <label class="notes-field">
          <span class="notes-label">General comment</span>
          <textarea v-model="draft.comment" class="notes-textarea" rows="4" />
        </label>
      </div>

      <div class="notes-section-label">Photos</div>
      <div class="notes-list notes-form">
        <label class="notes-field">
          <span class="notes-label">Add Photo URL</span>
          <div class="notes-row-inline">
            <input v-model="photoUrl" class="notes-input" />
            <button class="notes-button" type="button" @click="addPhoto">Add</button>
          </div>
        </label>
        <div class="notes-chip-row">
          <span v-if="photos.length === 0" class="notes-row-empty">No photos yet.</span>
          <span v-for="photo in photos" :key="photo.id" class="notes-chip">
            {{ photo.url }}
          </span>
        </div>
      </div>

      <div class="notes-actions">
        <button class="notes-button notes-button-primary" @click="save">Save Changes</button>
        <router-link class="notes-button" to="/">Back</router-link>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { makeId, nowIso } from "../utils/time";

const props = defineProps<{ id: string }>();
const router = useRouter();

const visit = useLiveQuery(() => db.visits.get(props.id), null);
const project = useLiveQuery(
  async () => {
    if (!visit.value) return null;
    return db.projects.get(visit.value.project_id);
  },
  null,
);
const photos = useLiveQuery(
  () => db.visit_photos.filter((photo) => photo.visit_id === props.id).toArray(),
  [],
);

const draft = reactive({
  date: "",
  comment: "",
});

const photoUrl = ref("");

watch(
  visit,
  (value) => {
    if (!value) return;
    draft.date = value.date;
    draft.comment = value.comment ?? "";
  },
  { immediate: true },
);

const save = async () => {
  if (!visit.value) return;
  await db.visits.update(visit.value.id, {
    date: draft.date,
    comment: draft.comment,
    updated_at: nowIso(),
  });
};

const endVisit = async () => {
  if (!visit.value || visit.value.ended_at) return;
  await db.visits.update(visit.value.id, {
    ended_at: nowIso(),
    updated_at: nowIso(),
  });
};

const addPhoto = async () => {
  if (!photoUrl.value.trim()) return;
  await db.visit_photos.add({
    id: makeId(),
    visit_id: props.id,
    url: photoUrl.value.trim(),
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  });
  photoUrl.value = "";
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

.notes-action {
  color: var(--notes-accent);
  font-weight: 600;
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

.notes-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: inherit;
}

.notes-row-empty {
  color: var(--notes-muted);
  font-size: 14px;
}

.notes-form {
  gap: 16px;
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
.notes-textarea {
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

.notes-row-inline {
  display: flex;
  gap: 10px;
  align-items: center;
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

.notes-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.notes-chip {
  background: var(--notes-chip);
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
}
</style>
