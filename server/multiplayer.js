// Multiplayer Room Management System
// NOTE: Rooms are stored in-memory. On Railway (or any multi-instance deployment),
// ensure replicas=1 so all WebSocket connections hit the same server. Otherwise
// "Room not found" will occur when users connect to different instances.
import { WebSocketServer } from 'ws';
import { randomBytes } from 'crypto';

// Store active rooms
const rooms = new Map();

// Generate a kid-friendly room code (4 characters, easy to type)
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
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
    this.players = new Map(); // playerId -> { ws, name, isHost }
    this.gameState = {}; // Shared game state
    this.createdAt = Date.now();
    this.maxPlayers = 8;
  }

  addPlayer(playerId, ws, name, isHost = false) {
    if (this.players.size >= this.maxPlayers && !isHost) {
      return { success: false, error: 'Room is full!' };
    }

    this.players.set(playerId, { ws, name, isHost });
    
    // Notify all players about the new player
    this.broadcast({
      type: 'player_joined',
      playerId,
      playerName: name,
      players: this.getPlayerList()
    }, playerId);

    return { success: true };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    const wasHost = player.isHost;
    this.players.delete(playerId);

    // If host left, assign new host or close room
    if (wasHost && this.players.size > 0) {
      const newHost = this.players.entries().next().value;
      if (newHost) {
        newHost[1].isHost = true;
        this.hostId = newHost[0];
        this.hostName = newHost[1].name;
        
        this.broadcast({
          type: 'host_changed',
          newHostId: newHost[0],
          newHostName: newHost[1].name
        });
      }
    }

    // Notify remaining players
    this.broadcast({
      type: 'player_left',
      playerId,
      playerName: player.name,
      players: this.getPlayerList()
    });

    return this.players.size === 0;
  }

  getPlayerList() {
    return Array.from(this.players.entries()).map(([id, player]) => ({
      id,
      name: player.name,
      isHost: player.isHost
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
    // Merge the incoming state with current game state
    this.gameState = { ...this.gameState, ...state, lastUpdatedBy: playerId };
    
    // Broadcast the state update to all other players
    this.broadcast({
      type: 'game_state',
      state: this.gameState,
      fromPlayerId: playerId
    }, playerId);
  }

  sendGameInput(fromPlayerId, input) {
    // Broadcast player input to all other players
    this.broadcast({
      type: 'player_input',
      fromPlayerId,
      fromPlayerName: this.players.get(fromPlayerId)?.name,
      input
    }, fromPlayerId);
  }
}

// Initialize WebSocket server
export function initMultiplayer(server) {
  const wss = new WebSocketServer({ server, path: '/ws/multiplayer' });

  wss.on('connection', (ws) => {
    let playerId = randomBytes(8).toString('hex');
    let currentRoom = null;

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, playerId, message, (room) => { currentRoom = room; });
      } catch (err) {
        console.error('WebSocket message error:', err);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (currentRoom) {
        const isEmpty = currentRoom.removePlayer(playerId);
        if (isEmpty) {
          rooms.delete(currentRoom.code);
          console.log(`🎮 Room ${currentRoom.code} closed (empty)`);
        }
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    // Send welcome message with player ID
    ws.send(JSON.stringify({
      type: 'welcome',
      playerId
    }));
  });

  console.log('🎮 Multiplayer WebSocket server initialized');

  return wss;
}

// Handle incoming messages
function handleMessage(ws, playerId, message, setRoom) {
  switch (message.type) {
    case 'create_room': {
      const { projectId, playerName } = message;
      
      // Create new room
      const room = new GameRoom(projectId, playerId, playerName);
      room.addPlayer(playerId, ws, playerName, true);
      rooms.set(room.code, room);
      setRoom(room);

      console.log(`🎮 Room ${room.code} created for project ${projectId}`);

      ws.send(JSON.stringify({
        type: 'room_created',
        roomCode: room.code,
        playerId,
        players: room.getPlayerList()
      }));
      break;
    }

    case 'join_room': {
      const { playerName } = message;
      // Normalize room code: trim, uppercase, strip non-alphanumeric (handles copy-paste quirks)
      const rawCode = (message.roomCode || '').toString().trim();
      const roomCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
      
      if (!roomCode || roomCode.length !== 4) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Please enter a valid 4-character room code.'
        }));
        return;
      }
      
      const room = rooms.get(roomCode);
      if (!room) {
        const activeCodes = Array.from(rooms.keys()).join(', ') || '(none)';
        console.log(`🎮 Join failed: room "${roomCode}" not found. Active rooms on this instance: ${activeCodes}`);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Room not found! Check the code and try again.'
        }));
        return;
      }

      const result = room.addPlayer(playerId, ws, playerName);
      if (!result.success) {
        ws.send(JSON.stringify({
          type: 'error',
          message: result.error
        }));
        return;
      }

      setRoom(room);
      console.log(`🎮 Player ${playerName} joined room ${roomCode}`);

      ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: room.code,
        projectId: room.projectId,
        playerId,
        players: room.getPlayerList(),
        gameState: room.gameState
      }));
      break;
    }

    case 'leave_room': {
      const room = getRoomByPlayerId(playerId);
      if (room) {
        const isEmpty = room.removePlayer(playerId);
        if (isEmpty) {
          rooms.delete(room.code);
          console.log(`🎮 Room ${room.code} closed (empty)`);
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
        const player = room.players.get(playerId);
        room.broadcast({
          type: 'chat',
          fromPlayerId: playerId,
          fromPlayerName: player?.name || 'Anonymous',
          message: message.text?.slice(0, 200) // Limit chat length
        });
      }
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
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
    createdAt: room.createdAt
  };
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
        maxPlayers: room.maxPlayers
      });
    }
  }
  return result;
}
