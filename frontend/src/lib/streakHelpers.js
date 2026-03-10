// Streak helpers (mirroring backend config)

export const STREAK_THRESHOLDS = [
  { streak: 2, multiplier: 1.1, label: 'Hot!' },
  { streak: 3, multiplier: 1.2, label: 'On Fire!' },
  { streak: 5, multiplier: 1.3, label: 'Unstoppable!' },
  { streak: 8, multiplier: 1.5, label: 'LEGENDARY!' }
];

export function getStreakLabel(streak) {
  if (!streak || streak < 2) return null;
  let label = null;
  for (const t of STREAK_THRESHOLDS) {
    if (streak >= t.streak) label = t.label;
  }
  return label;
}

export function getStreakMultiplier(streak) {
  if (!streak || streak < 2) return 1.0;
  let multiplier = 1.0;
  for (const t of STREAK_THRESHOLDS) {
    if (streak >= t.streak) multiplier = t.multiplier;
  }
  return multiplier;
}

