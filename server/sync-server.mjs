#!/usr/bin/env node
/**
 * Y-WebSocket Sync Server for Kids Media Tracker
 *
 * A lightweight WebSocket server that acts as a relay for Yjs CRDT updates.
 * No database, no application logic - just message broadcasting.
 *
 * Usage:
 *   node server/sync-server.mjs [port]
 *   Default port: 1234
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as map from 'lib0/map';

const port = process.env.PORT || process.argv[2] || 1234;
const host = process.env.HOST || '0.0.0.0';

// Store Y.Docs per room
const docs = new Map();

const getYDoc = (roomId) => map.setIfUndefined(docs, roomId, () => new Y.Doc());

const messageSync = 0;
const messageAwareness = 1;

console.log(`\n🚀 Kids Media Tracker Sync Server`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Starting WebSocket server on ${host}:${port}`);

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Kids Media Tracker Sync Server\nWebSocket endpoint: ws://' + request.headers.host);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room') || 'default-room';

  console.log(`✓ Client connected to room: ${roomId}`);

  const doc = getYDoc(roomId);
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(new Uint8Array(0));

  // Track connections per room
  doc.conns = doc.conns || new Set();
  doc.conns.add(conn);

  // Send sync step 1
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  // Track awareness
  const awareness = new awarenessProtocol.Awareness(doc);
  awareness.setLocalState({});

  conn.on('message', (message) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === messageSync) {
        // Sync message - broadcast to all other clients in the room
        encoding.writeVarUint(encoder, messageSync);
        const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, doc, null);

        if (encoding.length(encoder) > 1) {
          const update = encoding.toUint8Array(encoder);
          doc.conns.forEach((client) => {
            if (client !== conn && client.readyState === 1) {
              client.send(update);
            }
          });
        }
      } else if (messageType === messageAwareness) {
        // Awareness message - broadcast to all clients
        awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), conn);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  conn.on('close', () => {
    doc.conns.delete(conn);
    console.log(`✗ Client disconnected from room: ${roomId} (${doc.conns.size} remaining)`);

    // Clean up empty rooms after 5 minutes
    if (doc.conns.size === 0) {
      setTimeout(() => {
        if (doc.conns.size === 0) {
          docs.delete(roomId);
          console.log(`🗑️  Cleaned up empty room: ${roomId}`);
        }
      }, 5 * 60 * 1000);
    }
  });

  conn.on('error', (err) => {
    console.error(`WebSocket error in room ${roomId}:`, err.message);
  });
});

server.listen(port, host, () => {
  console.log(`✓ Server listening on ${host}:${port}`);
  console.log(`✓ WebSocket endpoint: ws://${host}:${port}/?room=<room-id>`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Ready to relay Yjs CRDT updates!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📉 Shutting down server...');
  wss.close(() => {
    server.close(() => {
      console.log('✓ Server closed');
      process.exit(0);
    });
  });
});
