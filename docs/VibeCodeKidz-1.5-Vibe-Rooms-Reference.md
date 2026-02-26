# Vibe Code Kidz 1.5 — Vibe Rooms Reference Document

> **Date:** February 25, 2026
> **Status:** Planning / Pre-Development
> **Prerequisite:** Current Game Studio + Arcade (V1) live; multiplayer game rooms (play together) already shipped

---

## Table of Contents

1. [Vision Overview](#vision-overview)
2. [Platform Architecture](#platform-architecture)
3. [Phase 1 — Backend: Room Model & WebSocket](#phase-1--backend-room-model--websocket)
4. [Phase 2 — API & Data](#phase-2--api--data)
5. [Phase 3 — Frontend: Create & Join Flows](#phase-3--frontend-create--join-flows)
6. [Phase 4 — Real-Time Code & Preview Sync](#phase-4--real-time-code--preview-sync)
7. [Phase 5 — Permissions & Save Behavior](#phase-5--permissions--save-behavior)
8. [Phase 6 — Polish & Edge Cases](#phase-6--polish--edge-cases)
9. [Phase 7 — Launch Prep](#phase-7--launch-prep)
10. [Technology Stack Summary](#technology-stack-summary)
11. [Cost Analysis](#cost-analysis)
12. [Timeline](#timeline)
13. [User Flow — Create Room / Join Room](#user-flow--create-room--join-room)
14. [Strategic Notes](#strategic-notes)

---

## Vision Overview

Vibe Code Kidz 1.5 adds **Vibe Rooms**: shared spaces where multiple people work on the same game together in real time. Comms (voice and text) live in **Discord** — link-out only. The platform owns **rooms**, **shared code**, and **shared preview**. The goal is to get multiplayer creation right before evolving into Creator Mode (2.0).

**Core Principle:** Kids (and friends/family) vibe code together in one place; they talk and coordinate in Discord. One room code + one Discord link = same workspace, same game, same vibe.

### Comms vs. Platform

| Layer | Where | Purpose |
|-------|--------|---------|
| **Voice & text chat** | Discord (external) | Hang out, coordinate, discuss ideas |
| **Room, code, preview** | VibeCodeKidz | Create/join by code; shared editor and game preview |

### The User Journey

1. **Host** creates a Vibe Room from the current project (or new), optionally pastes a Discord invite link.
2. **Host** shares room code + Discord link (e.g. in Discord): "Join room ABCD — [link] — hop in voice!"
3. **Friends** join the room with the code; everyone sees the same code and preview.
4. **Everyone** uses Discord for voice/chat; VibeCodeKidz for prompting, editing, and playing the game.
5. **Host** (or defined rules) saves the project; others can "Save a copy" to their account.

---

## Platform Architecture

```
VIBE CODE KIDZ 1.5 (Vibe Rooms)
│
├── 🎮 GAME SIDE (V1 — exists)
│   ├── Game Studio (Quick Mode — AI game creation)
│   ├── Arcade (play & share games)
│   ├── Game Multiplayer (play together via room code) — /ws/multiplayer
│   └── 18 Game Templates
│
├── 🏠 VIBE ROOMS (1.5 — new)
│   ├── Room lifecycle (create, join, leave, cleanup)
│   ├── WebSocket /ws/vibe-rooms (or /ws/studio)
│   ├── Real-time code sync (broadcast, last-write-wins)
│   ├── Create Room flow (project pick, optional Discord link, share code)
│   ├── Join Room flow (enter code → load shared workspace)
│   ├── Room UI (who’s in room, leave, Discord link)
│   └── Save rules (host saves; others "Save a copy")
│
└── 📢 COMMS (external — no SDK in 1.5)
    └── Discord (link-out for voice + text)
```

---

## Phase 1 — Backend: Room Model & WebSocket

**Timeline:** 1 week  
**New Dependencies:** None (reuse `ws` already in use for game multiplayer)  
**Cost:** $0

### What It Does

Server can create rooms, accept joins by 4-character code, and broadcast messages. No UI yet. Mirrors the pattern in `server/multiplayer.js` but for studio collaboration.

### Backend

- New module: `server/vibeRooms.js` (or equivalent).
- **In-memory store:** `Map`: `roomCode` → `{ hostId, projectId, members, discordInvite?, createdAt }`.
- **Room lifecycle:**
  - `createRoom(projectId, hostId, hostName, discordInvite?)` → generate 4-char code, add host to members, return room.
  - `joinRoom(roomCode, userId, displayName)` → validate code, check max members (e.g. 8), add member, return room state.
  - `leaveRoom(roomCode, userId)` → remove member; if empty, delete room (or idle timeout).
- **New WebSocket path:** `/ws/vibe-rooms` (or `/ws/studio`) attached to existing HTTP server; separate from `/ws/multiplayer`.

### Message Types

| Direction | Type | Purpose |
|-----------|------|---------|
| Client → Server | `create_room` | Create room (projectId, displayName, discordInvite?) |
| Client → Server | `join_room` | Join by code (roomCode, displayName) |
| Client → Server | `leave_room` | Leave current room |
| Client → Server | `code_update` | Broadcast new full code (debounced) |
| Server → Client | `room_state` | Current members, projectId, roomCode, discordInvite |
| Server → Client | `code_update` | Latest code (e.g. on join or when someone edits) |
| Server → Client | `member_joined` / `member_left` | Presence updates |

### Auth

- Optional: pass session or `userId` in first message for "who's in room" and save permissions.
- If no auth: use anonymous display name only; room still works.

### Cleanup

- Delete room when last person leaves.
- Optional: idle timeout (e.g. 30 min) for abandoned rooms.

### Integration

- Reuse existing `ws` and HTTP server setup from `server/index.js` and `server/multiplayer.js`.
- No database in Phase 1; rooms are ephemeral.

---

## Phase 2 — API & Data

**Timeline:** 2–3 days  
**New Dependencies:** None  
**Cost:** $0

### What It Does

Optional REST endpoints for room metadata; room is tied to a project. For 1.5, rooms can remain in-memory only (no persistence). If you want "room info" without joining, add minimal API.

### Backend

- **Decision:** 1.5 = in-memory only; no DB for rooms. Persist in 2.0 if "rejoin same room" is needed.
- **Optional endpoints:**
  - `POST /api/vibe-rooms` — create room (projectId, discordInvite?) → returns `{ roomCode, inviteUrl }`.
  - `GET /api/vibe-rooms/:code` — get public info (member count, projectId) for "preview before join".
- **Project tie-in:** On create/join, load project via existing `GET /api/projects/:id`; no new project schema.

### Database

- No new tables for 1.5. Room state lives in memory in `vibeRooms.js`.

---

## Phase 3 — Frontend: Create & Join Flows

**Timeline:** 1 week  
**New Dependencies:** None  
**Cost:** $0

### What It Does

User can create a Vibe Room and share code + Discord link; another user can join with the code and land in the studio in "room mode."

### Frontend Components

- **Entry points:** "Create Vibe Room" and "Join Vibe Room" (e.g. Header or Projects panel; button or menu).
- **CreateRoomModal** (or inline flow): choose current project or new → optional Discord invite field → create → show room code + copyable share text.
- **JoinRoomModal:** input 4-char code → join → navigate to studio in room mode.
- **RoomBanner** (or bar): "You're in a Vibe Room — Code: XXXX | [Discord] | Leave room". Visible whenever in a room.

### UI Layout — Create Room

```
┌─────────────────────────────────────────────┐
│  🏠 Create Vibe Room                         │
├─────────────────────────────────────────────┤
│  Project: [Current: "My Platformer" ▾]        │
│  Discord invite (optional):                 │
│  ┌─────────────────────────────────────────┐│
│  │ https://discord.gg/xxxx                  ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Create Room]                              │
└─────────────────────────────────────────────┘

--- After create ---

┌─────────────────────────────────────────────┐
│  Room created! Share with friends:           │
│  Code: ABCD                                  │
│  Link: https://vibecodekidz.org/room/ABCD   │
│  Discord: https://discord.gg/xxxx            │
│  [Copy all]  [Leave room]                    │
└─────────────────────────────────────────────┘
```

### UI Layout — Join Room

```
┌─────────────────────────────────────────────┐
│  🏠 Join Vibe Room                          │
├─────────────────────────────────────────────┤
│  Room code: [____]  (4 characters)          │
│  Your name: [________________]               │
│                                             │
│  [Join]                                     │
└─────────────────────────────────────────────┘
```

### Share Copy

- Single clipboard string: `Room code: XXXX | Join: [url] | Discord: [link]` (if Discord provided).

### Integration

- Connect to `/ws/vibe-rooms` when creating or joining.
- Store `roomCode` (and optional `discordInvite`) in React state + sessionStorage so refresh can rejoin.
- When in room mode, load project from server if `projectId` is set; otherwise start from new project.

---

## Phase 4 — Real-Time Code & Preview Sync

**Timeline:** 1 week  
**New Dependencies:** None  
**Cost:** $0

### What It Does

When anyone in the room changes code (editor or AI), everyone's editor and preview update. Simple broadcast; last-write-wins for 1.5.

### Frontend

- On **code change** (CodeEditor or AI generation): if in room, send `code_update` over WebSocket with full code. **Debounce** (300–500 ms) to avoid flooding.
- On **receive** `code_update`: update local `code` state (and current project code) so PreviewPanel and CodeEditor re-render.
- On **join**: server sends current room code so joiner gets latest; apply to local state immediately.

### Backend

- On `code_update`: store latest code in room state; broadcast to all other members in that room.
- On `join_room`: after adding member, send `room_state` and latest `code_update` so joiner is in sync.

### Conflict Handling

- 1.5: **last-write-wins**. No CRDT/OT; document this. Consider CRDT in 2.0 if needed.

### Integration

- Hook into existing `updateCode` / `setGeneratedCode` and `code` state in `useProjects` and App. When in room, every update goes to WebSocket; every incoming `code_update` updates state.

---

## Phase 5 — Permissions & Save Behavior

**Timeline:** 3–5 days  
**New Dependencies:** None  
**Cost:** $0

### What It Does

Clear rules for who can edit and who can save. Prevents accidental overwrites and confusion.

### Rules (Recommended for 1.5)

| Action | Who |
|--------|-----|
| Edit code (everyone) | All members |
| Save to project | Host only (project is host's) |
| Save a copy to my projects | Any member (copy to their account) |

### Frontend

- **Save button (host):** "Save" → existing save API; saves to current project (host's).
- **Save button (non-host):** "Save a copy" → save as new project in their account; optionally leave room after.
- Disable or repurpose "Save" for non-host so it's clear they're not overwriting host's project.

### Backend

- No new endpoints if "Save a copy" uses existing "create/save project" API with copied code. Host save uses existing update project by ID (with auth check that user is owner).

### Integration

- Projects panel and save logic already know `currentProject` and user; add `roomHostId` (or similar) from room state to decide which button to show.

---

## Phase 6 — Polish & Edge Cases

**Timeline:** 1 week  
**New Dependencies:** None  
**Cost:** $0

### What It Does

Reconnect, host leave, and UX are stable enough for launch. Optional presence list.

### Reconnect

- If WebSocket drops: reconnect and send `join_room` again with stored `roomCode` and display name. Server re-sends `room_state` and latest code.
- Store `roomCode` (and optionally displayName) in sessionStorage so refresh = rejoin same room.

### Host Leaves

- **Option A:** Transfer host to next member; notify all (e.g. `host_changed` message).
- **Option B:** End room for everyone; broadcast `room_ended`; everyone returns to solo studio.
- Pick one and document.

### Duplicate Tabs

- Same user in same room in two tabs: allow (simplest) or kick duplicate by userId. Recommend allow for 1.5.

### Presence (Optional for 1.5)

- Show list of nicknames/avatars in room in RoomBanner or sidebar. Server already has members; broadcast `member_joined` / `member_left`; client renders list.

### Mobile

- Test create/join and sync on a phone; fix obvious layout or focus issues. No heavy custom mobile work for 1.5.

### Error Handling

- Invalid code: "Room not found. Check the code and try again."
- Room full: "This room is full."
- Room expired: "This room has ended. Create or join another."

---

## Phase 7 — Launch Prep

**Timeline:** 3–5 days  
**New Dependencies:** None  
**Cost:** $0

### What It Does

1.5 is shippable, understandable, and measurable.

### Copy & Discovery

- In-app: "Vibe Rooms" name; short description e.g. "Build games together in real time. Use Discord for voice!"
- Tooltip or help: "Create a room → share the code + Discord link → friends join and see the same game."

### Docs or In-App Tips

- One simple flow: Create room → share code + Discord link → friends join → everyone edits and plays; host saves.

### Analytics (Optional)

- Events: `room_created`, `room_joined`, `room_left`. Use for 2.0 planning.

### Definition of Done

- Two browsers: one creates room, one joins; both see same code and preview; host saves; non-host can "Save a copy"; leave and reconnect work; errors are clear.

---

## Technology Stack Summary

### Backend

| Component | Purpose | Notes |
|-----------|---------|--------|
| `ws` (existing) | WebSocket server | New path `/ws/vibe-rooms` |
| In-memory `Map` | Room store | roomCode → room state |
| Existing `GET /api/projects/:id` | Load project for room | No new project API |

### Frontend

| Component | Purpose | Notes |
|-----------|---------|--------|
| React state + sessionStorage | roomCode, room state, rejoin | No new libs |
| Existing `useProjects` | code, updateCode, currentProject | Hook into for sync |
| New: CreateRoomModal, JoinRoomModal, RoomBanner | Flows and room UI | Standard React |

### External

| Service | Role in 1.5 |
|---------|--------------|
| Discord | Link-only; no SDK or embed |

---

## Cost Analysis

### Per-Use Costs

| Action | Cost |
|--------|------|
| Create room | $0 |
| Join room | $0 |
| Code sync | $0 (in-memory, same server) |

### Infrastructure

| Item | Cost | Notes |
|------|------|--------|
| WebSocket (same server) | $0 | Reuse existing Node server |
| In-memory rooms | $0 | No new DB or cache |

**Total new monthly cost for 1.5:** $0.

---

## Timeline

```
VIBE ROOMS 1.5 KICKOFF ─────────────────── Week 0
     │
PHASE 1: Backend Room + WebSocket ─────── Week 1
     │  Room model, /ws/vibe-rooms, message types
     │
PHASE 2: API & Data ───────────────────── Week 1 (overlap)
     │  Optional REST; project tie-in
     │
PHASE 3: Create & Join Flows ─────────── Weeks 2–3
     │  Modals, room code, Discord link, RoomBanner
     │
PHASE 4: Code & Preview Sync ──────────── Week 3
     │  Broadcast code_update; debounce; apply on receive
     │
PHASE 5: Permissions & Save ───────────── Week 4
     │  Host save; "Save a copy" for others
     │
PHASE 6: Polish & Edge Cases ──────────── Week 4–5
     │  Reconnect, host leave, errors, optional presence
     │
PHASE 7: Launch Prep ──────────────────── Week 5
     │  Copy, tips, analytics, definition of done
     │
VIBE CODE KIDZ 1.5 SHIP ───────────────── ~Week 5–6
```

---

## User Flow — Create Room / Join Room

| Step | Actor | Action |
|------|--------|--------|
| 1 | Host | Clicks "Create Vibe Room"; selects project (or new); optionally pastes Discord link. |
| 2 | Host | Sees room code (e.g. ABCD) and share link; copies "Room code: ABCD \| Join: [url] \| Discord: [link]". |
| 3 | Host | Pastes in Discord (or elsewhere); friends see code and link. |
| 4 | Friend | Clicks join link or opens studio and clicks "Join Vibe Room"; enters code (ABCD) and name. |
| 5 | Friend | Lands in studio with same project and code; RoomBanner shows "You're in a Vibe Room — Code: ABCD". |
| 6 | Both | Use Discord for voice/chat; edit and preview in sync in VibeCodeKidz. |
| 7 | Host | Saves when ready; friend can "Save a copy" to their account. |
| 8 | Either | Clicks "Leave room"; other stays until they leave or room ends. |

---

## Strategic Notes

### Why 1.5 Before 2.0

- Multiplayer creation is a strong differentiator and increases retention. Shipping it as 1.5 lets you validate the "vibe together" experience and fix issues before adding the complexity of Creator Mode (2.0).

### Discord as External Comms

- Keeps scope small: no Discord SDK, no embed, no approval process. Link-out is proven (e.g. Minecraft + Discord). You can revisit Discord Activities or deeper integration in a later version.

### Out of Scope for 1.5

- CRDT / multi-cursor editing (last-write-wins is enough for small groups).
- Persisting rooms in DB or "rejoin same room" by saved link.
- Discord SDK or embedded voice inside the app.
- Building a Discord Activity version of the studio.

### Deployment Note

- Same as existing game multiplayer: in-memory rooms require a single server instance (e.g. `replicas=1` on Railway). Multiple instances would need a shared store (e.g. Redis) for room state — defer to 2.0 if you scale horizontally.

### Success Criteria for 1.5

- [ ] Host can create a room and share code + Discord link in one copy.
- [ ] Friend can join with code and see the same code and preview within a few seconds.
- [ ] Edits (and AI generations) sync to all members with minimal delay.
- [ ] Host can save; others can "Save a copy" without overwriting host's project.
- [ ] Reconnect after refresh works; host leave is handled (transfer or end room).
- [ ] Clear error messages for invalid code, full room, and ended room.

---

*This document is the master reference for Vibe Code Kidz 1.5 (Vibe Rooms). Each phase should be planned in detail before implementation. Phases can be adjusted based on testing and feedback.*
