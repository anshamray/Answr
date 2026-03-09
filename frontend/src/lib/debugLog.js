import { reactive } from 'vue';

const STORAGE_KEY = 'answr-debug-log';
const MAX_LOGS = 30;

function loadStoredState() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { logs: [], fatalLogId: null, panelOpen: false };
    }

    const parsed = JSON.parse(stored);
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      fatalLogId: parsed.fatalLogId || null,
      panelOpen: !!parsed.panelOpen
    };
  } catch {
    return { logs: [], fatalLogId: null, panelOpen: false };
  }
}

const initialState = loadStoredState();

export const debugLogState = reactive({
  logs: initialState.logs,
  fatalLogId: initialState.fatalLogId,
  panelOpen: initialState.panelOpen
});

function persistState() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      logs: debugLogState.logs,
      fatalLogId: debugLogState.fatalLogId,
      panelOpen: debugLogState.panelOpen
    }));
  } catch {
    // Ignore storage failures on locked-down browsers.
  }
}

function toMessage(value) {
  if (value == null) return 'Unknown error';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message || value.name || 'Error';

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toStack(value) {
  if (value instanceof Error && value.stack) {
    return value.stack;
  }

  if (typeof value === 'object' && value && typeof value.stack === 'string') {
    return value.stack;
  }

  return '';
}

export function addDebugLog({
  level = 'error',
  source = 'app',
  message,
  details = '',
  stack = '',
  fatal = false
}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    source,
    message: message || 'Unknown error',
    details,
    stack
  };

  debugLogState.logs = [entry, ...debugLogState.logs].slice(0, MAX_LOGS);

  if (fatal) {
    debugLogState.fatalLogId = entry.id;
    debugLogState.panelOpen = true;
  }

  persistState();
  return entry;
}

export function reportError(error, context = {}) {
  const details = context.details || context.info || '';

  return addDebugLog({
    level: context.level || 'error',
    source: context.source || 'app',
    message: toMessage(error),
    details,
    stack: toStack(error),
    fatal: !!context.fatal
  });
}

export function setDebugPanelOpen(isOpen) {
  debugLogState.panelOpen = isOpen;
  persistState();
}

export function clearDebugLogs() {
  debugLogState.logs = [];
  debugLogState.fatalLogId = null;
  debugLogState.panelOpen = false;
  persistState();
}

export function installGlobalErrorHandlers(app) {
  const previousHandler = app.config.errorHandler;

  app.config.errorHandler = (error, instance, info) => {
    reportError(error, {
      source: 'vue',
      details: info || '',
      fatal: true
    });

    if (typeof previousHandler === 'function') {
      previousHandler(error, instance, info);
    }
  };

  window.addEventListener('error', (event) => {
    reportError(event.error || event.message, {
      source: 'window',
      details: [event.filename, event.lineno, event.colno].filter(Boolean).join(':'),
      fatal: true
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, {
      source: 'promise',
      fatal: true
    });
  });
}
