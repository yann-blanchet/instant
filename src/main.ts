import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "./assets/main.css";
import { initAutoSync, setupDexieAutoSync } from "./composables/useAutoSync";
import { supabase } from "./supabase";

const storedTheme = localStorage.getItem("theme") ?? "dark";
document.documentElement.dataset.theme = storedTheme;

// Setup automatic syncing BEFORE any database operations
// This ensures the hook is registered before database is used
setupDexieAutoSync();

// Only seed if Supabase is not configured (offline mode)
// If Supabase is configured, sync will pull data from server
if (!supabase) {
  const { seedIfEmpty } = await import("./db/seed");
  await seedIfEmpty();
}

initAutoSync();

createApp(App).use(router).mount("#app");
