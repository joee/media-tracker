// Zustand Store with Yjs CRDT Integration
import { create } from 'zustand';
import {
  yChildren,
  ySessions,
  yLogs,
  generateId,
  initializeHardcodedChildren,
  waitForSync,
} from '../lib/yjs';
import type { Child, Session, LogEntry, AppState } from '../types';

interface StoreState extends AppState {
  isLoading: boolean;
  activeIntervals: Map<string, number>;

  // Actions
  initialize: () => Promise<void>;
  addTime: (childId: string, seconds: number, reason: string) => void;
  startSession: (childId: string) => void;
  stopSession: (childId: string) => void;
  getActiveSessionForChild: (childId: string) => Session | null;
}

export const useStore = create<StoreState>()((set, get) => {
  // Helper: Sync CRDT to Zustand state
  const syncFromCRDT = () => {
    const children: Record<string, Child> = {};
    yChildren.forEach((child, id) => {
      children[id] = child;
    });

    const sessions: Record<string, Session> = {};
    ySessions.forEach((session, id) => {
      sessions[id] = session;
    });

    const logs = yLogs.toArray();

    set({ children, sessions, logs });
  };

  // Set up observers to auto-sync CRDT changes to Zustand
  yChildren.observe(() => syncFromCRDT());
  ySessions.observe(() => syncFromCRDT());
  yLogs.observe(() => syncFromCRDT());

  return {
    // Initial state
    children: {},
    sessions: {},
    logs: [],
    isLoading: true,
    activeIntervals: new Map(),

    // Initialize: Load from IndexedDB and set up hardcoded children
    initialize: async () => {
      await waitForSync();
      initializeHardcodedChildren();
      syncFromCRDT();
      set({ isLoading: false });
    },

    // Add time to a child's bank
    addTime: (childId: string, seconds: number, reason: string) => {
      const child = yChildren.get(childId);
      if (!child) return;

      const previousBalance = child.availableSeconds;
      const newBalance = previousBalance + seconds;

      // Update child
      yChildren.set(childId, {
        ...child,
        availableSeconds: newBalance,
        updatedAt: Date.now(),
      });

      // Create log entry
      const logEntry: LogEntry = {
        id: generateId(),
        childId,
        timestamp: Date.now(),
        type: 'manual_addition',
        deltaSeconds: seconds,
        previousBalance,
        newBalance,
        metadata: { reason },
      };

      yLogs.push([logEntry]);
    },

    // Start a media session
    startSession: (childId: string) => {
      // Check if child already has active session
      const existing = get().getActiveSessionForChild(childId);
      if (existing) {
        console.warn(`Child ${childId} already has an active session`);
        return;
      }

      const sessionId = generateId();
      const now = Date.now();

      const session: Session = {
        id: sessionId,
        childId,
        startTime: now,
        endTime: null,
        secondsUsed: 0,
        isActive: true,
      };

      ySessions.set(sessionId, session);

      // Create session start log
      const child = yChildren.get(childId);
      if (child) {
        const logEntry: LogEntry = {
          id: generateId(),
          childId,
          timestamp: now,
          type: 'session_start',
          deltaSeconds: 0,
          previousBalance: child.availableSeconds,
          newBalance: child.availableSeconds,
          metadata: { sessionId },
        };
        yLogs.push([logEntry]);
      }

      // Start interval timer to decrement time
      const interval = setInterval(() => {
        const currentChild = yChildren.get(childId);
        const currentSession = ySessions.get(sessionId);

        if (!currentChild || !currentSession || !currentSession.isActive) {
          clearInterval(interval);
          get().activeIntervals.delete(sessionId);
          return;
        }

        // Decrement time (allow negative)
        yChildren.set(childId, {
          ...currentChild,
          availableSeconds: currentChild.availableSeconds - 1,
          updatedAt: Date.now(),
        });

        // Update session seconds used
        ySessions.set(sessionId, {
          ...currentSession,
          secondsUsed: currentSession.secondsUsed + 1,
        });
      }, 1000);

      get().activeIntervals.set(sessionId, interval);
    },

    // Stop an active session
    stopSession: (childId: string) => {
      const session = get().getActiveSessionForChild(childId);
      if (!session) {
        console.warn(`No active session found for child ${childId}`);
        return;
      }

      const now = Date.now();

      // Stop interval
      const interval = get().activeIntervals.get(session.id);
      if (interval) {
        clearInterval(interval);
        get().activeIntervals.delete(session.id);
      }

      // Update session
      ySessions.set(session.id, {
        ...session,
        endTime: now,
        isActive: false,
      });

      // Create session end log
      const child = yChildren.get(childId);
      if (child) {
        const logEntry: LogEntry = {
          id: generateId(),
          childId,
          timestamp: now,
          type: 'session_end',
          deltaSeconds: -session.secondsUsed,
          previousBalance: child.availableSeconds + session.secondsUsed,
          newBalance: child.availableSeconds,
          metadata: {
            sessionId: session.id,
            duration: session.secondsUsed,
          },
        };
        yLogs.push([logEntry]);
      }
    },

    // Get active session for a child
    getActiveSessionForChild: (childId: string): Session | null => {
      const sessions = Object.values(get().sessions);
      return sessions.find((s) => s.childId === childId && s.isActive) || null;
    },
  };
});
