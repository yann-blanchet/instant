import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "./assets/main.css";
import { seedIfEmpty } from "./db/seed";

const storedTheme = localStorage.getItem("theme") ?? "dark";
document.documentElement.dataset.theme = storedTheme;

await seedIfEmpty();

createApp(App).use(router).mount("#app");
