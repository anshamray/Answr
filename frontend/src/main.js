import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { i18n } from './i18n.js';
import { apiUrl } from './lib/api.js';
import { installGlobalErrorHandlers, reportError } from './lib/debugLog.js';
import { useAuthStore } from './stores/authStore.js';

import './styles.css';
import 'flag-icons/css/flag-icons.min.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);
installGlobalErrorHandlers(app);

router.onError((error) => {
  reportError(error, {
    source: 'router',
    fatal: true
  });
});

// Hydrate auth user once on startup if a token exists.
const auth = useAuthStore(pinia);
if (auth.token) {
  auth.fetchMe().catch(() => {
    // Errors are already handled in fetchMe (it clears invalid tokens).
  });
}

app.mount('#app');

// Wake up backend on Render free tier (sleeps after 15min inactivity)
fetch(apiUrl('/api/health')).catch(() => {});
