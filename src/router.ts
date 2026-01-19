import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "./views/DashboardView.vue";
import ProjectView from "./views/ProjectView.vue";
import ProjectPastVisitsView from "./views/ProjectPastVisitsView.vue";
import TaskCreateView from "./views/TaskCreateView.vue";
import VisitDetailView from "./views/VisitDetailView.vue";
import SettingsView from "./views/SettingsView.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardView },
    { path: "/projects/:id", component: ProjectView, props: true },
    { path: "/projects/:id/visits", component: ProjectPastVisitsView, props: true },
    { path: "/projects/:id/tasks/new", component: TaskCreateView },
    { path: "/tasks/:taskId/edit", component: TaskCreateView },
    { path: "/tasks/new", component: TaskCreateView },
    { path: "/visits/:id", component: VisitDetailView, props: true },
    { path: "/settings", component: SettingsView },
  ],
});
