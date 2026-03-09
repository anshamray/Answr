import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { i18n } from './i18n.js';
import { apiUrl } from './lib/api.js';
import { installGlobalErrorHandlers, reportError } from './lib/debugLog.js';

import './styles.css';
import 'flag-icons/css/flag-icons.min.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
installGlobalErrorHandlers(app);

router.onError((error) => {
  reportError(error, {
    source: 'router',
    fatal: true
  });
});

app.mount('#app');

// Wake up backend on Render free tier (sleeps after 15min inactivity)
fetch(apiUrl('/api/health')).catch(() => {});
