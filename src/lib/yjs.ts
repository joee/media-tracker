// Yjs CRDT Document Setup
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Child, Session, LogEntry } from '../types';

// Create the Yjs document
export const ydoc = new Y.Doc();

// Define CRDT data structures
export const yChildren = ydoc.getMap<Child>('children');
export const ySessions = ydoc.getMap<Session>('sessions');
export const yLogs = ydoc.getArray<LogEntry>('logs');

// Initialize IndexedDB persistence
export const indexeddbProvider = new IndexeddbPersistence('media-tracker', ydoc);

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

// Utility: Generate UUID v4
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
