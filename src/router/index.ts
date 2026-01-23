import { createRouter, createWebHistory } from "vue-router";

import FaqView from "@/views/FaqView.vue";
import HomeView from "@/views/HomeView.vue";
import PrivacyView from "@/views/PrivacyView.vue";
import TermsView from "@/views/TermsView.vue";

const routerHistory = createWebHistory();
const routes = [
  { path: "/",
    component: HomeView },
  { path: "/terms",
    component: TermsView },
  { path: "/privacy",
    component: PrivacyView },
  { path: "/faq",
    component: FaqView }
  // { path: "/design", component: DesignView },
];
const router = createRouter({
  history: routerHistory,
  routes,
  scrollBehavior () {
    return new Promise((resolve) => {
      setTimeout(
        () => {
          resolve({ left: 0,
            top: 0 });
        },
        600
      );
    });
  }
});

export default router;
