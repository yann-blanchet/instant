<template>
  <div class="notes-pdf-preview">
    <div v-if="!content" style="padding: 20px; color: var(--notes-muted);">Chargement...</div>
    <div v-else class="notes-pdf-content" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Category, Intervenant, Task, Visit, Project } from "../db/types";
import { formatVisitNumber } from "../utils/format";

const props = defineProps<{
  visit?: Visit | null | undefined;
  project?: Project | null | undefined;
  tasks: Task[];
  taskContentMap: Record<string, { observations: string[]; photos: string[] }>;
  intervenants: Intervenant[];
  categories: Category[];
}>();

const getTaskAssignee = (task: Task): Intervenant | null => {
  if (!task.intervenant_id) return null;
  return props.intervenants.find((i) => i.id === task.intervenant_id) ?? null;
};

const getAssigneeDisplayName = (task: Task): string => {
  const assignee = getTaskAssignee(task);
  return assignee?.name || "Générale";
};

const getIntervenantCategories = (intervenant: Intervenant | null) => {
  if (!intervenant?.category_ids || intervenant.category_ids.length === 0) return [];
  return props.categories.filter((c) => intervenant.category_ids?.includes(c.id));
};

const content = computed(() => {
  if (!props.visit) return "";
  
  const projectName = props.project?.name || "Projet";
  const tasks = props.tasks;
  const contentMap = props.taskContentMap;
  const intervenantsList = props.intervenants;
  const visitNumber = props.visit.visit_number ?? 0;
  
  if (tasks.length === 0) {
    return `
      <div class="pdf-header">
        <h1>${projectName}</h1>
        <div class="pdf-meta">Visite ${formatVisitNumber(visitNumber)} · ${props.visit.date}</div>
      </div>
      <div class="pdf-empty">Aucune observation ouverte pour ce projet.</div>
      ${props.visit.conclusion ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${props.visit.conclusion}</div>` : ""}
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
  
  const conclusionHtml = props.visit.conclusion
    ? `<h2 class="pdf-section-title">Conclusion</h2><div class="pdf-conclusion">${props.visit.conclusion}</div>`
    : "";
  
  return `
    <div class="pdf-header">
      <h1>${projectName}</h1>
      <div class="pdf-meta">Visite ${formatVisitNumber(visitNumber)} · ${props.visit.date}</div>
    </div>
    ${assignedHtml ? `<h2 class="pdf-section-title">Observations par intervenant</h2>${assignedHtml}` : ""}
    ${generaleHtml ? `<h2 class="pdf-section-title">Observations générales</h2>${generaleHtml}` : ""}
    ${conclusionHtml}
  `;
});
</script>

<style scoped>
.notes-pdf-preview {
  background: white;
  border-radius: 16px;
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 300px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notes-pdf-content {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: #111;
  background: white;
  padding: 24px;
  line-height: 1.5;
}

/* Use exact same CSS as export - just scoped to .notes-pdf-content */
.notes-pdf-content :deep(.pdf-header) {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.notes-pdf-content :deep(.pdf-header h1) {
  font-size: 22px;
  margin: 0 0 8px;
  font-weight: 700;
  color: #111;
}

.notes-pdf-content :deep(.pdf-meta) {
  font-size: 14px;
  color: #666;
}

.notes-pdf-content :deep(.pdf-section-title) {
  font-size: 14px;
  text-transform: uppercase;
  color: #666;
  margin: 24px 0 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.notes-pdf-content :deep(.pdf-assignee-group) {
  margin-bottom: 20px;
}

.notes-pdf-content :deep(.pdf-assignee-name) {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.notes-pdf-content :deep(.pdf-task) {
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 2px solid #e0e0e0;
}

.notes-pdf-content :deep(.pdf-observations) {
  margin-bottom: 8px;
}

.notes-pdf-content :deep(.pdf-observation-text) {
  margin-bottom: 6px;
  line-height: 1.6;
  color: #333;
}

.notes-pdf-content :deep(.pdf-photos) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.notes-pdf-content :deep(.pdf-photo) {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.notes-pdf-content :deep(.pdf-category-badge) {
  display: inline-block;
  border: 1px solid #ccc;
  border-radius: 999px;
  padding: 2px 6px;
  font-size: 10px;
  margin-left: 6px;
  font-weight: 500;
}

.notes-pdf-content :deep(.pdf-conclusion) {
  margin-bottom: 12px;
  line-height: 1.6;
  color: #333;
}

.notes-pdf-content :deep(.pdf-empty) {
  padding: 20px;
  color: #999;
  font-style: italic;
  text-align: center;
}

.notes-pdf-content :deep(.pdf-empty-task) {
  color: #999;
  font-style: italic;
  font-size: 13px;
}
</style>
