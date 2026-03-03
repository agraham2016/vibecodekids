// Multiplayer Room Management System
// NOTE: Rooms are stored in-memory. On Railway (or any multi-instance deployment),
// ensure replicas=1 so all WebSocket connections hit the same server. Otherwise
// "Room not found" will occur when users connect to different instances.
import { WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';
import { filterContent } from './middleware/contentFilter.js';
import { moderateText } from './services/contentModeration.js';
import { readUser } from './services/storage.js';
import { ageGate } from './middleware/ageGate.js';
import log from './services/logger.js';

const MAX_STATE_SIZE = 8192;
const MAX_INPUT_SIZE = 512;
const MAX_STATE_KEYS = 50;
const SESSION_RECHECK_MS = 5 * 60 * 1000;

function sanitizeValue(val, depth = 0) {
  if (depth > 4) return null;
  if (val === null || val === undefined) return val;
  if (typeof val === 'boolean' || typeof val === 'number') {
    if (typeof val === 'number' && !Number.isFinite(val)) return 0;
    return val;
  }
  if (typeof val === 'string') {
    return val
      .slice(0, 500)
      .replace(/<script/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.slice(0, 50).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof val === 'object') {
    const out = {};
    const keys = Object.keys(val).slice(0, MAX_STATE_KEYS);
    for (const k of keys) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      const cleanKey = String(k).slice(0, 64);
      out[cleanKey] = sanitizeValue(val[k], depth + 1);
    }
    return out;
  }
  return null;
}

function sanitizeGameState(state) {
  if (!state || typeof state !== 'object') return null;
  const json = JSON.stringify(state);
  if (json.length > MAX_STATE_SIZE) return null;
  return sanitizeValue(state);
}

function sanitizeGameInput(input) {
  if (!input || typeof input !== 'object') return null;
  const json = JSON.stringify(input);
  if (json.length > MAX_INPUT_SIZE) return null;
  return sanitizeValue(input);
}

// Store active rooms
const rooms = new Map();

// Generate a kid-friendly room code (4 characters, easy to type)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Room class to manage game sessions
class GameRoom {
  constructor(projectId, hostId, hostName) {
    this.code = generateRoomCode();
    this.projectId = projectId;
    this.hostId = hostId;
    this.hostName = hostName;
    this.players = new Map();
    this.gameState = {};
    this.createdAt = Date.now();
    this.maxPlayers = 8;
  }

  addPlayer(playerId, ws, name, isHost = false) {
    if (this.players.size >= this.maxPlayers && !isHost) {
      return { success: false, error: 'Room is full!' };
    }

    this.players.set(playerId, { ws, name, isHost });

    this.broadcast(
      {
        type: 'player_joined',
        playerId,
        playerName: name,
        players: this.getPlayerList(),
      },
      playerId,
    );

    return { success: true };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    const wasHost = player.isHost;
    this.players.delete(playerId);

    if (wasHost && this.players.size > 0) {
      const newHost = this.players.entries().next().value;
      if (newHost) {
        newHost[1].isHost = true;
        this.hostId = newHost[0];
        this.hostName = newHost[1].name;

        this.broadcast({
          type: 'host_changed',
          newHostId: newHost[0],
          newHostName: newHost[1].name,
        });
      }
    }

    this.broadcast({
      type: 'player_left',
      playerId,
      playerName: player.name,
      players: this.getPlayerList(),
    });

    return this.players.size === 0;
  }

  getPlayerList() {
    return Array.from(this.players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      isHost: player.isHost,
    }));
  }

  broadcast(message, excludePlayerId = null) {
    const data = JSON.stringify(message);
    for (const [playerId, player] of this.players) {
      if (playerId !== excludePlayerId && player.ws.readyState === 1) {
        player.ws.send(data);
      }
    }
  }

  sendTo(playerId, message) {
    const player = this.players.get(playerId);
    if (player && player.ws.readyState === 1) {
      player.ws.send(JSON.stringify(message));
    }
  }

  updateGameState(playerId, state) {
    const sanitized = sanitizeGameState(state);
    if (!sanitized) return;
    this.gameState = { ...this.gameState, ...sanitized, lastUpdatedBy: playerId };

    this.broadcast(
      {
        type: 'game_state',
        state: this.gameState,
        fromPlayerId: playerId,
      },
      playerId,
    );
  }

  sendGameInput(fromPlayerId, input) {
    const sanitized = sanitizeGameInput(input);
    if (!sanitized) return;
    this.broadcast(
      {
        type: 'player_input',
        fromPlayerId,
        fromPlayerName: this.players.get(fromPlayerId)?.name,
        input: sanitized,
      },
      fromPlayerId,
    );
  }
}

// Initialize WebSocket server (requires session store for auth)
export function initMultiplayer(server, sessions) {
  const wss = new WebSocketServer({ server, path: '/ws/multiplayer' });

  wss.on('connection', async (ws, req) => {
    let playerId;
    let playerDisplayName;
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(4001, 'Authentication required');
        return;
      }
      const session = await sessions.get(token);
      if (!session) {
        ws.close(4001, 'Invalid or expired session');
        return;
      }
      playerId = session.userId;
      playerDisplayName = session.displayName;

      const user = await readUser(playerId);
      const check = ageGate(user, 'multiplayer');
      if (!check.allowed) {
        ws.close(4003, check.reason || 'Multiplayer not allowed');
        return;
      }
    } catch (err) {
      log.error({ err }, 'WebSocket auth error');
      ws.close(4001, 'Authentication failed');
      return;
    }

    let currentRoom = null;

    const revalidateInterval = setInterval(async () => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const t = url.searchParams.get('token');
        if (!t) {
          ws.close(4001, 'Session expired');
          return;
        }
        const s = await sessions.get(t);
        if (!s) {
          log.warn({ playerId, event: 'ws_session_expired' }, 'WS session expired — disconnecting');
          ws.close(4001, 'Session expired');
        }
      } catch {
        ws.close(4001, 'Session validation failed');
      }
    }, SESSION_RECHECK_MS);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(
          ws,
          playerId,
          message,
          (room) => {
            currentRoom = room;
          },
          playerDisplayName,
        );
      } catch (err) {
        log.error({ err }, 'WebSocket message error');
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      clearInterval(revalidateInterval);
      if (currentRoom) {
        const isEmpty = currentRoom.removePlayer(playerId);
        if (isEmpty) {
          rooms.delete(currentRoom.code);
          log.info({ roomCode: currentRoom.code }, 'Room closed (empty)');
        }
      }
    });

    ws.on('error', (err) => {
      log.error({ err }, 'WebSocket error');
    });

    ws.send(
      JSON.stringify({
        type: 'welcome',
        playerId,
      }),
    );
  });

  log.info('Multiplayer WebSocket server initialized');

  return wss;
}

// Handle incoming messages
function handleMessage(ws, playerId, message, setRoom, _authenticatedName) {
  switch (message.type) {
    case 'create_room': {
      const { projectId, playerName } = message;

      const room = new GameRoom(projectId, playerId, playerName);
      room.addPlayer(playerId, ws, playerName, true);
      rooms.set(room.code, room);
      setRoom(room);

      log.info({ roomCode: room.code, projectId }, 'Room created');

      ws.send(
        JSON.stringify({
          type: 'room_created',
          roomCode: room.code,
          playerId,
          players: room.getPlayerList(),
        }),
      );
      break;
    }

    case 'join_room': {
      const { playerName } = message;
      const rawCode = (message.roomCode || '').toString().trim();
      const roomCode = rawCode
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 4);

      if (!roomCode || roomCode.length !== 4) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Please enter a valid 4-character room code.',
          }),
        );
        return;
      }

      const room = rooms.get(roomCode);
      if (!room) {
        const activeCodes = Array.from(rooms.keys());
        log.info({ roomCode, activeCodes }, 'Join failed — room not found');
        ws.send(
          JSON.stringify({
            type: 'error',
            message: 'Room not found! Check the code and try again.',
          }),
        );
        return;
      }

      const result = room.addPlayer(playerId, ws, playerName);
      if (!result.success) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message: result.error,
          }),
        );
        return;
      }

      setRoom(room);
      log.info({ playerName, roomCode }, 'Player joined room');

      ws.send(
        JSON.stringify({
          type: 'room_joined',
          roomCode: room.code,
          projectId: room.projectId,
          playerId,
          players: room.getPlayerList(),
          gameState: room.gameState,
        }),
      );
      break;
    }

    case 'leave_room': {
      const room = getRoomByPlayerId(playerId);
      if (room) {
        const isEmpty = room.removePlayer(playerId);
        if (isEmpty) {
          rooms.delete(room.code);
          log.info({ roomCode: room.code }, 'Room closed (empty)');
        }
        setRoom(null);
      }

      ws.send(JSON.stringify({ type: 'room_left' }));
      break;
    }

    case 'game_state': {
      const room = getRoomByPlayerId(playerId);
      if (room) {
        room.updateGameState(playerId, message.state);
      }
      break;
    }

    case 'player_input': {
      const room = getRoomByPlayerId(playerId);
      if (room) {
        room.sendGameInput(playerId, message.input);
      }
      break;
    }

    case 'chat': {
      const room = getRoomByPlayerId(playerId);
      if (room) {
        const chatText = (message.text || '').slice(0, 200);
        const chatCheck = filterContent(chatText, { source: 'multiplayer-chat' });
        if (chatCheck.blocked) {
          ws.send(JSON.stringify({ type: 'chat_blocked', message: "Let's keep chat friendly!" }));
          break;
        }
        moderateText(chatText)
          .then((mlResult) => {
            if (mlResult.flagged) {
              ws.send(JSON.stringify({ type: 'chat_blocked', message: "Let's keep chat friendly!" }));
              return;
            }
            const player = room.players.get(playerId);
            room.broadcast({
              type: 'chat',
              fromPlayerId: playerId,
              fromPlayerName: player?.name || 'Player',
              message: chatText,
            });
          })
          .catch(() => {
            const player = room.players.get(playerId);
            room.broadcast({
              type: 'chat',
              fromPlayerId: playerId,
              fromPlayerName: player?.name || 'Player',
              message: chatText,
            });
          });
      }
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }

    default:
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Unknown message type',
        }),
      );
  }
}

// Find room by player ID
function getRoomByPlayerId(playerId) {
  for (const room of rooms.values()) {
    if (room.players.has(playerId)) {
      return room;
    }
  }
  return null;
}

// REST API endpoints for room info
export function getRoomInfo(roomCode) {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return null;

  return {
    code: room.code,
    projectId: room.projectId,
    hostName: room.hostName,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
  };
}

const ALLOWED_CHAT_PHRASES = [
  'Good game!',
  'Nice move!',
  'Wow!',
  "Let's go!",
  'Great job!',
  'Ready?',
  'Yes!',
  'No thanks',
  'Help!',
  'Over here!',
  'Watch out!',
  'GG',
  'Rematch?',
  'Thanks!',
  "You're awesome!",
  'My turn!',
  'Your turn!',
  'Oops!',
  'Haha!',
  'So close!',
  'Try again!',
  'High five!',
  'Team up?',
  'I got it!',
  'Wait for me!',
];

export function getAllowedChatPhrases() {
  return [...ALLOWED_CHAT_PHRASES];
}

export function getActiveRooms(projectId = null) {
  const result = [];
  for (const room of rooms.values()) {
    if (!projectId || room.projectId === projectId) {
      result.push({
        code: room.code,
        projectId: room.projectId,
        hostName: room.hostName,
        playerCount: room.players.size,
        maxPlayers: room.maxPlayers,
      });
    }
  }
  return result;
}
