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

    <div v-else>
      <div class="notes-tabs">
        <button
          class="notes-tab"
          :class="{ active: activeTab === 'details' }"
          type="button"
          @click="activeTab = 'details'"
        >
          Details
        </button>
        <button
          class="notes-tab"
          :class="{ active: activeTab === 'preview' }"
          type="button"
          @click="activeTab = 'preview'"
        >
          PDF Preview
        </button>
      </div>

      <div v-if="activeTab === 'details'" class="notes-stack">
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

      <VisitPdfPreview
        v-else-if="activeTab === 'preview'"
        :visit="visit"
        :project="project"
        :tasks="openTasks"
        :task-content-map="taskContentMap"
        :intervenants="intervenants"
        :categories="categories"
      />
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
import { computed, reactive, ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLiveQuery } from "../composables/useLiveQuery";
import { db } from "../db";
import type { Category, Intervenant, Task, TaskPhoto } from "../db/types";
import { formatVisitNumber } from "../utils/format";
import { nowIso } from "../utils/time";
import VisitPdfPreview from "../components/VisitPdfPreview.vue";

const props = defineProps<{ id: string }>();
const router = useRouter();

const visit = useLiveQuery(() => db.visits.get(props.id), null);
const project = useLiveQuery(
  async () => {
    if (!visit.value?.project_id) return null;
    const proj = await db.projects.get(visit.value.project_id);
    return proj;
  },
  null,
);
// Use a ref for tasks and watch projectId to update it
const openTasks = ref<Task[]>([]);

watch(
  () => visit.value?.project_id,
  async (projectId) => {
    if (!projectId) {
      openTasks.value = [];
      return;
    }
    console.log("Querying open tasks for project:", projectId);
    // Get all open tasks for the project
    const allTasks = await db.tasks
      .filter((task) => !task.deleted_at && task.project_id === projectId)
      .toArray();
    console.log("All tasks for project:", allTasks.length, allTasks.map(t => ({ id: t.id, status: t.status, project_id: t.project_id })));
    const open = allTasks.filter(task => task.status === "open");
    console.log("Open tasks:", open.length, open.map(t => ({ id: t.id, observations: t.observations?.length || 0, photo_ids: t.photo_ids?.length || 0 })));
    openTasks.value = open;
  },
  { immediate: true }
);

const taskPhotos = ref<TaskPhoto[]>([]);

watch(openTasks, async () => {
  const taskIds = openTasks.value.map(t => t.id);
  if (taskIds.length === 0) {
    taskPhotos.value = [];
    return;
  }
  taskPhotos.value = await db.task_photos
    .where("task_id")
    .anyOf(taskIds)
    .toArray();
}, { immediate: true });

const intervenants = useLiveQuery(() => db.intervenants.toArray(), []);
const categories = useLiveQuery(() => db.categories.toArray(), []);

const taskContentMap = computed(() => {
  const map: Record<string, { observations: string[]; photos: string[] }> = {};
  const photosById = new Map(taskPhotos.value.map((photo: TaskPhoto) => [photo.id, photo]));
  
  openTasks.value.forEach((task) => {
    const observations = task.observations ?? [];
    const photoUrls: string[] = [];
    
    (task.photo_ids ?? []).forEach((photoId) => {
      const photo = photosById.get(photoId);
      if (photo?.image_blob) {
        photoUrls.push(URL.createObjectURL(photo.image_blob));
      } else if (photo?.url) {
        photoUrls.push(photo.url);
      }
    });
    
    map[task.id] = { observations, photos: photoUrls };
  });
  
  return map;
});

const activeTab = ref<"details" | "preview">("details");
const statusTasks = useLiveQuery(
  async () => {
    if (!visit.value) return [] as Task[];
    const visitId = visit.value.id;
    return db.tasks
      .filter(
        (task) =>
          !task.deleted_at &&
          (task.opened_visit_id === visitId || task.done_visit_id === visitId),
      )
      .toArray();
  },
  [] as Task[],
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


const getTaskAssignee = (task: Task): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return intervenants.value.find((i) => i.id === task.intervenant_id) ?? null;
};

const getAssigneeDisplayName = (task: Task): string => {
  const assignee = getTaskAssignee(task);
  return assignee?.name || "Générale";
};

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return categories.value.filter((c) => intervenant.category_ids?.includes(c.id));
};

// Shared PDF CSS - used by both preview and export
const PDF_CSS = `
  .pdf-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e0e0e0;
  }
  .pdf-header h1 {
    font-size: 22px;
    margin: 0 0 8px;
    font-weight: 700;
    color: #111;
  }
  .pdf-meta {
    font-size: 14px;
    color: #666;
  }
  .pdf-section-title {
    font-size: 14px;
    text-transform: uppercase;
    color: #666;
    margin: 24px 0 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .pdf-assignee-group {
    margin-bottom: 20px;
  }
  .pdf-assignee-name {
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #333;
  }
  .pdf-task {
    margin-bottom: 12px;
    padding-left: 12px;
    border-left: 2px solid #e0e0e0;
  }
  .pdf-observations {
    margin-bottom: 8px;
  }
  .pdf-observation-text {
    margin-bottom: 6px;
    line-height: 1.6;
    color: #333;
  }
  .pdf-photos {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .pdf-photo {
    max-width: 200px;
    max-height: 200px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }
  .pdf-category-badge {
    display: inline-block;
    border: 1px solid #ccc;
    border-radius: 999px;
    padding: 2px 6px;
    font-size: 10px;
    margin-left: 6px;
    font-weight: 500;
  }
  .pdf-conclusion {
    margin-bottom: 12px;
    line-height: 1.6;
    color: #333;
  }
  .pdf-empty {
    padding: 20px;
    color: #999;
    font-style: italic;
    text-align: center;
  }
  .pdf-empty-task {
    color: #999;
    font-style: italic;
    font-size: 13px;
  }
`;

// Shared function to generate PDF content - same HTML for both preview and export
const generatePdfContent = () => {
  if (!visit.value) return "";
  
  const projectName = project.value?.name || "Projet";
  const tasks = openTasks.value;
  const contentMap = taskContentMap.value;
  const intervenantsList = intervenants.value;
  
  if (tasks.length === 0) {
    return `
      <div class="pdf-header">
        <h1>${projectName}</h1>
        <div class="pdf-meta">Visite ${formatVisitNumber(visit.value.visit_number)} · ${visit.value.date}</div>
      </div>
      <div class="pdf-empty">Aucune observation ouverte pour ce projet.</div>
      ${visit.value.conclusion ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${visit.value.conclusion}</div>` : ""}
    `;
  }
  
  const assignedTasks: Task[] = [];
  const generaleTasks: Task[] = [];
  
  tasks.forEach((task) => {
    if (task.intervenant_id) {
      assignedTasks.push(task);
    } else {
      generaleTasks.push(task);
    }
  });
  
  // Group assigned tasks by assignee
  const assigneeMap = new Map<string, Task[]>();
  assignedTasks.forEach((task) => {
    const assigneeId = task.intervenant_id!;
    if (!assigneeMap.has(assigneeId)) {
      assigneeMap.set(assigneeId, []);
    }
    assigneeMap.get(assigneeId)!.push(task);
  });
  
  const assignedGroups: Array<{ assigneeName: string; categories: Category[]; tasks: Task[] }> = [];
  assigneeMap.forEach((taskList, assigneeId) => {
    const assignee = intervenantsList.find(i => i.id === assigneeId) ?? null;
    const firstTask = taskList[0];
    assignedGroups.push({
      assigneeName: getAssigneeDisplayName(firstTask),
      categories: getIntervenantCategories(assignee),
      tasks: taskList,
    });
  });
  
  assignedGroups.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName));
  
  const renderTaskContent = (task: Task) => {
    const taskObservations = task.observations ?? [];
    const content = contentMap[task.id] || { observations: [], photos: [] };
    const allObservations = taskObservations.length > 0 ? taskObservations : content.observations;
    
    let html = "";
    
    if (allObservations.length > 0) {
      html += `<div class="pdf-observations">${allObservations.map(obs => `<div class="pdf-observation-text">${obs}</div>`).join("")}</div>`;
    }
    
    if (content.photos.length > 0) {
      html += `<div class="pdf-photos">${content.photos.map(url => `<img src="${url}" alt="Observation photo" class="pdf-photo" />`).join("")}</div>`;
    }
    
    if (!html) {
      html = `<div class="pdf-empty-task">Aucun contenu</div>`;
    }
    
    return html;
  };
  
  const assignedHtml = assignedGroups.length > 0
    ? assignedGroups.map((group) => {
        const categoryBadges = group.categories.length > 0
          ? group.categories.map(c => `<span class="pdf-category-badge" style="border-color: ${c.color || '#ccc'};"">${c.name}</span>`).join("")
          : "";
        const tasksHtml = group.tasks.map(task => `<div class="pdf-task">${renderTaskContent(task)}</div>`).join("");
        return `
          <div class="pdf-assignee-group">
            <h3 class="pdf-assignee-name">${group.assigneeName}${categoryBadges}</h3>
            ${tasksHtml}
          </div>
        `;
      }).join("")
    : "";
  
  const generaleHtml = generaleTasks.length > 0
    ? `<div class="pdf-assignee-group">
        <h3 class="pdf-assignee-name">Générale</h3>
        ${generaleTasks.map(task => `<div class="pdf-task">${renderTaskContent(task)}</div>`).join("")}
      </div>`
    : "";
  
  const conclusionHtml = visit.value.conclusion
    ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${visit.value.conclusion}</div>`
    : "";
  
  return `
    <div class="pdf-header">
      <h1>${projectName}</h1>
      <div class="pdf-meta">Visite ${formatVisitNumber(visit.value.visit_number)} · ${visit.value.date}</div>
    </div>
    ${assignedHtml ? `<h2 class="pdf-section-title">Observations par intervenant</h2>${assignedHtml}` : ""}
    ${generaleHtml ? `<h2 class="pdf-section-title">Observations générales</h2>${generaleHtml}` : ""}
    ${conclusionHtml}
  `;
};

// generatePdfContent is used by export function

const exportVisitPdf = async () => {
  if (!visit.value) return;
  const title = `Visite ${formatVisitNumber(visit.value.visit_number)}`;
  // Use exact same content as preview
  const content = generatePdfContent();
  
  const win = window.open("", "_blank");
  if (!win) return;
  // Use exact same CSS as preview (shared PDF_CSS constant)
  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      padding: 24px; 
      color: #111; 
      background: white; 
      line-height: 1.5;
    }
    ${PDF_CSS}
    @media print {
      body { padding: 0; }
      .pdf-header { page-break-after: avoid; }
      .pdf-assignee-group { page-break-inside: avoid; }
      .pdf-task { page-break-inside: avoid; }
    }
  `;
  
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>${css}</style>
      </head>
      <body>
        ${content}
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

.notes-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.notes-tab {
  border: 1px solid var(--notes-border);
  background: transparent;
  color: var(--notes-text);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.notes-tab.active {
  background: var(--notes-panel-strong);
  border-color: var(--notes-accent);
}

</style>
