import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { apiUrl } from './lib/api.js';

import './styles.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');

// Wake up backend on Render free tier (sleeps after 15min inactivity)
fetch(apiUrl('/api/health')).catch(() => {});
