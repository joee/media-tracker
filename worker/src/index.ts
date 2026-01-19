/**
 * Cloudflare Worker with Durable Objects for Yjs WebSocket Sync
 *
 * This worker handles WebSocket connections for real-time CRDT sync
 * using Durable Objects to manage room state and connections.
 */

export interface Env {
  SYNC_ROOM: DurableObjectNamespace;
}

// Main worker entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'Media Tracker Sync Server',
          version: '1.0.0',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // WebSocket upgrade for sync
    if (url.pathname === '/sync' || url.pathname.startsWith('/sync/')) {
      // Get room ID from query param or path
      const roomId = url.searchParams.get('room') || url.pathname.split('/')[2] || 'default';

      // Get or create the Durable Object for this room
      const id = env.SYNC_ROOM.idFromName(roomId);
      const room = env.SYNC_ROOM.get(id);

      // Forward the request to the Durable Object
      return room.fetch(request);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

// Message types for Yjs protocol
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

/**
 * SyncRoom Durable Object
 *
 * Manages WebSocket connections for a single room and broadcasts
 * Yjs CRDT updates between all connected clients.
 */
export class SyncRoom {
  private state: DurableObjectState;
  private sessions: Map<WebSocket, { id: string }>;
  private lastActivity: number;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Map();
    this.lastActivity = Date.now();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection with hibernation support
    this.state.acceptWebSocket(server);

    // Track the session
    const sessionId = crypto.randomUUID();
    this.sessions.set(server, { id: sessionId });
    this.lastActivity = Date.now();

    console.log(`[SyncRoom] Client connected: ${sessionId} (${this.sessions.size} total)`);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // Handle incoming WebSocket messages
  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    this.lastActivity = Date.now();

    // Only handle binary messages (Yjs protocol uses binary)
    if (typeof message === 'string') {
      return;
    }

    const data = new Uint8Array(message);
    if (data.length === 0) return;

    const messageType = data[0];

    // Broadcast to all other connected clients
    // For both sync and awareness messages, we relay to all other clients
    if (messageType === MESSAGE_SYNC || messageType === MESSAGE_AWARENESS) {
      this.broadcast(ws, data);
    }
  }

  // Handle WebSocket close
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const session = this.sessions.get(ws);
    if (session) {
      console.log(`[SyncRoom] Client disconnected: ${session.id} (code: ${code})`);
      this.sessions.delete(ws);
    }
  }

  // Handle WebSocket error
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const session = this.sessions.get(ws);
    if (session) {
      console.error(`[SyncRoom] WebSocket error for ${session.id}:`, error);
      this.sessions.delete(ws);
    }
  }

  // Broadcast message to all clients except sender
  private broadcast(sender: WebSocket, data: Uint8Array): void {
    const sockets = this.state.getWebSockets();

    for (const socket of sockets) {
      if (socket !== sender) {
        try {
          socket.send(data);
        } catch (err) {
          // Socket might be closed, ignore
          console.error('[SyncRoom] Failed to send to socket:', err);
        }
      }
    }
  }
}
