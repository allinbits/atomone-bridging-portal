import "@/style.css";

import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import IconVue from "@/components/ui/Icon.vue";
import { messages } from "@/localization";
import router from "@/router";

import App from "./App.vue";

const app = createApp(App);
const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages
});
app.use(i18n);
app.use(router);
app.use(VueQueryPlugin);
app.component(
  "Icon",
  IconVue
);
router.isReady().then(() => app.mount("#app"));
