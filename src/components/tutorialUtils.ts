export function tutorialKey(userId?: string | null): string {
  return userId ? `vck_tutorial_${userId}` : 'vck_tutorial';
}

export function welcomedKey(userId?: string | null): string {
  return userId ? `vck_welcomed_${userId}` : 'vck_welcomed';
}

export function getTutorialStatus(userId?: string | null): { status: string; step: number } {
  const raw = localStorage.getItem(tutorialKey(userId)) || 'not_started';
  if (raw.startsWith('in_progress:')) {
    return { status: 'in_progress', step: parseInt(raw.split(':')[1], 10) || 1 };
  }
  return { status: raw, step: 1 };
}
