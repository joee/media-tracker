// Yjs CRDT Document Setup
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import type { Child, Session, LogEntry } from '../types';

// Create the Yjs document
export const ydoc = new Y.Doc();

// Define CRDT data structures
export const yChildren = ydoc.getMap<Child>('children');
export const ySessions = ydoc.getMap<Session>('sessions');
export const yLogs = ydoc.getArray<LogEntry>('logs');

// Initialize IndexedDB persistence
export const indexeddbProvider = new IndexeddbPersistence('media-tracker', ydoc);

// WebSocket sync provider (optional, initialized later)
export let websocketProvider: WebsocketProvider | null = null;

// Utility: Generate UUID v4
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Generate a random room ID
const generateRoomId = (): string => {
  const id = generateId().substring(0, 8);
  localStorage.setItem('sync-room', id);
  return id;
};

// Default sync URL - can be overridden via environment variable at build time
// For Cloudflare Workers, this will be wss://your-worker.workers.dev/sync
const DEFAULT_SYNC_URL = import.meta.env.VITE_SYNC_URL || 'ws://localhost:1234';

// Get sync configuration from localStorage
export const getSyncConfig = () => {
  const syncEnabled = localStorage.getItem('sync-enabled') === 'true';
  const syncUrl = localStorage.getItem('sync-url') || DEFAULT_SYNC_URL;
  const roomId = localStorage.getItem('sync-room') || generateRoomId();
  return { syncEnabled, syncUrl, roomId };
};

// Initialize WebSocket sync
export const initializeSync = () => {
  const { syncEnabled, syncUrl, roomId } = getSyncConfig();

  if (!syncEnabled || websocketProvider) {
    return websocketProvider;
  }

  try {
    websocketProvider = new WebsocketProvider(syncUrl, roomId, ydoc, {
      connect: true,
      awareness: undefined, // We don't need awareness for this app
    });

    websocketProvider.on('status', ({ status }: { status: string }) => {
      console.log('🔄 Sync status:', status);
      // Dispatch custom event for UI to listen to
      window.dispatchEvent(new CustomEvent('sync-status', { detail: { status } }));
    });

    websocketProvider.on('sync', (synced: boolean) => {
      console.log(synced ? '✅ Synced with server' : '⏳ Syncing...');
      window.dispatchEvent(new CustomEvent('sync-change', { detail: { synced } }));
    });

    console.log(`✅ Sync enabled for room: ${roomId}`);
    return websocketProvider;
  } catch (error) {
    console.error('Failed to initialize sync:', error);
    return null;
  }
};

// Disconnect WebSocket sync
export const disconnectSync = () => {
  if (websocketProvider) {
    websocketProvider.disconnect();
    websocketProvider.destroy();
    websocketProvider = null;
    console.log('🔌 Sync disconnected');
  }
};

// Enable sync with optional custom URL
export const enableSync = (syncUrl?: string, roomId?: string) => {
  localStorage.setItem('sync-enabled', 'true');
  if (syncUrl) localStorage.setItem('sync-url', syncUrl);
  if (roomId) localStorage.setItem('sync-room', roomId);
  return initializeSync();
};

// Disable sync
export const disableSync = () => {
  localStorage.setItem('sync-enabled', 'false');
  disconnectSync();
};

// Wait for initial sync from IndexedDB
export const waitForSync = (): Promise<void> => {
  return new Promise((resolve) => {
    if (indexeddbProvider.synced) {
      resolve();
    } else {
      indexeddbProvider.once('synced', () => resolve());
    }
  });
};

// Initialize with hardcoded children if empty
export const initializeHardcodedChildren = () => {
  if (yChildren.size === 0) {
    const now = Date.now();

    const children: Child[] = [
      {
        id: 'emma',
        name: 'Emma',
        availableSeconds: 7200, // 2 hours
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'noah',
        name: 'Noah',
        availableSeconds: 5400, // 1.5 hours
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'liam',
        name: 'Liam',
        availableSeconds: 3600, // 1 hour
        createdAt: now,
        updatedAt: now,
      },
    ];

    children.forEach((child) => {
      yChildren.set(child.id, child);
    });

    console.log('✅ Initialized hardcoded children');
  }
};

// Utility: Format seconds to HH:MM:SS
export const formatTime = (seconds: number): string => {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const formatted = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':');

  return isNegative ? `-${formatted}` : formatted;
};
