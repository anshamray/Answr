<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import AppHeader from '../components/AppHeader.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelButton from '../components/PixelButton.vue';

const { t } = useI18n();
const auth = useAuthStore();

const importing = ref(false);
const importError = ref('');
const importResult = ref(null);

async function handleImportChange(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  importError.value = '';
  importResult.value = null;

  let json;
  try {
    const text = await file.text();
    json = JSON.parse(text);
  } catch (error) {
    importError.value = 'Invalid JSON file. Please upload a valid quizzes JSON export.';
    return;
  }

  importing.value = true;

  try {
    const res = await fetch(apiUrl('/api/library/import'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify(json)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      importError.value =
        data.error || data.message || 'Failed to import quizzes. Please check the JSON format.';
      return;
    }

    importResult.value = data.data || data;
  } catch (error) {
    importError.value = 'Network error while importing quizzes.';
  } finally {
    importing.value = false;
    // Reset input so the same file can be selected again if needed
    event.target.value = '';
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <header class="space-y-2">
        <h1 class="text-3xl font-bold">Admin Tools</h1>
        <p class="text-muted-foreground text-sm">
          Manage library content and run imports. You are signed in as
          <span class="font-semibold">{{ auth.user?.email }}</span>.
        </p>
      </header>

      <div class="grid gap-6 md:grid-cols-2">
        <!-- Publishing info -->
        <PixelCard class="space-y-3">
          <h2 class="text-xl font-bold">Publish quizzes to library</h2>
          <p class="text-sm text-muted-foreground">
            Create and edit quizzes on your
            <router-link to="/dashboard" class="underline underline-offset-2">
              dashboard
            </router-link>
            and use the <strong>Publish</strong> button on each quiz card to add them to the public
            library.
          </p>
          <p class="text-sm text-muted-foreground">
            As an admin, you can also create <strong>official</strong> quizzes or import many quizzes
            at once using the import tool.
          </p>
        </PixelCard>

        <!-- Import tool -->
        <PixelCard class="space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-xl font-bold">Import official quizzes</h2>
            <span class="px-2 py-1 text-xs font-semibold border border-primary text-primary">
              JSON
            </span>
          </div>
          <p class="text-sm text-muted-foreground">
            Upload a JSON file in Answr's import format to create or update
            <strong>official, published</strong> quizzes in the library. This is ideal for data
            imported from other platforms like Kahoot or Blooket after converting them to the
            Answr JSON format.
          </p>

          <label class="block">
            <span class="text-xs font-medium text-muted-foreground mb-1 block">
              Select quizzes JSON file
            </span>
            <input
              type="file"
              accept="application/json"
              class="block w-full text-sm file:mr-4 file:py-2 file:px-3 file:border-2 file:border-black file:bg-white file:text-sm file:font-medium hover:file:bg-muted/60"
              :disabled="importing"
              @change="handleImportChange"
            />
          </label>

          <div v-if="importing" class="text-sm text-muted-foreground">
            Importing quizzes, please wait…
          </div>

          <div v-if="importError" class="text-sm text-destructive border border-destructive/40 p-3">
            {{ importError }}
          </div>

          <div
            v-if="importResult"
            class="text-sm border border-success/40 bg-success/5 p-3 space-y-1 text-success-foreground"
          >
            <p class="font-medium">
              Imported quizzes successfully.
            </p>
            <p>
              Imported:
              <strong>{{ importResult.importedCount ?? importResult.results?.length ?? 0 }}</strong>
              · Failed:
              <strong>{{ importResult.failedCount ?? 0 }}</strong>
            </p>
          </div>

          <details class="text-xs text-muted-foreground mt-2">
            <summary class="cursor-pointer font-medium">
              Show expected JSON structure
            </summary>
            <pre class="mt-2 bg-muted p-2 overflow-x-auto text-[11px] leading-snug">
{ "quizzes": [
  {
    "title": "Quiz title",
    "description": "Optional description",
    "category": "Category name",
    "tags": ["tag1", "tag2"],
    "language": "en",
    "questions": [
      {
        "type": "multiple-choice",
        "text": "What is 2 + 2?",
        "timeLimit": 30,
        "points": 1000,
        "allowMultipleAnswers": false,
        "answers": [
          { "text": "3", "isCorrect": false },
          { "text": "4", "isCorrect": true }
        ]
      }
    ]
  }
] }
            </pre>
          </details>
        </PixelCard>
      </div>
    </main>
  </div>
</template>

