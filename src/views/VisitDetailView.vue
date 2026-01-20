<template>
  <section class="notes-screen notes-bottom-sheet">
    <div class="notes-sheet-handle" aria-hidden="true"></div>
    <header class="notes-header">
      <div class="notes-header-left">
        <div>
          <h1 class="notes-title">
            Visite {{ formatVisitNumber(visit?.visit_number) }}
          </h1>
          <div class="notes-subtitle">{{ project?.name }}</div>
        </div>
      </div>
      <div class="notes-header-actions">
        <button class="notes-action" type="button" @click="exportVisitPdf">
          PDF
        </button>
        <button
          class="notes-action"
          type="button"
          @click="endVisit"
          :disabled="!!visit?.ended_at"
        >
          End Visit
        </button>
      </div>
    </header>

    <div v-if="!visit" class="notes-list">
      <div class="notes-row notes-row-empty">Visit not found.</div>
    </div>

    <div v-else class="notes-stack">
      <div class="notes-list notes-form">
        <label class="notes-field">
          <span class="notes-label">Date</span>
          <input v-model="draft.date" type="date" class="notes-input" />
        </label>
        <label class="notes-field">
          <span class="notes-label">Conclusion</span>
          <textarea v-model="draft.conclusion" class="notes-textarea" rows="3" />
        </label>
      </div>

    </div>

    <div class="notes-bottom-bar">
      <button class="notes-bottom-cancel" type="button" @click="handleBack">
        Cancel
      </button>
      <button class="notes-bottom-save" type="button" @click="save">
        Save
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import { formatVisitNumber } from "../utils/format";
import { nowIso } from "../utils/time";

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
const openObservations = useLiveQuery(
  async () => {
    if (!visit.value) return [] as string[];
    const tasks = await db.tasks
      .filter(
        (task) =>
          !task.deleted_at &&
          task.status === "open" &&
          task.visit_id === visit.value?.id,
      )
      .toArray();
    return tasks.flatMap((task) => task.observations ?? []);
  },
  [] as string[],
);

const draft = reactive({
  date: "",
  conclusion: "",
});


watch(
  visit,
  (value) => {
    if (!value) return;
    draft.date = value.date;
    draft.conclusion = value.conclusion ?? "";
  },
  { immediate: true },
);

const save = async () => {
  if (!visit.value) return;
  await db.visits.update(visit.value.id, {
    date: draft.date,
    conclusion: draft.conclusion,
    updated_at: nowIso(),
  });
  handleBack();
};

const handleBack = () => {
  router.back();
};

const endVisit = async () => {
  if (!visit.value || visit.value.ended_at) return;
  await db.visits.update(visit.value.id, {
    ended_at: nowIso(),
    updated_at: nowIso(),
  });
};


const exportVisitPdf = async () => {
  if (!visit.value) return;
  const title = `Visite ${formatVisitNumber(visit.value.visit_number)}`;
  const observations = openObservations.value;
  const visitId = visit.value.id;
  const statusTasks = await db.tasks
    .filter(
      (task) =>
        !task.deleted_at &&
        (task.opened_visit_id === visitId || task.done_visit_id === visitId),
    )
    .toArray();
  const statusLines = statusTasks.map((task) => {
    const fromStatus = task.done_visit_id === visitId ? "Open" : "—";
    const toStatus = task.done_visit_id === visitId ? "Done" : "Open";
    return {
      label: (task.observations?.[0] ?? "Observation").slice(0, 120),
      fromStatus,
      toStatus,
    };
  });
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          h2 { font-size: 14px; text-transform: uppercase; color: #666; margin: 20px 0 8px; }
          ul { padding-left: 16px; }
          li { margin-bottom: 6px; }
          .status-line { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div>${project.value?.name ?? ""}</div>
        <div>${visit.value.date}</div>
        <h2>Observations</h2>
        ${
          observations.length
            ? `<ul>${observations.map((o) => `<li>${o}</li>`).join("")}</ul>`
            : "<div>No open observations.</div>"
        }
        <h2>Changements de statut</h2>
        ${
          statusLines.length
            ? statusLines
                .map(
                  (line) =>
                    `<div class="status-line">${line.label}: ${line.fromStatus} → ${line.toStatus}</div>`,
                )
                .join("")
            : "<div>Aucun changement de statut.</div>"
        }
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
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

.notes-bottom-sheet {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.45);
  padding-bottom: calc(36px + env(safe-area-inset-bottom));
}

.notes-sheet-handle {
  width: 48px;
  height: 5px;
  border-radius: 999px;
  background: var(--notes-border);
  margin: 10px auto 6px;
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
  gap: 12px;
  justify-content: space-between;
}

.notes-bottom-cancel,
.notes-bottom-save {
  flex: 1;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
}

.notes-bottom-cancel {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
}

.notes-bottom-save {
  border: 2px solid var(--notes-accent);
  background: #000;
  color: var(--notes-accent);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.notes-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
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
