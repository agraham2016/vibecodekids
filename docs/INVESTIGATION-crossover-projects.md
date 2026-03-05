# Investigation: User A Seeing User B's Projects (Cross-User Data Leak)

**Status:** Open — reproduction not yet confirmed  
**Priority:** P1 (must resolve before affecting paying customers)  
**Last Updated:** 2025-03-01

---

## Summary

Eli T logs in and sees Novalee's projects. Both users end up on Novalee's project list. This is a critical data isolation failure that must not occur for paying customers.

## What We've Implemented (Existing Mitigations)

| Mitigation | Location | Purpose |
|------------|----------|---------|
| X-Expected-User header | `useProjects` → `my-projects` | Server rejects response if session.userId ≠ expected |
| cache: 'no-store' | `api.ts` | Prevents HTTP cache from serving wrong user's data |
| Timestamp query param | `?t=${Date.now()}` | Additional cache busting |
| Clear userProjects on logout | `useProjects` | Avoids stale UI after switch |
| Reset on 401 | `useProjects` | Now calls `onSessionMismatch` (logout) when my-projects returns 401 |
| Session binding (UA) | `sessions.js` | Rejects tokens used from different User-Agent |

## Root Cause Hypotheses (Prioritized)

### 1. Shared Account / Same Credentials
**Likelihood: Medium**  
If Eli and Novalee share the same username/password (e.g., family account, typo), they would both resolve to the same `user_<username>` and see the same projects.  
**How to verify:** Confirm with users whether they use different usernames and passwords.

### 2. Client Token / localStorage State Desync
**Likelihood: Medium**  
- Multi-tab: Tab A has Novalee, Tab B has Eli. If Tab B doesn't fully refresh state after Eli logs in, it might still use Novalee's token from a stale closure or race.
- `AuthModal` sets `localStorage.setItem('authToken', data.token)` before calling `onLogin`. The `api` module's `_authToken` is updated by `setAuthToken` inside `login()`. If React batches updates and `fetchUserProjects` runs before `setAuthToken` completes, we could theoretically use an old token — but `setAuthToken` is synchronous, so this is unlikely.
**How to verify:** Add client-side logging (dev only) to trace token vs userId at fetch time.

### 3. Deployment / Fix Not Live
**Likelihood: High (if fixes were recent)**  
If the server with X-Expected-User and session mismatch handling isn't deployed, the bug would persist.  
**How to verify:** Confirm deploy status and that production is running latest auth/projects routes.

### 4. Session Store Bug (Postgres or File)
**Likelihood: Low**  
- Token format: 32-byte random hex — collision negligible.
- PgSessionStore: `ON CONFLICT (token) DO UPDATE` — would require identical token.
- FileSessionStore: Map keyed by token — no obvious collision path.  
**How to verify:** Inspect `sessions` table/file: multiple rows per user, token reuse, or overwrites.

### 5. AuthModal Uses Raw `fetch` — Token Propagation
**Likelihood: Low**  
AuthModal uses `fetch('/api/auth/login')` directly and then `localStorage.setItem` + `onLogin(data.user, data.token)`. The parent `handleLogin` calls `login()` which does `setAuthToken(data.token)`. Order is correct; token should propagate.  
**How to verify:** Trace login → setAuthToken → fetchUserProjects in a single session.

---

## Diagnostic Logging Added (This Session)

| Event | Log Level | Purpose |
|-------|-----------|---------|
| `login_success` | info | Correlate logins with userId |
| `my_projects_no_session` | info | Token invalid/expired (includes tokenPrefix for correlation) |
| `my_projects_user_mismatch` | warn | X-Expected-User ≠ session.userId — forces 401 |
| `my_projects_ok` | debug | Successful fetch (set LOG_LEVEL=debug to see) |

**To enable debug logs:** `LOG_LEVEL=debug` in production (or use in staging only).

---

## Data Checks to Run

When reproduction is possible, have support/database access run:

1. **Sessions table (Postgres)**
   ```sql
   SELECT token, user_id, username, created_at FROM sessions WHERE expires_at > NOW();
   ```
   - Look for: same token for multiple user_ids, duplicate tokens, unusual patterns.

2. **Projects ownership**
   ```sql
   SELECT id, user_id, title FROM projects WHERE user_id IN ('user_elit', 'user_novalee') ORDER BY user_id, created_at DESC;
   ```
   - Confirm Eli's projects have `user_id = 'user_elit'` and Novalee's have `user_novalee`.

3. **User IDs**
   - Eli's userId: `user_elit` (from `user_${username.toLowerCase()}`)
   - Novalee's userId: `user_novalee`

---

## Recommended Team Involvement

| Role | Responsibility |
|------|-----------------|
| **Nova** | Full auth + projects flow, client state, race conditions. Can add E2E tests for multi-user isolation. |
| **Cipher** | Session store, token/session isolation, security review. Can audit PgSessionStore and FileSessionStore. |

---

## Next Steps

1. **Reproduce in a controlled environment**
   - Two test users (e.g. `test_eli`, `test_nova`) on same device/browser
   - Log in as A, log out, log in as B — verify B sees only B's projects
   - Try multi-tab: A in Tab 1, B in Tab 2 — verify no crossover

2. **Confirm deployment**
   - Ensure production is running code with: X-Expected-User check, onSessionMismatch on 401, diagnostic logging

3. **Add E2E test**
   - Playwright/Cypress: two users, login A → create project → logout → login B → assert B does not see A's project

4. **Optional: Stricter session checks**
   - Add session.userId verification to project save/load/delete (defense in depth)
   - Consider short-lived tokens or more aggressive rotation for sensitive ops

---

## Files Touched (This Investigation)

- `server/routes/auth.js` — diagnostic logging for login, my-projects
- `src/hooks/useProjects.ts` — call `onSessionMismatch` on 401 from my-projects
- `docs/INVESTIGATION-crossover-projects.md` — this document
