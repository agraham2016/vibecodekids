import { filterUsername } from '../middleware/usernameFilter.js';
import { readUser } from '../services/storage.js';

function sanitizeAlias(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 30);
}

function safeAliasOrFallback(value) {
  const alias = sanitizeAlias(value);
  if (!alias) return 'Creator';
  return filterUsername(alias).blocked ? 'Creator' : alias;
}

export function resolveSessionCreatorAlias(session) {
  return safeAliasOrFallback(session?.username || session?.displayName || '');
}

export async function resolvePublicCreatorAlias(project, userCache = new Map()) {
  if (project?.userId) {
    if (!userCache.has(project.userId)) {
      let cachedAlias = '';
      try {
        const user = await readUser(project.userId);
        cachedAlias = sanitizeAlias(user?.username || user?.displayName || '');
      } catch {
        cachedAlias = '';
      }
      userCache.set(project.userId, cachedAlias);
    }

    const aliasFromUser = userCache.get(project.userId);
    if (aliasFromUser) {
      return safeAliasOrFallback(aliasFromUser);
    }
  }

  return safeAliasOrFallback(project?.creatorName || '');
}
