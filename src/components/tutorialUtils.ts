export const TUTORIAL_STORAGE_KEY = 'vck_tutorial';

export function getTutorialStatus(): { status: string; step: number } {
  const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY) || 'not_started';
  if (raw.startsWith('in_progress:')) {
    return { status: 'in_progress', step: parseInt(raw.split(':')[1], 10) || 1 };
  }
  return { status: raw, step: 1 };
}
